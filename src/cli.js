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
 *   --auto           solve the page's own Turnstile widget in Chrome — DEFAULT, always on
 *   --dry            print the resolved plan and exit (no writes, no network)
 *   --help
 *
 * One command (the launcher menu runs exactly this):
 *   node src/cli.js --count N                 mint N keys, one account each
 *   node src/cli.js --count N --dry           print the plan, touch nothing
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
 *   keys-dead.txt    keys that a later --verify-only failed (moved out of keys.txt)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// The browser/captcha engine (raw CDP + Chrome + the page's own Turnstile
// widget), the exit transport and the temp.tf mailbox live in src/solver.js and
// are required from there; only the panel flow stays in this file. Every engine
// name is imported (and re-exported) so nothing the lab drives disappears.
const {
  SITE, TEMPTF, SITEKEY, TURNSTILE_FIELD, TIMEOUT_MS, MAIL_WINDOW_MS, ROOT, OUT_DIR,
  sleep, nowIso, log, withTimeout,
  parseProxy, labelOf, directConnect, connectThrough, exitFetch, exitJson, Jar, TempTf,
  WsClient, CDP, findChrome, killChromeTree, freePort, launchChrome,
  Page, waitTurnstile, browserSignup, solveCaptcha,
} = require('./solver.js');

const KEYS_FILE = path.join(ROOT, 'keys.txt');
const KEYS_DEAD_FILE = path.join(ROOT, 'keys-dead.txt');
const ACCOUNTS_FILE = path.join(ROOT, 'accounts.jsonl');

const API = 'https://api.aionlabs.ai/v1';
const KEY_RE = /alv2_[A-Za-z0-9_-]{20,}/;

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
const GAP_MS = Number(arg('gap', 1500)) || 0;
const TRIES = Math.max(1, Number(arg('tries', 2)) || 1);
const LIMIT = Math.max(0, Number(arg('limit', 0)) || 0);
const VERIFY_ONLY = has('verify-only');
const SCREEN = has('screen');
const CONNECT_9ROUTER = has('connect-9router');
const POOL_FLAG = arg('pool', null);
const POOL_ENV = process.env.AIONLABS_PROXIES || null;
// `--auto` is the default and the only path: the page's own Turnstile widget,
// solved in the embedded engine (src/solver.js). This CLI takes no manual
// token, so there is nothing a `--no-auto` could fall back to.
const DRY = has('dry');

// `--dry` is a plan-only run: it prints what would happen and exits 0 without
// writing a file or opening a socket (the pool file is read, nothing else).
if (DRY && require.main === module) {
  const exits = loadExits();
  let chrome = '';
  try { chrome = ` · Chrome ${findChrome()}`; } catch (e) { chrome = ` · Chrome NOT found (${e.message})`; }
  console.log('aionlabs plan (dry run — no writes, no network)');
  console.log(`  accounts : ${COUNT}`);
  console.log(`  model    : ${MODEL} — gate probes up to 6 ids, --max-tokens ${MAX_TOKENS}`);
  console.log(`  routes   : ${exits.filter(Boolean).length || 'direct'}`);
  console.log(`  solver   : auto (src/solver.js, the page's own Turnstile widget)${chrome}`);
  console.log(`  keys     : ${KEYS_FILE}`);
  process.exit(0);
}

// --------------------------------------------------------------------- utils
const rand = (n) => crypto.randomBytes(32).toString('hex').slice(0, n);
const randPass = () => `Aio${rand(6)}!${100 + Math.floor(Math.random() * 900)}`;

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
/** A dead key is never dropped silently: out of keys.txt, into keys-dead.txt. */
function buryKeys(dead) {
  if (!dead.length) return 0;
  const parked = readKeys(KEYS_DEAD_FILE);
  for (const k of dead) if (!parked.includes(k)) parked.push(k);
  fs.writeFileSync(KEYS_DEAD_FILE, parked.map((k) => k + '\n').join(''));
  fs.writeFileSync(KEYS_FILE, readKeys().filter((k) => !dead.includes(k)).map((k) => k + '\n').join(''));
  return dead.length;
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
  const dead = [];
  for (let i = 0; i < keys.length; i++) {
    const exit = exits[i % exits.length];
    try {
      const g = await proveKey(exit, keys[i]);
      if (g.ok) live++;
      else dead.push(keys[i]);
      console.log(`  ${g.ok ? '✔' : '✘'} ${keys[i].slice(0, 14)}… chat=${g.ok ? 200 : g.status || 0} ${g.ok ? `${g.model} "${g.sample}"` : String(g.sample).slice(0, 100)}`);
    } catch (e) {
      dead.push(keys[i]);
      console.log(`  ✘ ${keys[i].slice(0, 14)}… ${String(e.message).slice(0, 100)}`);
    }
  }
  if (dead.length) console.log(`verified dead: ${buryKeys(dead)} key(s) → ${KEYS_DEAD_FILE} (out of ${path.basename(KEYS_FILE)})`);
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
// its own main flow when executed as a script. The engine comes from solver.js.
module.exports = {
  SITE, TEMPTF, SITEKEY, TURNSTILE_FIELD, TIMEOUT_MS, MAIL_WINDOW_MS, ROOT, OUT_DIR,
  sleep, nowIso, log, withTimeout,
  parseProxy, labelOf, directConnect, connectThrough, exitFetch, exitJson, Jar, TempTf,
  WsClient, CDP, findChrome, killChromeTree, freePort, launchChrome,
  Page, waitTurnstile, browserSignup, solveCaptcha,
  loadExits, screen, mintKeyHttp, proveKey, chatGate, pickCandidates,
};
