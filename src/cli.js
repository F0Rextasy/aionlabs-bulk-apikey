#!/usr/bin/env node
'use strict';

/**
 * aionlabs-bulk-apikey CLI — mint Aion Labs (aionlabs.ai) accounts, one API key
 * per account, and keep only the keys that survived a live chat call.
 *
 * Aion Labs is a Django + django-allauth site on Cloudflare: `/accounts/signup/`
 * carries a real Cloudflare Turnstile widget (sitekey 0x4AAAAAAAz_ySGy6QN0NLcx,
 * token field `cf-turnstile-response`) and e-mail verification is MANDATORY —
 * logging in with an unconfirmed account is bounced to `/accounts/confirm-email/`
 * with a 405, so the inbox is part of the rail, not an optional nicety. The API
 * itself is OpenAI-compatible at `https://api.aionlabs.ai/v1`; `GET /v1/models`
 * answers without a key, `POST /v1/chat/completions` needs `alv2_…` (48 chars).
 *
 * Flow, per account (every request through one exit from your pool):
 *   1. mailbox    temp.tf `GET /api/account?providers=hotmail,outlook&plus=1`
 *                 → a plus alias on a REAL Microsoft mailbox (no captcha, JSON
 *                 reader). A fresh alias is cheap; the same base mailbox coming
 *                 back twice means the panel already knows the account, so the
 *                 box is pre-filtered and rolled before a signup is spent.
 *   2. browser    visible Chrome over CDP fills `/accounts/signup/` (e-mail,
 *                 password ×2, terms) and lets the page's own Turnstile widget
 *                 solve itself — no external solver, no token injection. Chrome
 *                 runs with `--proxy-server` = the pinned exit for this account,
 *                 in a throw-away profile, and is closed again once the account
 *                 is confirmed.
 *   3. confirm    `noreply@mg.aionlabs.ai "[Aion Labs] Please Confirm Your Email
 *                 Address"` lands in ~10 s; the link inside is opened in the same
 *                 browser session and must land on `/app/`. The subject
 *                 `[Aion Labs] Account Already Exists` (password-reset link, no
 *                 confirm link) means this base mailbox is registered upstream —
 *                 the attempt rolls to a new address instead of failing.
 *   4. key        pure HTTP, no browser: `POST /accounts/login/` (no captcha on
 *                 that form) → session cookie → `GET /app/api-keys/` → csrf →
 *                 `POST /app/api-keys/create/` → the `alv2_…` key comes back in
 *                 the response body.
 *   5. gate       `POST /v1/chat/completions` on `aion-labs/aion-3.0-mini`
 *                 (fallbacks: the other five ids) → 200 with `content` **or**
 *                 `reasoning` = keep. The key is appended to `keys.txt` only
 *                 after this call answers 200.
 *
 * Two measured quirks the gate already accounts for:
 *   - the reasoning field is `reasoning` (not `reasoning_content`), and
 *   - aion-3.0-mini/3.5 spend the whole budget thinking: with `max_tokens` below
 *     ~512 the answer comes back `content:""` with `finish_reason:"length"`, so
 *     the gate asks for 512 by default (`--max-tokens`).
 * The login POST itself answers `403` on `/app/` even with a valid session; the
 * api-keys page still renders and key creation succeeds, so that 403 is ignored.
 *
 * Options:
 *   --count N        accounts (= keys) to mint                                  [1]
 *   --model <id>     model used for the live gate          [aion-labs/aion-3.0-mini]
 *   --max-tokens N   completion budget for the gate call                      [512]
 *   --mail-window S  seconds to wait for the confirmation mail                 [300]
 *   --gap MS         pause between accounts                                   [1500]
 *   --pool <file>    proxy list, one exit per line — FAIL-CLOSED: a missing or
 *                    unusable file aborts instead of silently going direct
 *   --tries N        pool entries tried per account before giving up            [2]
 *   --timeout MS     per-request timeout                                     [60000]
 *   --browser <exe>  Chrome/Chromium binary (env CHROME_PATH)
 *   --debug-port N   pin the DevTools port (default: a free one)
 *   --headless       run Chrome headless (default: visible — Turnstile is calmer)
 *   --screen         only test the pool (or the direct route) against the signup gate
 *   --limit N        cap the keys --verify-only walks (0 = all)                  [0]
 *   --verify-only    re-run every key in keys.txt through the chat gate
 *   --connect-9router  register this provider (and the keys) on a local 9Router
 *   --api-key <key>  register just this key (with --connect-9router)
 *   --help
 *
 * Zero dependencies. Node.js >= 18. Your proxy list is OPTIONAL: pass `--pool`
 * (or set AIONLABS_PROXIES) and every request — including Chrome's — goes through
 * an exit from it; without a pool the tool connects directly. `--pool` on the
 * command line is fail-closed; the env var falls back to direct with a warning so
 * the shipped launcher keeps working when the file is absent.
 *
 * Files written next to the CLI (or repo root when run from src/):
 *   keys.txt         one live-verified key per line
 *   accounts.jsonl   address / password / key / gate result per account
 *   out/             run log (aionlabs-cli-<date>.log)
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
const KEYS_FILE = path.join(ROOT, 'keys.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.jsonl');
const OUT_DIR = path.join(ROOT, 'out');

const SITE = 'https://www.aionlabs.ai';
const API = 'https://api.aionlabs.ai/v1';
const TEMPTF = 'https://temp.tf';
const TURNSTILE_FIELD = 'cf-turnstile-response';
const SITEKEY = '0x4AAAAAAAz_ySGy6QN0NLcx';
const KEY_RE = /alv2_[A-Za-z0-9_-]{20,}/;
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
const has = (name) => argv.includes(`--${name}`);

const HELP = has('help') || has('h');
const COUNT = Math.max(0, Number(arg('count', 1)) || 0);
const MODEL = arg('model', process.env.AIONLABS_MODEL || 'aion-labs/aion-3.0-mini');
const MAX_TOKENS = Number(arg('max-tokens', 512)) || 512;
const MAIL_WINDOW_MS = (Number(arg('mail-window', 300)) || 300) * 1000;
const GAP_MS = Number(arg('gap', 1500)) || 0;
const TIMEOUT_MS = Number(arg('timeout', 60000)) || 60000;
const TRIES = Math.max(1, Number(arg('tries', 2)) || 1);
const LIMIT = Math.max(0, Number(arg('limit', 0)) || 0);
const VERIFY_ONLY = has('verify-only');
const SCREEN = has('screen');
const CONNECT_9ROUTER = has('connect-9router');
const HEADLESS = has('headless');
const BROWSER_BIN = arg('browser', process.env.CHROME_PATH || '');
const DEBUG_PORT = Number(arg('debug-port', 0)) || 0;
const POOL_FLAG = arg('pool', null);
const POOL_ENV = process.env.AIONLABS_PROXIES || null;

// --------------------------------------------------------------------- utils
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const rand = (n) => crypto.randomBytes(32).toString('hex').slice(0, n);
const randPass = () => `Aio${rand(6)}!${100 + Math.floor(Math.random() * 900)}`;
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

// ---------------------------------------------------------------------- pool
function loadExits() {
  const explicit = POOL_FLAG !== null && POOL_FLAG !== undefined;
  const requested = explicit ? POOL_FLAG : POOL_ENV;
  if (!requested) {
    console.log('no proxy list configured — running WITHOUT a proxy (direct).');
    console.log('  (pass --pool proxies.txt, or set AIONLABS_PROXIES, to route through exits)');
    return [null];
  }
  const file = fs.existsSync(requested) ? path.resolve(requested) : path.resolve(ROOT, requested);
  // `--pool` is fail-closed: an explicit pool that cannot be used must not
  // silently downgrade to a direct run (that is how a whole batch leaks the
  // operator's own IP). The env var is the launcher's path, so it warns and
  // falls back to direct — the launcher already tells the user the file is gone.
  const fail = (why) => {
    const msg = `--pool ${requested}: ${why}`;
    if (explicit) { console.error(`[fatal] ${msg}`); process.exit(1); }
    console.log(`! ${msg} — running WITHOUT a proxy (direct).`);
    return [null];
  };
  if (!fs.existsSync(file)) return fail('file not found');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const exits = [];
  let skipped = 0;
  for (const line of lines) {
    const p = parseProxy(line);
    // Chrome cannot authenticate to a SOCKS5 proxy; such lines would break the
    // browser step, so they are dropped here rather than at signup time.
    if (!p || (p.protocol === 'socks5' && p.username)) { skipped++; continue; }
    exits.push(p);
  }
  if (skipped) console.log(`pool: ${skipped} line(s) skipped (unparsable or socks5-with-auth)`);
  if (!exits.length) return fail('no usable exits');
  console.log(`pool: ${exits.length} exit(s) from ${file}`);
  return exits;
}

/**
 * Exit vet: the signup page must answer AND still render the Turnstile widget.
 * The marker is the `cf-turnstile` div (`data-sitekey=…`) — the
 * `cf-turnstile-response` input only exists once the script has run, so it is
 * not in the static HTML.
 */
async function vetExit(exit) {
  const t0 = Date.now();
  const r = await exitFetch(exit, `${SITE}/accounts/signup/`, { timeoutMs: 30000, redirects: 3 });
  if (r.status !== 200) return { ok: false, why: `signup page ${r.status}` };
  if (!/cf-turnstile|data-sitekey/.test(r.body)) return { ok: false, why: 'no Turnstile widget on the signup page' };
  if (!/id="id_email"/.test(r.body)) return { ok: false, why: 'signup form fields missing (challenge page?)' };
  const api = await exitJson(exit, `${API}/models`, { timeoutMs: 25000 }).catch((e) => ({ status: 0, text: e.message }));
  if (api.status !== 200) return { ok: false, why: `api /v1/models ${api.status}` };
  return { ok: true, ms: Date.now() - t0 };
}

async function screen(exits) {
  let ok = 0;
  for (const e of exits) {
    try {
      const v = await vetExit(e);
      if (v.ok) ok++;
      console.log(`  ${v.ok ? '✔' : '✘'} ${labelOf(e)} ${v.ok ? `ok ${v.ms}ms` : v.why}`);
    } catch (err) {
      console.log(`  ✘ ${labelOf(e)} ${String(err.message).slice(0, 90)}`);
    }
  }
  console.log(`screened ${exits.length} route(s): ${ok} reach the signup gate`);
  return ok > 0;
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

// ------------------------------------------------------- session (login + key)
const formBody = (obj) => new URLSearchParams(obj).toString();

/** Login on the confirmed account and mint the key over plain HTTP. */
async function mintKeyHttp(exit, { address, password, keyName }) {
  const jar = new Jar();
  const loginPage = await exitFetch(exit, `${SITE}/accounts/login/`, { jar, timeoutMs: TIMEOUT_MS });
  const csrfLogin = (loginPage.body.match(/name="csrfmiddlewaretoken"[^>]*value="([^"]+)"/) || [])[1] || '';
  if (!csrfLogin) throw new Error(`login page has no csrf (status ${loginPage.status})`);
  const login = await exitFetch(exit, `${SITE}/accounts/login/`, {
    method: 'POST',
    jar,
    timeoutMs: TIMEOUT_MS,
    headers: { 'content-type': 'application/x-www-form-urlencoded', referer: `${SITE}/accounts/login/`, origin: SITE },
    body: formBody({ login: address, password, csrfmiddlewaretoken: csrfLogin, remember: 'on' }),
  });
  if (/confirm-email/.test(String(login.location || ''))) throw new Error('e-mail not confirmed (login bounced to /accounts/confirm-email/)');

  const keysPage = await exitFetch(exit, `${SITE}/app/api-keys/`, { jar, timeoutMs: TIMEOUT_MS });
  const html = keysPage.body;
  if (!/api-keys/.test(keysPage.url) || !/csrfmiddlewaretoken/.test(html)) {
    throw new Error(`api-keys page unreachable (login ${login.status} → ${login.location || '(no location)'}, page ${keysPage.status})`);
  }
  const existing = html.match(KEY_RE);
  const csrf = (html.match(/name="csrfmiddlewaretoken"[^>]*value="([^"]+)"/) || [])[1] || jar.get('www.aionlabs.ai', 'csrftoken');
  if (!csrf) throw new Error('no csrf on the api-keys page');
  const created = await exitFetch(exit, `${SITE}/app/api-keys/create/`, {
    method: 'POST',
    jar,
    timeoutMs: TIMEOUT_MS,
    redirects: 3,
    headers: { 'content-type': 'application/x-www-form-urlencoded', referer: `${SITE}/app/api-keys/`, origin: SITE },
    body: formBody({ csrfmiddlewaretoken: csrf, name: keyName }),
  });
  let key = (created.body.match(KEY_RE) || [])[0];
  if (!key) {
    // The create view answers 302 to the list page; the key can be rendered
    // there instead of in the POST body, so scrape the page once more.
    const again = await exitFetch(exit, `${SITE}/app/api-keys/`, { jar, timeoutMs: TIMEOUT_MS });
    key = (again.body.match(KEY_RE) || [])[0];
  }
  if (!key) {
    if (existing) return { key: existing[0], note: 'existing key' };
    const snip = String(created.body).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 200);
    throw new Error(`key create failed (status ${created.status} → ${created.location || 'no location'}) ${snip}`);
  }
  return { key };
}

// ------------------------------------------------------------------ api gate
const CHEAP_HINTS = ['mini', '3.5', '2.0', 'llama'];

/** Chat-capable candidates, cheapest-looking first. */
function pickCandidates(ids) {
  const chat = (ids || []).filter((id) => id && !/embedding|rerank/i.test(id));
  const out = [MODEL];
  for (const hint of CHEAP_HINTS) for (const id of chat) if (!out.includes(id) && id.toLowerCase().includes(hint)) out.push(id);
  for (const id of chat) if (!out.includes(id)) out.push(id);
  return out.slice(0, 6);
}

async function listModels(exit, key) {
  const r = await exitJson(exit, `${API}/models`, { headers: { authorization: `Bearer ${key}` }, timeoutMs: TIMEOUT_MS });
  return { status: r.status, ids: ((r.json && r.json.data) || []).map((m) => m.id).filter(Boolean) };
}

/**
 * One real completion. `max_tokens` stays at 512 by default: aion-3.0-mini
 * thinks before answering and a smaller budget returns `content:""` with
 * `finish_reason:"length"` (measured), which would look like a dead key.
 */
async function chatGate(exit, key, model) {
  const r = await exitJson(exit, `${API}/chat/completions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}` },
    timeoutMs: Math.max(TIMEOUT_MS, 120000),
    body: { model, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], max_tokens: MAX_TOKENS, stream: false },
  });
  const choice = (r.json && r.json.choices && r.json.choices[0]) || {};
  const msg = choice.message || {};
  const content = msg.content || msg.reasoning_content || msg.reasoning || '';
  return {
    ok: r.status === 200 && !!content,
    status: r.status,
    model,
    finish: choice.finish_reason || null,
    sample: content ? String(content).trim().slice(0, 60) : String(r.text).slice(0, 140),
  };
}

/** Models + a completion on the first model that answers — the keep/drop gate. */
async function proveKey(exit, key) {
  const models = await listModels(exit, key);
  if (models.status !== 200 || !models.ids.length) {
    return { ok: false, status: models.status, models: 0, sample: `GET /v1/models -> ${models.status}` };
  }
  let last = null;
  for (const model of pickCandidates(models.ids)) {
    try {
      const g = await chatGate(exit, key, model);
      if (g.ok) return { ok: true, status: 200, model: g.model, sample: g.sample, models: models.ids.length };
      last = g;
    } catch (e) {
      last = { status: 0, model, sample: String(e.message).slice(0, 120) };
    }
  }
  return { ok: false, status: last && last.status, models: models.ids.length, sample: (last && last.sample) || 'no model answered', finish: last && last.finish };
}

// -------------------------------------------------------------------- files
function readKeys(file = KEYS_FILE) {
  try {
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  } catch (e) {
    return [];
  }
}
function appendKey(key) {
  fs.mkdirSync(ROOT, { recursive: true });
  fs.appendFileSync(KEYS_FILE, key + '\n');
}
function ledger(rec) {
  fs.appendFileSync(ACCOUNTS_FILE, JSON.stringify(rec) + '\n');
}

// --------------------------------------------------------------------- flows
/** One account: mailbox → browser signup → confirm → HTTP key → chat gate. */
async function attemptAccount(n, exits, seed) {
  const started = Date.now();
  const rolls = Math.max(6, exits.length * TRIES);
  const errors = [];
  let address = null;
  let password = null;
  for (let roll = 0; roll < rolls; roll++) {
    const exit = exits[(seed + roll) % exits.length];
    const box = new TempTf(exit);
    let chrome = null;
    try {
      // Exit first: a dead line must not burn a temp.tf address or a signup.
      const vet = await vetExit(exit).catch((e) => ({ ok: false, why: e.message }));
      if (!vet.ok) {
        log(`account ${n}: exit ${labelOf(exit)} fails the gate (${vet.why}) — next exit`);
        errors.push(`exit ${vet.why}`);
        continue;
      }
      address = await box.create();
      log(`account ${n}: mailbox ${address} (${labelOf(exit)})`);

      // A shared pool mailbox that already carries Aion mail is registered
      // upstream; rolling on it costs one address instead of a signup round trip.
      const pre = await box.messages().catch(() => []);
      if (pre.some((m) => /aion/i.test(`${m.from || ''} ${m.subject || ''}`))) {
        log(`account ${n}: ${address} is already known to the panel — rolling`);
        continue;
      }

      password = randPass();
      chrome = await launchChrome(exit);
      const s = await browserSignup(chrome, { address, password });
      log(`account ${n}: signup → ${s.href} (turnstile ${s.token.length} chars)${s.notices.length ? ` notices=${JSON.stringify(s.notices)}` : ''}`);
      if (!s.landed && !s.needsConfirm) {
        log(`account ${n}: signup rejected — rolling`);
        errors.push('signup rejected');
        continue;
      }
      if (!s.landed) {
        const mail = await box.waitForConfirmLink();
        if (mail.alreadyExists) {
          log(`account ${n}: panel answered "${mail.subject}" (base mailbox known upstream) — rolling`);
          errors.push('account already exists');
          continue;
        }
        log(`account ${n}: mail "${mail.subject}" → opening the confirm link`);
        await s.page.goto(mail.link, 2500);
        const deadline = Date.now() + 40000;
        let href = await s.page.url().catch(() => '');
        while (Date.now() < deadline && !/\/app\//.test(href)) {
          await sleep(1500);
          href = await s.page.url().catch(() => href);
        }
        if (!/\/app\//.test(href)) throw new Error(`confirm link did not land on /app/ (at ${href})`);
        log(`account ${n}: e-mail confirmed (${href})`);
      }

      const keyName = `aion-${rand(6)}`;
      const { key } = await mintKeyHttp(exit, { address, password, keyName });
      log(`account ${n}: key ${key.slice(0, 14)}… (${key.length} chars)`);

      const gate = await proveKey(exit, key);
      const rec = {
        at: nowIso(), provider: 'aionlabs', n, email: address, password, keyName, key,
        exit: labelOf(exit), gate: { ok: gate.ok, model: gate.model, status: gate.status, sample: gate.sample },
        ms: Date.now() - started,
      };
      if (!gate.ok) {
        log(`account ${n}: key minted but the chat gate failed (${gate.status} ${String(gate.sample).slice(0, 80)}) — not written to keys.txt`);
        ledger({ ...rec, ok: false });
        errors.push(`gate ${gate.status} ${gate.finish || ''}`.trim());
        continue;
      }
      appendKey(key);
      ledger({ ...rec, ok: true });
      log(`account ${n}: LIVE — chat ${gate.status} ${gate.model} "${gate.sample}" → keys.txt`);
      return rec;
    } catch (e) {
      const msg = String(e.message).slice(0, 200);
      log(`account ${n}: attempt failed (${msg}) — rolling`);
      errors.push(msg);
      // The account may well be confirmed already (e.g. the key view answered a
      // redirect we could not read), so the credentials belong in the ledger for
      // a later --verify-only / manual key mint.
      if (password) ledger({ at: nowIso(), provider: 'aionlabs', n, email: address, password, ok: false, error: msg });
    } finally {
      if (chrome) await chrome.close().catch(() => {});
    }
  }
  ledger({ at: nowIso(), provider: 'aionlabs', n, email: address, ok: false, rolls, errors: errors.slice(-6) });
  log(`account ${n}: no key after ${rolls} roll(s) — last errors ${JSON.stringify(errors.slice(-3))}`);
  return null;
}

async function mint(exits) {
  log(`aionlabs mint · ${COUNT} account(s) · model ${MODEL} · max_tokens ${MAX_TOKENS} · routes ${exits.filter(Boolean).length || 'direct'} · keys → ${KEYS_FILE}`);
  if (exits.filter(Boolean).length < COUNT) log('note: fewer exits than accounts — accounts reuse the pool round-robin');
  let made = 0;
  for (let i = 0; i < COUNT; i++) {
    const rec = await attemptAccount(i + 1, exits, i);
    if (rec) made++;
    if (i < COUNT - 1 && GAP_MS) await sleep(GAP_MS);
  }
  log(`done — ${made}/${COUNT} key(s) written to ${KEYS_FILE}`);
  process.exit(made === COUNT ? 0 : 1);
}

async function verifyOnly(exits) {
  let keys = readKeys();
  if (LIMIT > 0) keys = keys.slice(0, LIMIT);
  if (!keys.length) {
    console.log(`no keys in ${KEYS_FILE} — mint one first (node ${path.relative(process.cwd(), __filename)} --count 1)`);
    process.exit(0);
  }
  console.log(`keys: ${keys.length} from ${KEYS_FILE} · routes ${exits.filter(Boolean).length || 'direct'}`);
  let live = 0;
  for (let i = 0; i < keys.length; i++) {
    const exit = exits[i % exits.length];
    try {
      const g = await proveKey(exit, keys[i]);
      if (g.ok) live++;
      console.log(`  ${g.ok ? '✔' : '✘'} ${keys[i].slice(0, 14)}… chat=${g.ok ? 200 : g.status || 0} ${g.ok ? `${g.model} "${g.sample}"` : String(g.sample).slice(0, 100)}`);
    } catch (e) {
      console.log(`  ✘ ${keys[i].slice(0, 14)}… ${String(e.message).slice(0, 100)}`);
    }
  }
  console.log(`verify: ${live}/${keys.length} keys live`);
  process.exit(live === keys.length ? 0 : 1);
}

// ------------------------------------------------------------------ 9Router
/** Register the provider node + one connection per key on a local 9Router. */
async function connect9router() {
  const base = arg('9router-base', 'http://localhost:20128').replace(/\/$/, '');
  const password = arg('9router-password', '123456');
  const name = arg('9router-name', 'Aion Labs');
  const prefix = arg('9router-prefix', 'aionlabs');
  const baseUrl = arg('base-url', `${API}`);
  const r9ua = 'aionlabs-bulk-9router-connector/1.0';
  const keys = arg('api-key', '') ? [arg('api-key', '')] : readKeys();
  if (!keys.length) {
    console.log('no keys — mint one first (node src/cli.js --count 1), or pass --api-key <key>');
    process.exit(1);
  }

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': r9ua },
    body: JSON.stringify({ password }),
  });
  const setCookie = typeof login.headers.getSetCookie === 'function' ? login.headers.getSetCookie() : [];
  const cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  console.log(`9Router login: ${login.ok ? 'ok' : `not required/failed ${(await login.text()).slice(0, 120)}`}`);

  const api = async (route, init = {}) => {
    const res = await fetch(`${base}${route}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'User-Agent': r9ua, ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) },
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON reported as text */ }
    return { status: res.status, ok: res.ok, json, text: text.slice(0, 300) };
  };

  const nodes = await api('/api/provider-nodes');
  let node = (((nodes.json || {}).nodes) || []).find((n) => n.prefix === prefix || n.name === name);
  if (node) {
    console.log(`provider-node exists: ${node.id} (prefix ${node.prefix})`);
  } else {
    const created = await api('/api/provider-nodes', {
      method: 'POST',
      body: JSON.stringify({ name, prefix, apiType: 'chat', type: 'openai-compatible', baseUrl }),
    });
    if (!created.ok) throw new Error(`create node failed ${created.status}: ${created.text}`);
    node = created.json.node;
    console.log(`provider-node created: ${node.id} (${baseUrl})`);
  }

  const conns = await api('/api/providers');
  const existing = (((conns.json || {}).connections) || []).filter((c) => c.provider === node.id || c.name === name);
  let added = 0;
  for (let i = 0; i < keys.length; i++) {
    const connName = keys.length === 1 ? name : `${prefix}-${String(i + 1).padStart(3, '0')}`;
    if (existing.some((c) => c.name === connName)) {
      console.log(`connection exists: ${connName}`);
      continue;
    }
    const created = await api('/api/providers', {
      method: 'POST',
      body: JSON.stringify({ provider: node.id, apiKey: keys[i], name: connName, priority: 1, defaultModel: MODEL }),
    });
    if (!created.ok && created.status !== 409) throw new Error(`create connection ${connName} failed ${created.status}: ${created.text}`);
    added++;
    console.log(`connection created: ${connName}`);
  }
  console.log(`\nDone — ${added} new connection(s). Models are served as ${prefix}/<model id>:\n  ${prefix}/${MODEL}`);
}

function help() {
  const head = fs.readFileSync(__filename, 'utf8');
  const doc = head.slice(head.indexOf('/**') + 3, head.indexOf('*/'));
  console.log(doc.replace(/^ \* ?/gm, '').replace(/\n{3,}/g, '\n\n').trim());
  console.log('\nAion Labs signup Turnstile sitekey: ' + SITEKEY);
  console.log('API base: ' + API);
}

// -------------------------------------------------------------------- main
if (require.main === module) {
  (async () => {
    if (HELP) { help(); process.exit(0); }
    if (CONNECT_9ROUTER) {
      await connect9router();
      process.exit(0);
    }
    const exits = loadExits();
    if (SCREEN) {
      const pass = await screen(exits);
      process.exit(pass ? 0 : 1);
    }
    if (VERIFY_ONLY) {
      await verifyOnly(exits);
      return;
    }
    if (COUNT < 1) {
      console.error('[fatal] --count must be at least 1');
      process.exit(1);
    }
    await mint(exits);
  })().catch((e) => {
    console.error('[fatal]', e.message);
    process.exit(1);
  });
}

// Exported so the lab can drive parts of the rail directly; the CLI only runs
// its own main flow when executed as a script.
module.exports = { parseProxy, loadExits, exitFetch, exitJson, TempTf, launchChrome, Page, WsClient, CDP, mintKeyHttp, proveKey, chatGate, pickCandidates, Jar, screen };
