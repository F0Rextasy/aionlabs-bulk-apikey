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

**Créez en masse des comptes Aion Labs avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-6-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Pourquoi cet outil existe

Aion Labs (`aionlabs.ai`) est un panneau Django + **django-allauth** derrière Cloudflare, et son inscription comporte deux verrous : un véritable widget **Cloudflare Turnstile** (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, champ de jeton `cf-turnstile-response`) et une **vérification d'e-mail obligatoire** — se connecter avec un compte non confirmé renvoie vers `/accounts/confirm-email/` avec un **405**, il n'y a donc aucun raccourci pour éviter de lire la boîte de réception. Tout ce qui suit l'e-mail est du HTTP simple : `POST /accounts/login/` ne demande pas de captcha, le cookie de session ouvre `/app/api-keys/`, et `POST /app/api-keys/create/` renvoie la clé `alv2_…` directement. C'est tout le rail que cet outil automatise.

Le propre test de cette voie a donné des **clés vérifiées** (`content:"OK"`, `finish_reason:stop`) à la fois sur `aion-labs/aion-3.0-mini` et `aion-labs/aion-3.5` ; la passe à l'échelle a produit 6 clés en 8 tentatives d'inscription (~56 s par clé) via une seule session de navigateur et une sortie épinglée.

## 🎁 Offre gratuite — ce que vous obtenez

| Quoi | Valeur |
| --- | --- |
| Formule à l'inscription | **Gratuite** — `$0`, **sans carte** (`/pricing` : « a daily credit allowance to try agent jobs, the API, and browser chat ») |
| Requêtes par minute | **15** |
| Jetons par minute | **20 000** |
| Jetons par jour | **20 000** — le plafond journalier strict de l'offre gratuite |
| Formules supérieures | uniquement par recharge de crédit à vie ($1 … $1 000) ; une formule n'est jamais rétrogradée |
| Unité de facturation | **par compte** — le quota est rattaché au compte, c'est pourquoi cet outil crée un compte par clé |
| Verrou e-mail | **obligatoire** (allauth) ; connexion non confirmée → `405` sur `/accounts/confirm-email/` |
| Téléphone / carte | aucun |

Avec N clés, vous détenez N comptes, soit **N × 20 000 jetons/jour** et 15 RPM chacun. Le compteur journalier se réinitialise par compte, pas par IP.

> 💡 L'offre gratuite est définie par Aion Labs et peut changer. Vérifiez les chiffres en direct sur [www.aionlabs.ai](https://www.aionlabs.ai) — et laissez le propre verrou de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 6 au complet

`GET /v1/models` répond **200 sans clé** et liste **6 ids** ; un appel de chat sans clé répond `401 {"detail":"Authentication credentials were not provided."}`.

| ID du modèle | Contexte | Entrée / 1M | Sortie / 1M | Vérifié |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **vérifié** |
| `aion-labs/aion-3.5` | 256K | — | — | **vérifié** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 sur les clés de la voie |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | listé |
| `aion-labs/aion-3.5-mini` | 256K | — | — | listé |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | listé (roleplay, 8B) |

> ⚠️ **Deux particularités que le verrou gère déjà.** Le champ de raisonnement est **`reasoning`**, pas `reasoning_content`, et les modèles mini/3.5 réfléchissent avant de répondre : avec un `max_tokens` inférieur à ~512, la réponse revient avec `content:""` et `finish_reason:"length"`. Le CLI demande **512** par défaut (`--max-tokens`) ; un budget plus faible fait passer une clé vérifiée pour morte.

## 🧪 Comment utiliser l'API

URL de base **`https://api.aionlabs.ai/v1`** — compatible OpenAI, donc n'importe quel SDK ou client OpenAI pointé dessus fonctionne.

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

Une clé vérifiée répond en **1,5–2,6 s** pour une complétion de 60–100 jetons. Le panneau ne renvoie aucun en-tête de limite de débit (`x-request-id` uniquement), donc les plafonds de 15 RPM / 20k TPD sont appliqués silencieusement.

## 🛠 Démarrage rapide

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings

# or: node src/cli.js --count 10 --pool proxies.txt
```

L'étape navigateur nécessite **Chrome ou Chromium** sur la machine (`--browser <exe>` ou `CHROME_PATH` s'il n'est pas à l'emplacement par défaut). Une clé n'est écrite dans `keys.txt` **qu'après** que `/v1/chat/completions` ait répondu 200 avec du contenu réel ; `accounts.jsonl` conserve l'adresse, le mot de passe, le nom de la clé et le résultat du verrou.

Un compte par clé : `--count N` signifie en réalité « N comptes gratuits ». L'outil bascule automatiquement lorsqu'une boîte temp.tf du pool s'avère déjà connue du panneau (`[Aion Labs] Account Already Exists`) ou lorsque le widget Turnstile se bloque.

### 🖱️ Le lanceur

Le lanceur demande la liste de proxys (facultative — sans elle, le CLI s'exécute en direct), le nombre et le modèle, les mémorise dans `launcher.config.json`, et exécute le CLI : **mint**, **verify**, **screen** (tester les sorties contre le verrou d'inscription), **settings**, **help** et **Connect to 9Router**.

## ✅ Vérifié fonctionnel — chaque clé est testée

> **Contrôles qualité.** Chaque clé ici a passé un `chat-200` en direct avant d'être écrite dans `keys.txt`
> (les clés mortes ne sont jamais livrées). Les combinaisons de routeur suivent la même règle au niveau du modèle : une entrée n'est
> ajoutée **que si le modèle répond `chat-200` et peut appeler des outils** — un modèle sans support des outils,
> une clé morte ou un fournisseur mort est écarté au lieu d'être ajouté. Fonctionne avec **9Router et OmniRoute**.

| Contrôle | Résultat |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, sans clé, **6 ids de modèles** |
| `POST /v1/chat/completions` sans clé | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, formulaire allauth (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| soumission de l'inscription | **200 → `/accounts/confirm-email/`**, jeton Turnstile de 730 caractères, résolu par le widget de la page dans un Chrome visible |
| e-mail de confirmation | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** après la soumission ; lien `…/accounts/confirm-email/<key>/` → arrive sur `/app/` |
| `POST /accounts/login/` (compte confirmé) | session établie (le GET `/app/` suivant répond **403** malgré tout — sans conséquence) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, clé `alv2_…` (48 caractères) renvoyée directement |
| `POST /v1/chat/completions` | **200** avec `content:"OK"` sur les **10** clés (`aion-3.0-mini` et `aion-3.5`) |
| connexion avec un compte non confirmé | **405** sur `/accounts/confirm-email/` — la vérification est bel et bien obligatoire |
| boîte temp.tf partagée déjà enregistrée | l'inscription envoie `"[Aion Labs] Account Already Exists"` avec un lien de réinitialisation de mot de passe — l'outil bascule vers une adresse neuve |

## 🧭 Comment ça marche

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Étape | Appel | Remarques |
| --- | --- | --- |
| boîte mail | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | alias plus sur une vraie boîte Microsoft, sans captcha, `POST /api/check` la lit en JSON |
| pré-filtre | `POST /api/check` | une boîte qui contient déjà du courrier Aion est enregistrée en amont — basculer avant de dépenser une inscription |
| inscription | Chrome (CDP) sur `/accounts/signup/` | remplit e-mail + mot de passe ×2 + conditions, attend le jeton Turnstile de la page elle-même (ne clique le widget que s'il se bloque) |
| confirmation | lien de l'e-mail ouvert dans la même session de navigateur | doit arriver sur `/app/` ; `"Account Already Exists"` → basculer |
| clé | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | HTTP simple, sans navigateur : csrf depuis la page, clé depuis la réponse |
| verrou | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **ou** `reasoning` = en vie ; seulement alors `keys.txt` |

Chrome est lancé par compte avec `--proxy-server` = la sortie de ce compte, dans un profil jetable, et fermé dès que le compte est confirmé — ainsi aucune session ne fuit entre les comptes et toute l'exécution reste sur le pool.

## ⚙️ Options du CLI

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

| Env | Défaut | Signification |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | pool de sorties, une par ligne (identique à `--pool`) ; absent = direct |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | modèle utilisé pour le verrou en direct |
| `CHROME_PATH` | auto-détecté | binaire Chrome/Chromium pour l'étape d'inscription |

## 🛰️ Derrière un proxy

**Facultatif — recommandé à l'échelle.** Chaque requête passe par une sortie de votre liste, et le navigateur aussi (Chrome reçoit cette sortie comme `--proxy-server`).

- **Avec un pool :** `--pool proxies.txt` (ou `AIONLABS_PROXIES`). Une sortie est épinglée par compte, ainsi l'inscription, la confirmation, la création de clé et le verrou partent tous de la même adresse — le panneau ne voit jamais une trace mixte. Une sortie morte fait échouer cette tentative et le basculement suivant prend la sortie suivante.
- **Échec fermé :** un `--pool` explicite manquant ou sans ligne de sortie utilisable est une **erreur fatale**, jamais une exécution directe silencieuse. La variable d'environnement (que le lanceur définit) avertit et retombe en direct à la place.
- **Sans pool :** le CLI affiche `running WITHOUT a proxy (direct)` et fonctionne de la même manière — seul le point de départ des paquets change.
- Les lignes `socks5://`, `socks5h://`, `http://`, `https://` et `host:port` nues sont acceptées ; les lignes SOCKS5 avec authentification sont écartées car Chrome ne peut pas s'y authentifier (l'authentification de proxy HTTP est gérée via le domaine Fetch).
- La qualité des sorties compte plus que leur nombre : les listes publiques pourrissent en quelques heures. `--screen` teste chaque ligne contre la page d'inscription **et** l'API avant une exécution réelle.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | une clé vérifiée en direct par ligne (`alv2_…`, 48 caractères) — ignoré par git |
| `accounts.jsonl` | adresse / mot de passe / nom de clé / clé / sortie / résultat du verrou par compte — ignoré par git |
| `proxies.txt` | vos sorties, une par ligne — ignoré par git |
| `out/` | journal d'exécution (`aionlabs-cli-<date>.log`) et captures d'écran des étapes captcha échouées — ignoré par git |

## 🔌 Connexion à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI :

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456

```

## 🔌 Connexion à OmniRoute

[OmniRoute](https://omniroute.online) est un routeur auto-hébergé compatible OpenAI :

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Valeurs par défaut : `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Les modèles sont servis sous `aionlabs/<model id>`.

## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Ce que le fournisseur offre | **offre gratuite à $0**, sans carte : une allocation de crédit quotidienne, 15 RPM, 20k jetons/jour par compte |
| 🔑 Ce qu'une clé vous apporte | une clé `alv2_…` sur son propre compte, vérifiée par chat sur `aion-labs/aion-3.0-mini` |
| 🌐 Forme de l'API | compatible OpenAI : `POST https://api.aionlabs.ai/v1/chat/completions` (6 ids de modèles) |
| 🔒 Vos données | seuls `aionlabs.ai`, `api.aionlabs.ai`, votre backend de boîte mail et votre propre proxy sont contactés ; les clés restent sur votre machine |

## 🐞 Problèmes

Si Aion Labs modifie son formulaire d'inscription, son sitekey Turnstile, l'e-mail de confirmation ou la route des clés API, l'outil s'arrête à cette étape et rapporte le refus mot pour mot (le statut exact, la page sur laquelle il a atterri, ou l'objet de l'e-mail qu'il a vu). **[Ouvrez un ticket](../../issues)** avec la commande et la sortie exacte.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>