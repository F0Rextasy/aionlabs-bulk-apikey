'use strict';
/**
 * solver.js — the browser/captcha engine of aionlabs-bulk-apikey, moved out of
 * cli.js verbatim: the exit transport (TLS + SOCKS5/HTTP-CONNECT), the temp.tf
 * mailbox rail, the raw CDP client and the page helpers that let the panel's own
 * Cloudflare Turnstile widget mint its token in a real Chrome.
 *
 * Locked contract used by every repo in this family:
 *
 *   const { solveCaptcha } = require('./solver.js');
 *   const { token, ms } = await solveCaptcha({ type, sitekey, url, proxy });
 *   // type   : 'turnstile' (this panel has no other gate)
 *   // sitekey: the panel's widget key — checked when given
 *   // url    : the page carrying the widget (default: the signup page)
 *   // proxy  : 'http://user:pass@host:port' | 'socks5://host:port' | null (DIRECT)
 *   // → { token: string, ms: number }   token is returned UNTRIMMED
 *   // no Chrome / no token → a real Error, never a silent null
 *
 * The engine reads its own browser flags from argv so it also works standalone:
 * `--browser <exe>` (or CHROME_PATH), `--debug-port N`, `--headless`,
 * `--timeout MS`, `--mail-window S`.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const tls = require('tls');
const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.basename(__dirname) === 'src' ? path.resolve(__dirname, '..') : __dirname;
const OUT_DIR = path.join(ROOT, 'out');

const SITE = 'https://www.aionlabs.ai';
const TEMPTF = 'https://temp.tf';
const TURNSTILE_FIELD = 'cf-turnstile-response';
const SITEKEY = '0x4AAAAAAAz_ySGy6QN0NLcx';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

// ------------------------------------------------------------------- options
const argv = process.argv.slice(2);
function arg(name, dflt) {
  const eq = argv.find((a) => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return dflt;
}

const TIMEOUT_MS = Number(arg('timeout', 60000)) || 60000;
const MAIL_WINDOW_MS = (Number(arg('mail-window', 300)) || 300) * 1000;
const BROWSER_BIN = arg('browser', process.env.CHROME_PATH || '');
const DEBUG_PORT = Number(arg('debug-port', 0)) || 0;
const HEADLESS = argv.includes('--headless');

// --------------------------------------------------------------------- utils
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
function log(...a) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${a.map(String).join(' ')}`;
  console.log(line);
  try {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.appendFileSync(path.join(OUT_DIR, `aionlabs-cli-${nowIso().slice(0, 10)}.log`), line + '\n');
  } catch (e) { /* logging is best effort */ }
}
function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms).unref()),
  ]);
}

// --------------------------------------------------------------------- proxy
function parseProxy(line) {
  const s = String(line || '').trim();
  if (!s || s.startsWith('#') || s.startsWith('//')) return null;
  let m = s.match(/^(https?|socks5h?|socks4a?):\/\/(?:([^:@/]+):([^@/]+)@)?([^:/]+):(\d+)/i);
  if (!m) m = s.match(/^(?:([^:@/]+):([^@/]+)@)?([^:/]+):(\d+)$/);
  if (!m) return null;
  if (m.length === 6) {
    const raw = m[1].toLowerCase();
    if (raw === 'socks4' || raw === 'socks4a') return null; // not spoken here
    return {
      protocol: raw.startsWith('socks') ? 'socks5' : 'http',
      host: m[4], port: Number(m[5]),
      username: m[2] || undefined, password: m[3] || undefined, line: s,
    };
  }
  return { protocol: 'http', host: m[3], port: Number(m[4]), username: m[1] || undefined, password: m[2] || undefined, line: s };
}
const labelOf = (p) => (p ? `${p.protocol}://${p.host}:${p.port}` : '(direct)');

function directConnect(host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host, port });
    const t = setTimeout(() => { sock.destroy(); reject(new Error(`connect timeout (${host}:${port})`)); }, timeoutMs);
    sock.once('error', (e) => { clearTimeout(t); try { sock.destroy(); } catch {} reject(new Error(`connect failed: ${e.message}`)); });
    sock.once('connect', () => { clearTimeout(t); resolve(sock); });
  });
}

/** SOCKS5 (no auth / user+pass) and HTTP CONNECT. */
function connectThrough(proxy, host, port, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ host: proxy.host, port: proxy.port });
    const t = setTimeout(() => { sock.destroy(); reject(new Error(`proxy timeout (${proxy.host}:${proxy.port})`)); }, timeoutMs);
    const done = (err, s) => { clearTimeout(t); if (err) { try { sock.destroy(); } catch {} reject(err); } else resolve(s); };
    sock.once('error', (e) => done(new Error(`proxy connect failed: ${e.message}`)));
    sock.once('connect', () => {
      if (proxy.protocol === 'socks5') {
        sock.write(proxy.username ? Buffer.from([5, 2, 0, 2]) : Buffer.from([5, 1, 0]));
        let stage = 0;
        let buf = Buffer.alloc(0);
        const sendConnect = () => {
          const hb = Buffer.from(host);
          sock.write(Buffer.concat([Buffer.from([5, 1, 0, 3, hb.length]), hb, Buffer.from([port >> 8, port & 0xff])]));
        };
        const onData = (d) => {
          try {
            buf = Buffer.concat([buf, d]);
            for (;;) {
              if (stage === 0) {
                if (buf.length < 2) return;
                const v = buf; buf = buf.slice(2);
                if (v[0] !== 5) return done(new Error('SOCKS5 bad version'));
                if (v[1] === 2) {
                  if (!proxy.username) return done(new Error('SOCKS5 auth required'));
                  const u = Buffer.from(proxy.username || '');
                  const p = Buffer.from(proxy.password || '');
                  sock.write(Buffer.concat([Buffer.from([1, u.length]), u, Buffer.from([p.length]), p]));
                  stage = 1;
                  continue;
                }
                if (v[1] !== 0) return done(new Error('SOCKS5 no acceptable method'));
                stage = 2; sendConnect(); continue;
              }
              if (stage === 1) {
                if (buf.length < 2) return;
                const v = buf; buf = buf.slice(2);
                if (v[1] !== 0) return done(new Error('SOCKS5 auth failed'));
                stage = 2; sendConnect(); continue;
              }
              if (stage === 2) {
                if (buf.length < 5) return;
                const atyp = buf[3];
                const need = 4 + (atyp === 1 ? 4 : atyp === 3 ? 1 + buf[4] : 16) + 2;
                if (buf.length < need) return;
                const rep = buf[1]; buf = buf.slice(need);
                if (rep !== 0) return done(new Error(`SOCKS5 connect failed (code ${rep})`));
                sock.off('data', onData);
                return done(null, sock);
              }
            }
          } catch (e) { done(e); }
        };
        sock.on('data', onData);
        return;
      }
      const auth = proxy.username ? `Proxy-Authorization: Basic ${Buffer.from(`${proxy.username}:${proxy.password || ''}`).toString('base64')}\r\n` : '';
      sock.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n${auth}\r\n`);
      let buf = '';
      const onData = (d) => {
        buf += d;
        if (!buf.includes('\r\n\r\n')) return;
        sock.off('data', onData);
        if (!/^HTTP\/\d(\.\d)? 200/.test(buf)) return done(new Error(`proxy CONNECT refused: ${buf.split('\r\n')[0]}`));
        done(null, sock);
      };
      sock.on('data', onData);
    });
  });
}

/** One HTTPS request through one exit (or direct), optionally carrying a cookie jar. */
async function exitFetch(exit, url, { method = 'GET', headers = {}, body = null, timeoutMs = TIMEOUT_MS, redirects = 0, jar = null, host } = {}) {
  let current = url;
  for (let hop = 0; ; hop++) {
    const u = new URL(current);
    const raw = exit
      ? await connectThrough(exit, u.hostname, u.port || 443, Math.min(timeoutMs, 20000))
      : await directConnect(u.hostname, u.port || 443, Math.min(timeoutMs, 20000));
    const sock = tls.connect({ socket: raw, servername: u.hostname });
    try {
      await withTimeout(new Promise((res, rej) => { sock.once('secureConnect', res); sock.once('error', rej); }), timeoutMs, `TLS handshake timeout (${u.hostname})`);
      const payload = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      const cookie = jar ? jar.header(u.hostname) : '';
      const r = await withTimeout(
        new Promise((resolve, reject) => {
          const req = http.request(
            {
              method,
              path: u.pathname + u.search,
              createConnection: () => sock,
              headers: {
                host: u.host,
                'user-agent': UA,
                accept: '*/*',
                connection: 'close',
                ...(cookie ? { cookie } : {}),
                ...(payload ? { 'content-type': headers['content-type'] || 'application/json', 'content-length': payload.length } : {}),
                ...headers,
              },
            },
            (res) => {
              const chunks = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
            }
          );
          req.on('error', reject);
          if (payload) req.write(payload);
          req.end();
        }),
        timeoutMs,
        'request timeout'
      );
      try { sock.destroy(); } catch {}
      if (jar) jar.absorb(u.hostname, r.headers['set-cookie']);
      const loc = r.headers.location;
      if ([301, 302, 303, 307, 308].includes(r.status) && loc && hop < redirects) {
        const next = new URL(loc, current).toString();
        if (!next.startsWith('https://')) return { ...r, url: current };
        current = next;
        continue;
      }
      return { ...r, url: current, location: loc ? new URL(loc, current).toString() : null };
    } catch (e) {
      try { sock.destroy(); } catch {}
      throw e;
    }
  }
}

async function exitJson(exit, url, opts = {}) {
  const r = await exitFetch(exit, url, opts);
  let json = null;
  try { json = JSON.parse(r.body); } catch { /* not json */ }
  return { status: r.status, json, text: r.body, headers: r.headers, url: r.url, location: r.location };
}

/** Minimal cookie jar for the panel session (login → api-keys → create). */
class Jar {
  constructor() { this.cookies = new Map(); }
  absorb(host, setCookie) {
    const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    for (const raw of list) {
      const [pair] = String(raw).split(';');
      const i = pair.indexOf('=');
      if (i <= 0) continue;
      if (!this.cookies.has(host)) this.cookies.set(host, new Map());
      this.cookies.get(host).set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  get(host, name) { return (this.cookies.get(host) || new Map()).get(name) || ''; }
  header(host) {
    const m = this.cookies.get(host);
    if (!m || !m.size) return '';
    return [...m.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

// ---------------------------------------------------------------------- mail
/** temp.tf — plus aliases on real Microsoft mailboxes with a JSON reader. */
class TempTf {
  constructor(exit, { timeoutMs = 30000 } = {}) {
    this.exit = exit;
    this.timeoutMs = timeoutMs;
    this.address = null;
  }
  async call(method, route, body) {
    for (let attempt = 0; ; attempt++) {
      const r = await exitFetch(this.exit, `${TEMPTF}${route}`, {
        method,
        timeoutMs: this.timeoutMs,
        headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body || null,
      });
      let json = null;
      try { json = JSON.parse(r.body); } catch { /* throttle pages are not json */ }
      if (json === null) {
        if (attempt < 3) { await sleep(8000 * (attempt + 1)); continue; }
        throw new Error(`temp.tf ${route}: unreadable body ${String(r.body).slice(0, 120)}`);
      }
      if (json.error) {
        const detail = String(json.error);
        if (/too many|rate|limit/i.test(detail) && attempt < 3) {
          const wait = 10000 * (attempt + 1);
          log(`  temp.tf throttled (${detail}) — retrying in ${Math.round(wait / 1000)}s`);
          await sleep(wait);
          continue;
        }
        throw new Error(`temp.tf ${route}: ${detail}`);
      }
      return json;
    }
  }
  async create() {
    const q = new URLSearchParams({ providers: 'hotmail,outlook', dot: '0', plus: '1' }).toString();
    const j = await this.call('GET', `/api/account?${q}`);
    const address = String((j && j.email) || '').trim();
    if (!/@(hotmail|outlook)\./i.test(address)) throw new Error(`temp.tf: no Microsoft address in ${JSON.stringify(j).slice(0, 120)}`);
    this.address = address;
    return address;
  }
  async messages() {
    if (!this.address) throw new Error('temp.tf: create() first');
    const j = await this.call('POST', '/api/check', { email: this.address, wait: false });
    const list = Array.isArray(j) ? j : (j && (j.data || j.messages)) || [];
    return Array.isArray(list) ? list : [];
  }
  /** Waits for the panel's confirmation mail and returns its confirm link. */
  async waitForConfirmLink({ timeoutMs = MAIL_WINDOW_MS, pollMs = 6000 } = {}) {
    const deadline = Date.now() + timeoutMs;
    let polls = 0;
    while (Date.now() < deadline) {
      polls++;
      let msgs = [];
      try { msgs = await this.messages(); } catch (e) { /* retry */ }
      for (const m of msgs) {
        const subject = String(m.subject || '');
        const from = String(m.from || '');
        if (!/aion/i.test(`${from} ${subject}`)) continue;
        if (/already exists/i.test(subject)) return { alreadyExists: true, subject, from, to: this.address };
        const html = String(m.body || m.html || m.text || '');
        const links = [...html.matchAll(/href=["']([^"']+)["']/g)].map((x) => x[1].replace(/&amp;/g, '&'))
          .filter((h) => /accounts\/confirm-email\//i.test(h))
          .map((h) => (h.startsWith('http') ? h : SITE + h));
        if (links.length) return { link: links[0], subject, from, id: String(m.id || ''), to: this.address };
      }
      if (polls % 5 === 0) log(`  mail: ${msgs.length} message(s) in the box, no confirm link yet (${Math.round((deadline - Date.now()) / 1000)}s left)`);
      await sleep(pollMs);
    }
    throw new Error(`no confirmation mail in ${Math.round(timeoutMs / 1000)}s`);
  }
}

// -------------------------------------------------------------- websocket CDP
/** Minimal RFC6455 client for Chrome's ws:// DevTools endpoint (Node has no global WebSocket on 18). */
class WsClient extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.sock = null;
    this.buf = Buffer.alloc(0);
    this.frag = [];
    this.id = 0;
    this.pending = new Map();
  }
  connect(timeoutMs = 15000) {
    const u = new URL(this.url);
    return new Promise((resolve, reject) => {
      const sock = net.connect({ host: u.hostname, port: Number(u.port || 80) });
      this.sock = sock;
      const t = setTimeout(() => { sock.destroy(); reject(new Error('websocket handshake timeout')); }, timeoutMs);
      sock.once('error', (e) => { clearTimeout(t); reject(new Error(`websocket error: ${e.message}`)); });
      sock.once('close', () => {
        for (const [, p] of this.pending) p.reject(new Error('websocket closed'));
        this.pending.clear();
        this.emit('closed');
      });
      sock.once('connect', () => {
        sock.write(
          `GET ${u.pathname} HTTP/1.1\r\n` +
            `Host: ${u.hostname}:${u.port}\r\n` +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\n` +
            'Sec-WebSocket-Version: 13\r\n\r\n'
        );
      });
      let handshake = '';
      const onData = (d) => {
        handshake += d.toString('latin1');
        const idx = handshake.indexOf('\r\n\r\n');
        if (idx === -1) return;
        sock.off('data', onData);
        const head = handshake.slice(0, idx);
        if (!/^HTTP\/1\.1 101/.test(head)) {
          clearTimeout(t);
          sock.destroy();
          reject(new Error(`websocket refused: ${head.split('\r\n')[0]}`));
          return;
        }
        clearTimeout(t);
        const rest = Buffer.from(handshake.slice(idx + 4), 'latin1');
        sock.on('data', (chunk) => this._feed(chunk));
        if (rest.length) this._feed(rest);
        resolve(this);
      };
      sock.on('data', onData);
    });
  }
  _feed(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    for (;;) {
      const b = this.buf;
      if (b.length < 2) return;
      const fin = (b[0] & 0x80) !== 0;
      const op = b[0] & 0x0f;
      const masked = (b[1] & 0x80) !== 0;
      let len = b[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
      let mask = null;
      if (masked) { if (b.length < off + 4) return; mask = b.slice(off, off + 4); off += 4; }
      if (b.length < off + len) return;
      const payload = Buffer.from(b.slice(off, off + len));
      if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      this.buf = b.slice(off + len);
      if (op === 0x0) {
        this.frag.push(payload);
        if (fin) { const full = Buffer.concat(this.frag).toString('utf8'); this.frag = []; this._message(full); }
        continue;
      }
      if (op === 0x1) {
        if (fin) this._message(payload.toString('utf8'));
        else this.frag = [payload];
        continue;
      }
      if (op === 0x9) { this._frame(payload, 0xa); continue; }
      if (op === 0x8) { try { this.sock.destroy(); } catch {} return; }
      // 0xa pong — nothing to do
    }
  }
  _frame(payload, opcode) {
    const data = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const len = data.length;
    let header;
    if (len < 126) header = Buffer.from([0x80 | opcode, 0x80 | len]);
    else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    const mask = crypto.randomBytes(4);
    const out = Buffer.allocUnsafe(len);
    for (let i = 0; i < len; i++) out[i] = data[i] ^ mask[i & 3];
    try { this.sock.write(Buffer.concat([header, mask, out])); } catch (e) { /* closed */ }
  }
  _message(text) {
    let msg;
    try { msg = JSON.parse(text); } catch { return; }
    if (msg.id !== undefined && this.pending.has(msg.id)) {
      const { resolve, reject } = this.pending.get(msg.id);
      this.pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message || 'cdp error'));
      else resolve(msg.result || {});
      return;
    }
    if (msg.method) this.emit('event', msg);
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this._frame(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }), 0x1);
    });
  }
  close() { try { this.sock.destroy(); } catch {} }
}

class CDP {
  constructor(ws) { this.ws = ws; }
  send(method, params, sessionId) { return this.ws.send(method, params, sessionId); }
  on(method, fn, sessionId) {
    const h = (msg) => {
      if (msg.method !== method) return;
      if (sessionId !== undefined && (msg.sessionId || undefined) !== sessionId) return;
      fn(msg.params);
    };
    this.ws.on('event', h);
    return () => this.ws.off('event', h);
  }
}

// -------------------------------------------------------------------- chrome
function findChrome() {
  if (BROWSER_BIN) return BROWSER_BIN;
  const cands =
    process.platform === 'win32'
      ? [
          'C:/Program Files/Google/Chrome/Application/chrome.exe',
          'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
          process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const c of cands) {
    if (!c) continue;
    if (c.includes('/') || c.includes('\\')) { if (fs.existsSync(c)) return c; continue; }
    const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', [c], { encoding: 'utf8', windowsHide: true });
    if (probe.status === 0 && String(probe.stdout).trim()) return String(probe.stdout).trim().split(/\r?\n/)[0];
  }
  throw new Error('Chrome not found — pass --browser <chrome.exe> or set CHROME_PATH');
}

function killChromeTree(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  try {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill('SIGTERM');
  } catch (e) { /* best effort */ }
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

/** Visible Chrome, throw-away profile, whole-browser proxy = the pinned exit. */
async function launchChrome(exit) {
  const bin = findChrome();
  const debugPort = DEBUG_PORT || (await freePort());
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'aionlabs-cli-'));
  const args = [
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints',
    '--renderer-process-limit=2',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profile}`,
    '--window-size=1100,860',
    '--remote-allow-origins=*',
  ];
  if (HEADLESS) args.push('--headless=new');
  if (exit) args.push(`--proxy-server=${exit.protocol}://${exit.host}:${exit.port}`);
  args.push('about:blank');

  const child = spawn(bin, args, { detached: false, stdio: 'ignore' });
  const cleanup = () => {
    killChromeTree(child);
    setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} }, 2000).unref();
  };
  child.once('error', cleanup);

  let port = 0;
  let wsPath = '';
  for (let i = 0; i < 160 && !port; i++) {
    const v = await fetch(`http://127.0.0.1:${debugPort}/json/version`).then((r) => r.json()).catch(() => null);
    if (v && v.webSocketDebuggerUrl) {
      const u = new URL(v.webSocketDebuggerUrl);
      port = Number(u.port);
      wsPath = u.pathname;
      break;
    }
    await sleep(300);
  }
  if (!port) {
    cleanup();
    throw new Error(`chrome never came up (debug port ${debugPort} busy? pass --debug-port N)`);
  }

  const ws = new WsClient(`ws://127.0.0.1:${port}${wsPath || '/devtools/browser'}`);
  try {
    await ws.connect();
  } catch (e) {
    cleanup();
    throw e;
  }
  const cdp = new CDP(ws);

  // Authenticated HTTP proxies are answered through the Fetch domain (Chrome
  // itself only takes credentials on the command line).
  const needAuth = !!(exit && exit.username && exit.protocol !== 'socks5');
  const wired = new Set();
  const wireAuth = async (sid) => {
    if (!needAuth || !sid || wired.has(sid)) return;
    wired.add(sid);
    cdp.on('Fetch.authRequired', (p) => {
      cdp.send('Fetch.continueWithAuth', {
        requestId: p.requestId,
        authChallengeResponse: {
          response: 'ProvideCredentials',
          username: exit.username,
          password: exit.password || '',
          proxyUsername: exit.username,
          proxyPassword: exit.password || '',
        },
      }, sid).catch(() => {});
    }, sid);
    cdp.on('Fetch.requestPaused', (p) => cdp.send('Fetch.continueRequest', { requestId: p.requestId }, sid).catch(() => {}), sid);
    await cdp.send('Fetch.enable', { handleAuthRequests: true, patterns: [{ urlPattern: '*' }] }, sid).catch(() => {});
  };

  cdp.on('Target.attachedToTarget', (p) => wireAuth(p && p.sessionId));
  await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  for (const d of ['Page', 'Runtime', 'Network']) await cdp.send(`${d}.enable`, {}, sessionId);
  await wireAuth(sessionId);

  return {
    cdp,
    targetId,
    sessionId,
    close: async () => {
      try { await cdp.send('Target.closeTarget', { targetId }); } catch (e) {}
      try { ws.close(); } catch (e) {}
      cleanup();
    },
  };
}

class Page {
  constructor(cdp, sessionId) {
    this.cdp = cdp;
    this.sessionId = sessionId;
  }
  async eval(expr, { awaitPromise = false, timeoutMs = 70000 } = {}) {
    const r = await withTimeout(
      this.cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise }, this.sessionId),
      timeoutMs,
      'eval timeout'
    );
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
    return r.result && r.result.value;
  }
  async goto(url, waitMs = 1200) {
    await this.cdp.send('Page.navigate', { url }, this.sessionId);
    await sleep(waitMs);
  }
  url() { return this.eval('location.href'); }
  html() { return this.eval('document.documentElement.outerHTML'); }
  async clickAt(x, y) {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await this.cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }, this.sessionId);
    }
  }
  async typeInto(selector, text) {
    const ok = await this.eval(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.focus();el.select&&el.select();return true})()`);
    if (!ok) throw new Error(`no element for ${selector}`);
    await this.cdp.send('Input.insertText', { text }, this.sessionId);
  }
  async shoot(name) {
    try {
      const r = await this.cdp.send('Page.captureScreenshot', { format: 'png' }, this.sessionId);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), Buffer.from(r.data, 'base64'));
    } catch (e) { /* diagnostics only */ }
  }
}

/**
 * The signup page carries its own Turnstile widget; Chrome solves it in place.
 * Only when it stalls (measured ~1 in 8 runs) is the container clicked, which is
 * the same nudge a human gives it. No external solver is involved.
 */
async function waitTurnstile(page, { timeoutMs = 90000, pokeAfterMs = 20000, pokeEveryMs = 15000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let nextPoke = Date.now() + pokeAfterMs;
  for (;;) {
    const v = await page.eval(`(()=>{const el=document.querySelector('[name="${TURNSTILE_FIELD}"]');return el&&el.value?el.value:''})()`).catch(() => '');
    if (v && String(v).length > 20) return String(v);
    if (Date.now() >= deadline) return null;
    if (Date.now() >= nextPoke) {
      nextPoke = Date.now() + pokeEveryMs;
      const rect = await page
        .eval(`(()=>{const d=document.querySelector('.cf-turnstile');const f=d&&d.querySelector('iframe');const el=f||d;if(!el)return null;const r=el.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})()`)
        .catch(() => null);
      if (rect && rect.w > 10) {
        log(`  turnstile still empty — clicking the widget at ${Math.round(rect.x + 30)},${Math.round(rect.y + rect.h / 2)}`);
        await page.clickAt(Math.round(rect.x + 30), Math.round(rect.y + rect.h / 2)).catch(() => {});
      }
    }
    await sleep(1500);
  }
}

/** Fill and submit the allauth signup form; returns the page it lands on. */
async function browserSignup(chrome, { address, password }) {
  const page = new Page(chrome.cdp, chrome.sessionId);

  const ensureForm = async () => {
    await page.goto(`${SITE}/accounts/signup/`, 2500);
    // A Cloudflare interstitial can serve first; the form shows up once it
    // clears, and one reload is enough when it does not.
    let hasForm = false;
    for (let i = 0; i < 20 && !hasForm; i++) {
      hasForm = await page.eval(`(()=>!!document.querySelector('#id_email'))()`).catch(() => false);
      if (hasForm) break;
      if (i === 6) await page.goto(`${SITE}/accounts/signup/`, 1500).catch(() => {});
      await sleep(1200);
    }
    if (!hasForm) throw new Error('signup form not found (#id_email missing)');
  };

  // A widget instance that never hands out a token is usually a spent challenge:
  // a fresh page (new widget) after a reload solves where poking does not.
  let token = null;
  for (let pass = 1; pass <= 2 && !token; pass++) {
    await ensureForm();
    await page.typeInto('#id_email', address);
    await page.typeInto('#id_password1', password);
    await page.typeInto('#id_password2', password);
    await page.eval(
      `(()=>{const c=document.querySelector('#id_accept_terms');if(c&&!c.checked)c.click();const d=document.querySelector('.cf-turnstile');if(d)d.scrollIntoView({block:'center'});return true})()`
    );
    token = await waitTurnstile(page, { timeoutMs: pass === 1 ? 45000 : 60000 });
    if (!token && pass === 1) log('  turnstile stalled — reloading the signup page for a fresh widget');
  }
  if (!token) throw new Error('turnstile never produced a token');
  const before = await page.url();
  await page.eval(`(()=>{const f=document.querySelector('form.auth-form')||document.querySelector('form[action*="signup"]');const b=f&&f.querySelector('button[type=submit]');if(b){b.click();return true}return false})()`);
  const deadline = Date.now() + 60000;
  let href = before;
  while (Date.now() < deadline) {
    href = await page.url().catch(() => href);
    if (href !== before && !/\/accounts\/signup\/?/.test(href)) break;
    await sleep(1200);
  }
  const html = await page.html().catch(() => '');
  const notices = [...html.matchAll(/<[^>]*class="[^"]*(?:error|alert|message)[^"]*"[^>]*>([\s\S]{0,200}?)</gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3);
  return { page, href, token, notices, needsConfirm: /confirm-email/.test(href), landed: /\/app\//.test(href) };
}

// ------------------------------------------------------------ solveCaptcha
/**
 * The locked one-call entry point: mint a Turnstile token on this panel.
 * Fresh profile, the pinned exit as Chrome's `--proxy-server` (headed unless
 * --headless), browser always closed again; the token is returned untrimmed.
 */
async function solveCaptcha({ type = 'turnstile', sitekey = '', url = '', proxy = null } = {}) {
  if (type !== 'turnstile') throw new Error(`solveCaptcha: ${SITE} only speaks turnstile (asked for ${type})`);
  if (sitekey && sitekey !== SITEKEY) throw new Error(`solveCaptcha: this panel's Turnstile sitekey is ${SITEKEY}`);
  const exit = typeof proxy === 'string' ? parseProxy(proxy) : proxy || null;
  if (typeof proxy === 'string' && !exit) throw new Error(`solveCaptcha: unusable proxy ${proxy}`);
  const t0 = Date.now();
  const chrome = await launchChrome(exit);
  try {
    const page = new Page(chrome.cdp, chrome.sessionId);
    await page.goto(url || `${SITE}/accounts/signup/`, 2500);
    const token = await waitTurnstile(page);
    if (!token) throw new Error('solveCaptcha: the Turnstile widget produced no token');
    return { token, ms: Date.now() - t0 };
  } finally {
    await chrome.close().catch(() => {});
  }
}

module.exports = {
  // engine
  SITE, TEMPTF, SITEKEY, TURNSTILE_FIELD, TIMEOUT_MS, MAIL_WINDOW_MS, ROOT, OUT_DIR,
  sleep, nowIso, log, withTimeout,
  parseProxy, labelOf, directConnect, connectThrough, exitFetch, exitJson,
  Jar, TempTf, WsClient, CDP,
  findChrome, killChromeTree, freePort, launchChrome,
  Page, waitTurnstile, browserSignup,
  solveCaptcha,
};
