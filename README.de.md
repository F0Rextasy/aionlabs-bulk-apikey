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

**Aion-Labs-Konten in großen Mengen erstellen mit automatisch generierten API-Schlüsseln — OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-6-of-them) · [🧪 Die API nutzen](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Aion Labs (`aionlabs.ai`) ist ein Django- + **django-allauth**-Panel hinter Cloudflare, und die Registrierung hat zwei harte Hürden: ein echtes **Cloudflare-Turnstile**-Widget (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, Token-Feld `cf-turnstile-response`) und eine **verpflichtende E-Mail-Verifizierung** — eine Anmeldung mit einem unbestätigten Konto wird mit einem **405** auf `/accounts/confirm-email/` umgeleitet, es gibt also keinen Weg daran vorbei, das Postfach zu lesen. Alles nach der E-Mail ist reines HTTP: `POST /accounts/login/` verlangt kein Captcha, das Session-Cookie öffnet `/app/api-keys/`, und `POST /app/api-keys/create/` liefert den `alv2_…`-Schlüssel direkt in der Antwort. Genau diesen Ablauf automatisiert dieses Tool.

Der eigene Durchlauf dieser Spur ergab: **jedes Konto erzeugte seinen eigenen Schlüssel, jeder einzelne wurde erst behalten, nachdem ein Live-Chat mit 200** (`content:"OK"`, `finish_reason:stop`) sowohl bei `aion-labs/aion-3.0-mini` als auch bei `aion-labs/aion-3.5` geantwortet hatte; der Skalierungslauf erzeugte Schlüssel in 8 Registrierungsversuchen (~56 s pro Schlüssel) über eine Browser-Session und einen festen Exit.

## 🎁 Free-Tier — wie viel du bekommst

| Was | Wert |
| --- | --- |
| Tarif bei Registrierung | **Free** — `$0`, **keine Karte** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Anfragen pro Minute | **15** |
| Tokens pro Minute | **20.000** |
| Tokens pro Tag | **20.000** — die harte Tagesobergrenze des Free-Tiers |
| Höhere Tarife | nur durch lebenslanges Credit-Aufladen ($1 … $1.000); ein Tarif wird nie herabgestuft |
| Abrechnungseinheit | **pro Konto** — das Kontingent hängt am Konto, weshalb dieses Tool ein Konto pro Schlüssel erstellt |
| E-Mail-Hürde | **verpflichtend** (allauth); unbestätigte Anmeldung → `405` bei `/accounts/confirm-email/` |
| Telefon / Karte | keines von beiden |

Mit N Schlüsseln hältst du N Konten, also **N × 20.000 Tokens/Tag** und jeweils 15 RPM. Der Tageszähler wird pro Konto zurückgesetzt, nicht pro IP.

> 💡 Der Free-Tier wird von Aion Labs festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [www.aionlabs.ai](https://www.aionlabs.ai) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 6 davon

`GET /v1/models` antwortet mit **200 ohne Schlüssel** und listet **6 IDs** auf; ein Chat-Aufruf ohne Schlüssel antwortet mit `401 {"detail":"Authentication credentials were not provided."}`.

| Modell-ID | Kontext | Input / 1M | Output / 1M | Verifiziert |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **jeder Schlüssel, Chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **jeder Schlüssel, Chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | Chat-200 bei den Spur-Schlüsseln |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | gelistet |
| `aion-labs/aion-3.5-mini` | 256K | — | — | gelistet |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | gelistet (Roleplay, 8B) |

> ⚠️ **Zwei Eigenheiten, die das Gate bereits berücksichtigt.** Das Reasoning-Feld heißt **`reasoning`**, nicht `reasoning_content`, und die Mini-/3.5-Modelle denken, bevor sie antworten: mit `max_tokens` unter ~512 kommt die Antwort als `content:""` mit `finish_reason:"length"` zurück. Die CLI fragt standardmäßig **512** an (`--max-tokens`); ein kleineres Budget lässt einen Live-Schlüssel tot aussehen.

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

Ein Live-Schlüssel antwortet in **1,5–2,6 s** für eine 60–100-Token-Vervollständigung. Das Panel liefert keine Rate-Limit-Header (nur `x-request-id`), daher werden die Obergrenzen von 15 RPM / 20k TPD still durchgesetzt.

## 🛠 Schnellstart

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings

# or: node src/cli.js --count 10 --pool proxies.txt
```

Der Browser-Schritt benötigt **Chrome oder Chromium** auf dem Rechner (`--browser <exe>` oder `CHROME_PATH`, falls es nicht am Standardort liegt). Ein Schlüssel wird **nur** dann in `keys.txt` geschrieben, wenn `/v1/chat/completions` mit 200 und echtem Inhalt antwortet; `accounts.jsonl` speichert Adresse, Passwort, Schlüsselname und das Gate-Ergebnis.

Ein Konto pro Schlüssel: `--count N` bedeutet eigentlich "N kostenlose Konten". Das Tool wechselt automatisch, wenn ein temp.tf-Pool-Postfach dem Panel bereits bekannt ist (`[Aion Labs] Account Already Exists`) oder wenn das Turnstile-Widget hängt.

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste (optional — ohne eine läuft die CLI direkt), der Anzahl und dem Modell, merkt sie sich in `launcher.config.json` und führt die CLI aus: **mint**, **verify**, **screen** (die Exits gegen das Registrierungs-Gate testen), **settings**, **help** und **Connect to 9Router**.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, ohne Schlüssel, **6 Modell-IDs** |
| `POST /v1/chat/completions` ohne Schlüssel | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, allauth-Formular (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| Registrierung absenden | **200 → `/accounts/confirm-email/`**, Turnstile-Token 730 Zeichen, gelöst durch das eigene Widget der Seite in einem sichtbaren Chrome |
| Bestätigungsmail | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** nach dem Absenden; Link `…/accounts/confirm-email/<key>/` → landet auf `/app/` |
| `POST /accounts/login/` (bestätigtes Konto) | Session hergestellt (der nachfolgende `/app/`-GET antwortet trotzdem mit **403** — harmlos) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, `alv2_…`-Schlüssel (48 Zeichen) direkt in der Antwort |
| `POST /v1/chat/completions` | **200** mit `content:"OK"` bei allen **10** Schlüsseln (`aion-3.0-mini` und `aion-3.5`) |
| Anmeldung mit unbestätigtem Konto | **405** bei `/accounts/confirm-email/` — die Verifizierung ist wirklich verpflichtend |
| geteiltes temp.tf-Postfach, das bereits registriert ist | Registrierungsmail `"[Aion Labs] Account Already Exists"` mit einem Passwort-Reset-Link — das Tool wechselt zu einer frischen Adresse |

> **Qualitäts-Gates.** Jeder Schlüssel hier hat einen Live-`chat-200` bestanden, bevor er in `keys.txt` geschrieben wurde
> (tote Schlüssel werden nie ausgeliefert). Router-Kombinationen folgen derselben Regel auf Modellebene: ein Eintrag wird
> **nur hinzugefügt, wenn das Modell `chat-200` antwortet und Tools aufrufen kann** — ein Modell ohne Tool-Unterstützung,
> ein toter Schlüssel oder ein toter Anbieter wird verworfen statt hinzugefügt. Führe den Verifizierungsschritt jederzeit erneut aus;
> Fehler werden gemeldet, nie versteckt.

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
| Vorfilter | `POST /api/check` | ein Postfach, das bereits Aion-Mail enthält, ist upstream registriert — vor dem Verbrauch einer Registrierung wechseln |
| Registrierung | Chrome (CDP) auf `/accounts/signup/` | füllt E-Mail + Passwort ×2 + AGB, wartet auf das eigene Turnstile-Token der Seite (klickt das Widget nur, wenn es hängt) |
| Bestätigung | Mail-Link in derselben Browser-Session geöffnet | muss auf `/app/` landen; `"Account Already Exists"` → wechseln |
| Schlüssel | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | reines HTTP, kein Browser: csrf von der Seite, Schlüssel aus der Antwort |
| Gate | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **oder** `reasoning` = live; erst dann `keys.txt` |

Chrome wird pro Konto mit `--proxy-server` = dem Exit dieses Kontos gestartet, in einem Wegwerf-Profil, und geschlossen, sobald das Konto bestätigt ist — so gelangt keine Session zwischen Konten und der gesamte Lauf bleibt auf dem Pool.

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
| `AIONLABS_PROXIES` | — | Exit-Pool, einer pro Zeile (wie `--pool`); fehlt = direkt |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | Modell für das Live-Gate |
| `CHROME_PATH` | automatisch erkannt | Chrome/Chromium-Binary für den Registrierungsschritt |

## 🛰️ Hinter einem Proxy

**Optional — bei Skalierung empfohlen.** Jede Anfrage geht durch einen Exit aus deiner Liste, und der Browser ebenso (Chrome erhält diesen Exit als `--proxy-server`).

- **Mit einem Pool:** `--pool proxies.txt` (oder `AIONLABS_PROXIES`). Pro Konto wird ein Exit festgelegt, sodass Registrierung, Bestätigung, Schlüsselerstellung und Gate alle von derselben Adresse ausgehen — das Panel sieht nie eine gemischte Spur. Ein toter Exit lässt diesen Versuch scheitern, und der nächste Wechsel nimmt den nächsten Exit.
- **Fail-closed:** ein explizites `--pool`, das fehlt oder keine nutzbare Exit-Zeile hat, ist ein **fataler Fehler**, niemals ein stiller direkter Lauf. Die Env-Variable (die der Launcher setzt) warnt und fällt stattdessen auf direkt zurück.
- **Ohne Pool:** die CLI gibt `running WITHOUT a proxy (direct)` aus und funktioniert genauso — nur der Ort, von dem die Pakete ausgehen, ändert sich.
- `socks5://`, `socks5h://`, `http://`, `https://` und bloße `host:port`-Zeilen werden akzeptiert; SOCKS5-mit-Auth-Zeilen werden verworfen, weil Chrome sich bei ihnen nicht authentifizieren kann (HTTP-Proxy-Auth wird über die Fetch-Domain abgewickelt).
- Die Exit-Qualität zählt mehr als die Exit-Anzahl: öffentliche Listen verrotten innerhalb von Stunden. `--screen` testet jede Zeile gegen die Registrierungsseite **und** die API vor einem echten Lauf.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | ein live-verifizierter Schlüssel pro Zeile (`alv2_…`, 48 Zeichen) — von git ignoriert |
| `accounts.jsonl` | Adresse / Passwort / Schlüsselname / Schlüssel / Exit / Gate-Ergebnis pro Konto — von git ignoriert |
| `proxies.txt` | deine Exits, einer pro Zeile — von git ignoriert |
| `out/` | Lauf-Log (`aionlabs-cli-<date>.log`) und Screenshots fehlgeschlagener Captcha-Schritte — von git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Standardwerte: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Modelle werden als `aionlabs/<model id>` bereitgestellt.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-omniroute.js --api-key alv2_…
```

Standardwerte: `--omniroute-prefix aionlabs`, `--omniroute-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Modelle werden als `aionlabs/<model id>` bereitgestellt.

## 🔑 Was ein Schlüssel dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Was der Anbieter gibt | **$0 Free-Tier**, keine Karte: ein tägliches Credit-Kontingent, 15 RPM, 20k Tokens/Tag pro Konto |
| 🔑 Was ein Schlüssel dir bringt | ein `alv2_…`-Schlüssel auf seinem eigenen Konto, chat-verifiziert bei `aion-labs/aion-3.0-mini` |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://api.aionlabs.ai/v1/chat/completions` (6 Modell-IDs) |
| 🔒 Deine Daten | nur `aionlabs.ai`, `api.aionlabs.ai`, dein Postfach-Backend und dein eigener Proxy werden kontaktiert; Schlüssel bleiben auf deinem Rechner |

## 🐞 Issues

Wenn Aion Labs sein Registrierungsformular, seinen Turnstile-Sitekey, die Bestätigungsmail oder die api-keys-Route ändert, stoppt das Tool an diesem Schritt und meldet die Ablehnung wörtlich (den genauen Status, die Seite, auf der es gelandet ist, oder den Mail-Betreff, den es gesehen hat). **[Öffne ein Issue](../../issues)** mit dem Befehl und der genauen Ausgabe.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>