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

**Aion-Labs-Konten im Bulk erstellen mit automatisch generierten API-Schlüsseln — OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[⚡ Ein Befehl](#-one-command) · [🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-6-of-them) · [🧪 Die API nutzen](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [⚠️ Bedingungen](#️-terms-and-account-risk) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Aion Labs (`aionlabs.ai`) ist ein Django- + **django-allauth**-Panel hinter Cloudflare, und die Registrierung hat zwei harte Hürden: ein echtes **Cloudflare-Turnstile**-Widget (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, Token-Feld `cf-turnstile-response`) und eine **verpflichtende E-Mail-Verifizierung** — ein Login mit einem unbestätigten Konto wird mit einem **405** auf `/accounts/confirm-email/` umgeleitet, es gibt also keinen Weg daran vorbei, den Posteingang zu lesen. Alles nach der Mail ist reines HTTP: `POST /accounts/login/` verlangt kein Captcha, das Session-Cookie öffnet `/app/api-keys/`, und `POST /app/api-keys/create/` liefert den `alv2_…`-Schlüssel direkt zurück. Genau diesen Ablauf automatisiert dieses Tool.

Der eigene Durchlauf dieser Lane hat ergeben: **jedes Konto hat seinen eigenen Schlüssel erzeugt, jeder einzelne wurde nur behalten nach einem Live-Chat-200** (`content:"OK"`, `finish_reason:stop`) sowohl bei `aion-labs/aion-3.0-mini` als auch bei `aion-labs/aion-3.5`; der Skalierungslauf hat in 8 Registrierungsversuchen Schlüssel erzeugt (~56 s pro Schlüssel) über eine Browser-Session und einen festen Exit.

## 🎁 Free-Tier — wie viel du bekommst

| Was | Wert |
| --- | --- |
| Plan bei Registrierung | **Free** — `$0`, **keine Karte** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Anfragen pro Minute | **15** |
| Tokens pro Minute | **20.000** |
| Tokens pro Tag | **20.000** — die harte Tagesgrenze des Free-Tiers |
| Höhere Stufen | nur durch lebenslanges Credit-Aufladen ($1 … $1.000); eine Stufe wird nie herabgesetzt |
| Abrechnungseinheit | **pro Konto** — das Kontingent hängt am Konto, weshalb dieses Tool ein Konto pro Schlüssel erstellt |
| E-Mail-Hürde | **verpflichtend** (allauth); unbestätigter Login → `405` bei `/accounts/confirm-email/` |
| Telefon / Karte | keines von beiden |

Mit N Schlüsseln hältst du N Konten, also **N × 20.000 Tokens/Tag** und je 15 RPM. Der Tageszähler wird pro Konto zurückgesetzt, nicht pro IP.

> 💡 Das Free-Tier wird von Aion Labs festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [www.aionlabs.ai](https://www.aionlabs.ai) — und lass die eigene Hürde des Tools entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 6

`GET /v1/models` antwortet **200 ohne Schlüssel** und listet **6 IDs**; ein Chat-Aufruf ohne Schlüssel antwortet `401 {"detail":"Authentication credentials were not provided."}`.

| Modell-ID | Kontext | Eingabe / 1M | Ausgabe / 1M | Verifiziert |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **jeder Schlüssel, chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **jeder Schlüssel, chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 bei den Lane-Schlüsseln |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | gelistet |
| `aion-labs/aion-3.5-mini` | 256K | — | — | gelistet |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | gelistet (Roleplay, 8B) |

> ⚠️ **Zwei Eigenheiten, die die Hürde bereits behandelt.** Das Reasoning-Feld heißt **`reasoning`**, nicht `reasoning_content`, und die mini/3.5-Modelle denken, bevor sie antworten: mit einem `max_tokens` unter ~512 kommt die Antwort als `content:""` mit `finish_reason:"length"` zurück. Die CLI fragt standardmäßig **512** an (`--max-tokens`); ein kleineres Budget lässt einen lebenden Schlüssel tot aussehen.

## 🧪 Die API nutzen

Basis-URL **`https://api.aionlabs.ai/v1`** — OpenAI-kompatibel, also funktioniert jedes OpenAI-SDK oder jeder Client, der darauf zeigt.

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

Ein lebender Schlüssel antwortet in **1,5–2,6 s** für eine Completion mit 60–100 Tokens. Das Panel liefert keine Rate-Limit-Header (nur `x-request-id`), daher werden die Grenzen von 15 RPM / 20k TPD still durchgesetzt.

## ⚡ Ein Befehl

```bash
node src/cli.js --count N        # N accounts → N keys, one command, nothing to answer
```

Das Cloudflare-Turnstile-Widget wird von der eingebetteten Browser-Engine (`src/solver.js`) in einem echten Chrome auf der Seite gelöst, die es trägt — `--auto` ist der **Standard** und bleibt an, es gibt also kein Captcha zum Einfügen und keine Browser-Frage im Weg. Wenn man `--dry` angibt, wird der aufgelöste Plan ausgegeben (Anzahl, Modell, Route, Solver, Chrome-Pfad) und mit 0 beendet, ohne eine Datei zu schreiben oder einen Socket zu öffnen:

```bash
node src/cli.js --count N --dry
```

`npm start` (oder `node src/launcher.js`) macht dasselbe über ein Menü: **1) Mint keys** wählen, "How many keys?" beantworten (Enter = 10) und es führt `node src/cli.js --auto --count N` aus. `proxies.txt` wird automatisch übernommen, wenn sie existiert, ansonsten läuft der Durchlauf direkt.

## 🛠 Schnellstart

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

Der Browser-Schritt erfordert **Chrome oder Chromium** auf dem Rechner (`--browser <exe>` oder `CHROME_PATH`, falls es nicht am Standardort liegt). Ein Schlüssel wird **nur** dann in `keys.txt` geschrieben, wenn `/v1/chat/completions` mit 200 und echtem Inhalt antwortet; `accounts.jsonl` speichert die Adresse, das Passwort, den Schlüsselnamen und das Ergebnis der Hürde.

Ein Konto pro Schlüssel: `--count N` bedeutet tatsächlich "N kostenlose Konten". Das Tool wechselt automatisch, wenn sich herausstellt, dass ein temp.tf-Pool-Postfach dem Panel bekannt ist (`[Aion Labs] Account Already Exists`) oder wenn das Turnstile-Widget hängen bleibt.

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste (optional — ohne eine läuft die CLI direkt), der Anzahl und dem Modell, merkt sie sich in `launcher.config.json` und führt die CLI aus: **mint**, **verify**, **screen** (die Exits gegen die Registrierungshürde testen), **settings**, **help** und **Connect to 9Router**.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, ohne Schlüssel, **6 Modell-IDs** |
| `POST /v1/chat/completions` ohne Schlüssel | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, allauth-Formular (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| Registrierung absenden | **200 → `/accounts/confirm-email/`**, Turnstile-Token 730 Zeichen, gelöst vom eigenen Widget der Seite in einem sichtbaren Chrome |
| Bestätigungsmail | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** nach dem Absenden; Link `…/accounts/confirm-email/<key>/` → landet auf `/app/` |
| `POST /accounts/login/` (bestätigtes Konto) | Session hergestellt (das folgende `/app/`-GET antwortet trotzdem mit **403** — harmlos) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, `alv2_…`-Schlüssel (48 Zeichen) direkt zurückgegeben |
| `POST /v1/chat/completions` | **200** mit `content:"OK"` bei allen **10** Schlüsseln (`aion-3.0-mini` und `aion-3.5`) |
| Login mit unbestätigtem Konto | **405** bei `/accounts/confirm-email/` — die Verifizierung ist wirklich verpflichtend |
| geteiltes temp.tf-Postfach, das bereits registriert ist | Registrierungsmail `"[Aion Labs] Account Already Exists"` mit einem Passwort-Reset-Link — das Tool wechselt zu einer frischen Adresse |

> **Qualitätshürden.** Jeder Schlüssel hier hat einen Live-`chat-200` bestanden, bevor er in `keys.txt`
> geschrieben wurde (tote Schlüssel werden nie ausgeliefert). Router-Kombinationen folgen derselben Regel
> auf Modellebene: ein Eintrag wird **nur hinzugefügt, wenn das Modell `chat-200` antwortet und Tools
> aufrufen kann** — ein Modell ohne Tool-Unterstützung, ein toter Schlüssel oder ein toter Provider wird
> verworfen statt hinzugefügt. Führe den Verifizierungsschritt jederzeit erneut aus; Fehler werden
> gemeldet, nie versteckt.

## 🧭 So funktioniert es

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Postfach | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | Plus-Alias auf einem echten Microsoft-Postfach, kein Captcha, `POST /api/check` liest es als JSON |
| Vorfilter | `POST /api/check` | ein Postfach, das bereits Aion-Mail trägt, ist upstream registriert — vor dem Verbrauch einer Registrierung wechseln |
| Registrierung | Chrome (CDP) auf `/accounts/signup/` | füllt E-Mail + Passwort ×2 + Bedingungen aus, wartet auf das eigene Turnstile-Token der Seite (klickt das Widget nur, wenn es hängt) |
| Bestätigung | Mail-Link in derselben Browser-Session geöffnet | muss auf `/app/` landen; `"Account Already Exists"` → wechseln |
| Schlüssel | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | reines HTTP, kein Browser: csrf von der Seite, Schlüssel aus der Antwort |
| Hürde | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **oder** `reasoning` = lebend; erst dann `keys.txt` |

Chrome wird pro Konto mit `--proxy-server` = dem Exit dieses Kontos gestartet, in einem Wegwerf-Profil, und geschlossen, sobald das Konto bestätigt ist — so leckt keine Session zwischen Konten und der gesamte Durchlauf bleibt auf dem Pool.

## ⚙️ CLI-Optionen

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

| Env | Standard | Bedeutung |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | Exit-Pool, eines pro Zeile (gleich wie `--pool`); fehlt = direkt |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | Modell, das für die Live-Hürde verwendet wird |
| `CHROME_PATH` | automatisch erkannt | Chrome/Chromium-Binary für den Registrierungsschritt |

## 🛰️ Hinter einem Proxy

**Optional — bei Skalierung empfohlen.** Jede Anfrage geht durch einen Exit aus deiner Liste, und der Browser ebenfalls (Chrome erhält diesen Exit als `--proxy-server`).

- **Mit einem Pool:** `--pool proxies.txt` (oder `AIONLABS_PROXIES`). Ein Exit wird pro Konto festgelegt, sodass Registrierung, Bestätigung, Schlüsselerzeugung und die Hürde alle von derselben Adresse ausgehen — das Panel sieht nie eine gemischte Spur. Ein toter Exit lässt diesen Versuch scheitern und der nächste Wechsel nimmt den nächsten Exit.
- **Fail-closed:** ein expliziter `--pool`, der fehlt oder keine verwendbare Exit-Zeile hat, ist ein **fataler Fehler**, niemals ein stiller direkter Durchlauf. Die Env-Variable (die der Launcher setzt) warnt und fällt stattdessen auf direkt zurück.
- **Ohne einen Pool:** die CLI gibt `running WITHOUT a proxy (direct)` aus und funktioniert genauso — nur der Ort, von dem die Pakete ausgehen, ändert sich.
- `socks5://`, `socks5h://`, `http://`, `https://` und bloße `host:port`-Zeilen werden akzeptiert; SOCKS5-mit-Auth-Zeilen werden verworfen, weil Chrome sich bei ihnen nicht authentifizieren kann (HTTP-Proxy-Auth wird über die Fetch-Domain behandelt).
- Die Exit-Qualität ist wichtiger als die Exit-Anzahl: öffentliche Listen verrotten innerhalb von Stunden. `--screen` testet jede Zeile gegen die Registrierungsseite **und** die API vor einem echten Durchlauf.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | ein live-verifizierter Schlüssel pro Zeile (`alv2_…`, 48 Zeichen) — von Git ignoriert |
| `accounts.jsonl` | Adresse / Passwort / Schlüsselname / Schlüssel / Exit / Ergebnis der Hürde pro Konto — von Git ignoriert |
| `proxies.txt` | deine Exits, eines pro Zeile — von Git ignoriert |
| `out/` | Ausführungsprotokoll (`aionlabs-cli-<date>.log`) und Screenshots fehlgeschlagener Captcha-Schritte — von Git ignoriert |

## 🔌 Verbinden mit 9Router

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Standardeinstellungen: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Modelle werden als `aionlabs/<model id>` bereitgestellt.

## 🔌 Verbinden mit OmniRoute

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-omniroute.js --api-key alv2_…
```

Standardeinstellungen: `--omniroute-prefix aionlabs`, `--omniroute-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Modelle werden als `aionlabs/<model id>` bereitgestellt.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Was der Anbieter gibt | **$0 Free-Tier**, keine Karte: ein tägliches Credit-Kontingent, 15 RPM, 20k Tokens/Tag pro Konto |
| 🔑 Was ein Schlüssel dir bringt | ein `alv2_…`-Schlüssel auf seinem eigenen Konto, chat-verifiziert bei `aion-labs/aion-3.0-mini` |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.aionlabs.ai/v1/chat/completions` (6 Modell-IDs) |
| 🔒 Deine Daten | nur `aionlabs.ai`, `api.aionlabs.ai`, dein Postfach-Backend und dein eigener Proxy werden kontaktiert; Schlüssel bleiben auf deinem Rechner |

## ⚠️ Bedingungen und Kontorisiko

Dieses Tool automatisiert einen Registrierungsablauf, also liegt die Verantwortung für das, was es tut, bei **dir**: das Automatisieren der Registrierung eines Anbieters kann gegen dessen Nutzungsbedingungen verstoßen, und das Free-Tier, das ein Konto dir gewährt, kann der Anbieter jederzeit drosseln, ändern oder zurückfordern — pro Konto und pro IP. Führe es nur für Konten aus, die du erstellen darfst, halte deine Proxy-Liste für dich, und behandle diese Schlüssel nicht als Produktionskapazität. Nichts hier ist eine Lizenz, die Regeln eines Anbieters zu umgehen.

## 🐞 Issues

Wenn Aion Labs sein Registrierungsformular, seinen Turnstile-Sitekey, die Bestätigungsmail oder die api-keys-Route ändert, stoppt das Tool an diesem Schritt und meldet die Ablehnung wörtlich (den genauen Status, die Seite, auf der es gelandet ist, oder den Mail-Betreff, den es gesehen hat). **[Öffne ein Issue](../../issues)** mit dem Befehl und der exakten Ausgabe.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>
