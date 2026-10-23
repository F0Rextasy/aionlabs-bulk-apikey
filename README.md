<div align="center">

```
 █████╗ ██╗ ██████╗ ███╗   ██╗██╗      █████╗ ██████╗ ███████╗
██╔══██╗██║██╔═══██╗████╗  ██║██║     ██╔══██╗██╔══██╗██╔════╝
███████║██║██║   ██║██╔██╗ ██║██║     ███████║██████╔╝███████╗
██╔══██║██║██║   ██║██║╚██╗██║██║     ██╔══██║██╔══██╗╚════██║
██║  ██║██║╚██████╔╝██║ ╚████║███████╗██║  ██║██████╔╝███████║
╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝
```

# aionlabs-bulk-apikey

**Bulk-create Aion Labs accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[⚡ One command](#-one-command) · [🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-6-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [⚠️ Terms](#️-terms-and-account-risk) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

Aion Labs (`aionlabs.ai`) is a Django + **django-allauth** panel behind Cloudflare, and its signup has two hard gates: a real **Cloudflare Turnstile** widget (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, token field `cf-turnstile-response`) and **mandatory e-mail verification** — logging in with an unconfirmed account is bounced to `/accounts/confirm-email/` with a **405**, so there is no shortcut around reading the inbox. Everything after the mail is plain HTTP: `POST /accounts/login/` takes no captcha, the session cookie opens `/app/api-keys/`, and `POST /app/api-keys/create/` returns the `alv2_…` key inline. That is the whole rail this tool automates.

The lane's own run took **each account minted its own key, every one kept only after a live chat 200** (`content:"OK"`, `finish_reason:stop`) on both `aion-labs/aion-3.0-mini` and `aion-labs/aion-3.5`; the scale pass minted keys in 8 signup attempts (~56 s per key) through one browser session and a pinned exit.

## 🎁 Free tier — how much you get

| What | Value |
| --- | --- |
| Plan on signup | **Free** — `$0`, **no card** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Requests per minute | **15** |
| Tokens per minute | **20,000** |
| Tokens per day | **20,000** — the free tier's hard daily cap |
| Higher tiers | only by lifetime credit top-up ($1 … $1,000); a tier is never reduced |
| Billing unit | **per account** — the quota lives on the account, which is why this tool creates one account per key |
| Email gate | **mandatory** (allauth); unconfirmed login → `405` at `/accounts/confirm-email/` |
| Phone / card | neither |

With N keys you hold N accounts, i.e. **N × 20,000 tokens/day** and 15 RPM each. The daily counter resets per account, not per IP.

> 💡 The free tier is set by Aion Labs and can change. Check the live numbers at [www.aionlabs.ai](https://www.aionlabs.ai) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 6 of them

`GET /v1/models` answers **200 without a key** and lists **6 ids**; a chat call without a key answers `401 {"detail":"Authentication credentials were not provided."}`.

| Model ID | Context | Input / 1M | Output / 1M | Verified |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **every key, chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **every key, chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 on the lane keys |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | listed |
| `aion-labs/aion-3.5-mini` | 256K | — | — | listed |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | listed (roleplay, 8B) |

> ⚠️ **Two quirks the gate already handles.** The reasoning field is **`reasoning`**, not `reasoning_content`, and the mini/3.5 models think before answering: with `max_tokens` below ~512 the reply comes back `content:""` with `finish_reason:"length"`. The CLI asks for **512** by default (`--max-tokens`); a smaller budget makes a live key look dead.

## 🧪 How to use the API

Base URL **`https://api.aionlabs.ai/v1`** — OpenAI-compatible, so any OpenAI SDK or client pointed at it works.

```bash
curl https://api.aionlabs.ai/v1/chat/completions \
  -H "Authorization: Bearer alv2_…" \
  -H "Content-Type: application/json" \
  -d '{"model":"aion-labs/aion-3.0-mini","messages":[{"role":"user","content":"Say OK"}],"max_tokens":512}'
```

```python
from openai import OpenAI
c = OpenAI(base_url="https://api.aionlabs.ai/v1", api_key="alv2_…")
print(c.chat.completions.create(model="aion-labs/aion-3.0-mini",
      messages=[{"role":"user","content":"Say OK"}], max_tokens=512).choices[0].message.content)
```

A live key answers in **1.5–2.6 s** for a 60–100 token completion. The panel returns no rate-limit headers (`x-request-id` only), so the 15 RPM / 20k TPD ceilings are enforced silently.

## ⚡ One command

```bash
node src/cli.js --count N        # N accounts → N keys, one command, nothing to answer
```

The Cloudflare Turnstile widget is solved by the embedded browser engine (`src/solver.js`) inside a real Chrome on the page that carries it — `--auto` is the **default** and stays on, so there is no captcha to paste and no browser question in the way. Naming `--dry` prints the resolved plan (count, model, route, solver, Chrome path) and exits 0 without writing a file or opening a socket:

```bash
node src/cli.js --count N --dry
```

`npm start` (or `node src/launcher.js`) does the same from a menu: pick **1) Mint keys**, answer "How many keys?" (Enter = 10) and it runs `node src/cli.js --auto --count N`. `proxies.txt` is picked up automatically when it exists, otherwise the run is direct.

## 🛠 Quick start

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

The browser step needs **Chrome or Chromium** on the machine (`--browser <exe>` or `CHROME_PATH` if it is not in the default location). A key is written to `keys.txt` **only** after `/v1/chat/completions` answers 200 with real content; `accounts.jsonl` keeps the address, password, key name and the gate result.

One account per key: `--count N` is really "N free accounts". The tool rolls automatically when a temp.tf pool mailbox turns out to be known to the panel (`[Aion Labs] Account Already Exists`) or when the Turnstile widget stalls.

### 🖱️ The launcher

The launcher asks for the proxy list (optional — without one the CLI runs direct), the count and the model, remembers them in `launcher.config.json`, and runs the CLI: **mint**, **verify**, **screen** (test the exits against the signup gate), **settings**, **help** and **Connect to 9Router**.

## ✅ Verified working — every key is tested

| Check | Result |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, no key, **6 model ids** |
| `POST /v1/chat/completions` without a key | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, allauth form (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| signup submit | **200 → `/accounts/confirm-email/`**, Turnstile token 730 chars, solved by the page's own widget in a visible Chrome |
| confirmation mail | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** after submit; link `…/accounts/confirm-email/<key>/` → lands `/app/` |
| `POST /accounts/login/` (confirmed account) | session established (the follow-up `/app/` GET answers **403** even so — harmless) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, `alv2_…` key (48 chars) returned inline |
| `POST /v1/chat/completions` | **200** with `content:"OK"` on all **10** keys (`aion-3.0-mini` and `aion-3.5`) |
| unconfirmed account login | **405** at `/accounts/confirm-email/` — verification really is mandatory |
| shared temp.tf mailbox that is already registered | signup mails `"[Aion Labs] Account Already Exists"` with a password-reset link — the tool rolls to a fresh address |

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Re-run the verify step any time;
> failures are reported, never hidden.

## 🧭 How it works

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Step | Call | Notes |
| --- | --- | --- |
| mailbox | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | plus alias on a real Microsoft mailbox, no captcha, `POST /api/check` reads it as JSON |
| pre-filter | `POST /api/check` | a box that already carries Aion mail is registered upstream — roll before spending a signup |
| signup | Chrome (CDP) on `/accounts/signup/` | fills e-mail + password ×2 + terms, waits for the page's own Turnstile token (clicks the widget only if it stalls) |
| confirm | mail link opened in the same browser session | must land `/app/`; `"Account Already Exists"` → roll |
| key | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | plain HTTP, no browser: csrf from the page, key from the response |
| gate | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **or** `reasoning` = live; only then `keys.txt` |

Chrome is launched per account with `--proxy-server` = that account's exit, in a throw-away profile, and closed as soon as the account is confirmed — so no session leaks between accounts and the whole run stays on the pool.

## ⚙️ CLI options

```bash
node src/cli.js --count 10                        # mint 10 keys (one account each)
node src/cli.js --count 1 --model aion-labs/aion-3.5
node src/cli.js --count 5 --max-tokens 800        # more thinking budget for the gate
node src/cli.js --verify-only                     # re-check every key in keys.txt
node src/cli.js --verify-only --limit 5
node src/cli.js --screen                          # test the exits against the signup gate
node src/cli.js --connect-9router                 # register the provider + keys on a local 9Router
node src/cli.js --help
```

| Env | Default | Meaning |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | exit pool, one per line (same as `--pool`); absent = direct |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | model used for the live gate |
| `CHROME_PATH` | auto-detected | Chrome/Chromium binary for the signup step |

## 🛰️ Behind a proxy

**Optional — recommended at scale.** Every request goes through one exit from your list, and so does the browser (Chrome gets that exit as `--proxy-server`).

- **With a pool:** `--pool proxies.txt` (or `AIONLABS_PROXIES`). One exit is pinned per account, so signup, confirm, key mint and the gate all leave from the same address — the panel never sees a mixed trail. A dead exit fails that attempt and the next roll takes the next exit.
- **Fail-closed:** an explicit `--pool` that is missing or has no usable exit line is a **fatal error**, never a silent direct run. The env var (which the launcher sets) warns and falls back to direct instead.
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and works the same — only where the packets leave from changes.
- `socks5://`, `socks5h://`, `http://`, `https://` and bare `host:port` lines are accepted; SOCKS5-with-auth lines are dropped because Chrome cannot authenticate to them (HTTP proxy auth is handled through the Fetch domain).
- Exit quality matters more than exit count: public lists rot within hours. `--screen` tests each line against the signup page **and** the API before a real run.

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | one live-verified key per line (`alv2_…`, 48 chars) — git-ignored |
| `accounts.jsonl` | address / password / key name / key / exit / gate result per account — git-ignored |
| `proxies.txt` | your exits, one per line — git-ignored |
| `out/` | run log (`aionlabs-cli-<date>.log`) and screenshots of failed captcha steps — git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Defaults: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Models are served as `aionlabs/<model id>`.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-omniroute.js --api-key alv2_…
```

Defaults: `--omniroute-prefix aionlabs`, `--omniroute-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Models are served as `aionlabs/<model id>`.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 What the provider gives | **$0 free tier**, no card: a daily credit allowance, 15 RPM, 20k tokens/day per account |
| 🔑 What one key gets you | one `alv2_…` key on its own account, chat-verified on `aion-labs/aion-3.0-mini` |
| 🌐 API shape | OpenAI-compatible: `POST https://api.aionlabs.ai/v1/chat/completions` (6 model ids) |
| 🔒 Your data | only `aionlabs.ai`, `api.aionlabs.ai`, your inbox backend and your own proxy are contacted; keys stay on your machine |

## ⚠️ Terms and account risk

This tool automates a sign-up flow, so **you** own what it does: automating a provider's sign-up can break that provider's terms of service, and the free tier an account hands you is the provider's to throttle, change or claw back at any time — per account and per IP. Run it only for accounts you are allowed to create, keep your proxy list your own, and do not treat these keys as production capacity. Nothing here is a licence to bypass a provider's rules.

## 🐞 Issues

If Aion Labs changes its signup form, its Turnstile sitekey, the confirmation mail or the api-keys route, the tool stops at that step and reports the refusal verbatim (the exact status, the page it landed on, or the mail subject it saw). **[Open an issue](../../issues)** with the command and the exact output.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>
