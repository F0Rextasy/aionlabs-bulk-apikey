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

**Crea cuentas de Aion Labs en masa con claves de API generadas automáticamente — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[⚡ Un comando](#-one-command) · [🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-6-of-them) · [🧪 Usa la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [⚠️ Términos](#️-terms-and-account-risk) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por qué existe esto

Aion Labs (`aionlabs.ai`) es un panel de Django + **django-allauth** detrás de Cloudflare, y su registro tiene dos barreras duras: un widget real de **Cloudflare Turnstile** (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, campo de token `cf-turnstile-response`) y **verificación de correo electrónico obligatoria** — iniciar sesión con una cuenta sin confirmar te redirige a `/accounts/confirm-email/` con un **405**, así que no hay atajo para evitar leer la bandeja de entrada. Todo lo que viene después del correo es HTTP simple: `POST /accounts/login/` no pide captcha, la cookie de sesión abre `/app/api-keys/`, y `POST /app/api-keys/create/` devuelve la clave `alv2_…` en línea. Esa es toda la vía que esta herramienta automatiza.

La propia ejecución de esta vía hizo que **cada cuenta acuñara su propia clave, y cada una se conservó solo tras un chat en vivo con 200** (`content:"OK"`, `finish_reason:stop`) tanto en `aion-labs/aion-3.0-mini` como en `aion-labs/aion-3.5`; la pasada a escala acuñó claves en 8 intentos de registro (~56 s por clave) a través de una sola sesión de navegador y una salida fijada.

## 🎁 Nivel gratuito — cuánto obtienes

| Qué | Valor |
| --- | --- |
| Plan al registrarte | **Gratuito** — `$0`, **sin tarjeta** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Solicitudes por minuto | **15** |
| Tokens por minuto | **20,000** |
| Tokens por día | **20,000** — el tope diario estricto del nivel gratuito |
| Niveles superiores | solo mediante recarga de crédito de por vida ($1 … $1,000); un nivel nunca se reduce |
| Unidad de facturación | **por cuenta** — la cuota vive en la cuenta, por eso esta herramienta crea una cuenta por clave |
| Barrera de correo | **obligatoria** (allauth); inicio de sesión sin confirmar → `405` en `/accounts/confirm-email/` |
| Teléfono / tarjeta | ninguno |

Con N claves tienes N cuentas, es decir, **N × 20,000 tokens/día** y 15 RPM cada una. El contador diario se reinicia por cuenta, no por IP.

> 💡 El nivel gratuito lo define Aion Labs y puede cambiar. Consulta los números en vivo en [www.aionlabs.ai](https://www.aionlabs.ai) — y deja que la propia verificación de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 6

`GET /v1/models` responde **200 sin clave** y lista **6 ids**; una llamada de chat sin clave responde `401 {"detail":"Authentication credentials were not provided."}`.

| ID del modelo | Contexto | Entrada / 1M | Salida / 1M | Verificado |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **cada clave, chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **cada clave, chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 en las claves de la vía |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | listado |
| `aion-labs/aion-3.5-mini` | 256K | — | — | listado |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | listado (roleplay, 8B) |

> ⚠️ **Dos peculiaridades que la verificación ya maneja.** El campo de razonamiento es **`reasoning`**, no `reasoning_content`, y los modelos mini/3.5 piensan antes de responder: con `max_tokens` por debajo de ~512 la respuesta vuelve con `content:""` y `finish_reason:"length"`. El CLI pide **512** por defecto (`--max-tokens`); un presupuesto menor hace que una clave viva parezca muerta.

## 🧪 Cómo usar la API

URL base **`https://api.aionlabs.ai/v1`** — compatible con OpenAI, así que cualquier SDK o cliente de OpenAI apuntado a ella funciona.

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

Una clave viva responde en **1.5–2.6 s** para una completación de 60–100 tokens. El panel no devuelve cabeceras de límite de tasa (solo `x-request-id`), así que los topes de 15 RPM / 20k TPD se aplican en silencio.

## ⚡ Un comando

```bash
node src/cli.js --count N        # N accounts → N keys, one command, nothing to answer
```

El widget de Cloudflare Turnstile lo resuelve el motor de navegador integrado (`src/solver.js`) dentro de un Chrome real en la página que lo contiene — `--auto` es el valor **predeterminado** y permanece activado, así que no hay captcha que pegar ni pregunta de navegador en el camino. Indicar `--dry` imprime el plan resuelto (recuento, modelo, ruta, solucionador, ruta de Chrome) y sale con 0 sin escribir un archivo ni abrir un socket:

```bash
node src/cli.js --count N --dry
```

`npm start` (o `node src/launcher.js`) hace lo mismo desde un menú: elige **1) Mint keys**, responde "How many keys?" (Enter = 10) y ejecuta `node src/cli.js --auto --count N`. `proxies.txt` se toma automáticamente cuando existe; de lo contrario, la ejecución es directa.

## 🛠 Inicio rápido

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

El paso del navegador necesita **Chrome o Chromium** en la máquina (`--browser <exe>` o `CHROME_PATH` si no está en la ubicación predeterminada). Una clave se escribe en `keys.txt` **solo** después de que `/v1/chat/completions` responda 200 con contenido real; `accounts.jsonl` conserva la dirección, la contraseña, el nombre de la clave y el resultado de la verificación.

Una cuenta por clave: `--count N` en realidad significa "N cuentas gratuitas". La herramienta rota automáticamente cuando un buzón del pool temp.tf resulta ser conocido por el panel (`[Aion Labs] Account Already Exists`) o cuando el widget de Turnstile se atasca.

### 🖱️ El lanzador

El lanzador pide la lista de proxies (opcional — sin una, el CLI se ejecuta directo), el recuento y el modelo, los recuerda en `launcher.config.json`, y ejecuta el CLI: **mint**, **verify**, **screen** (prueba las salidas contra la barrera de registro), **settings**, **help** y **Connect to 9Router**.

## ✅ Verificado y funcionando — cada clave se prueba

| Comprobación | Resultado |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, sin clave, **6 ids de modelo** |
| `POST /v1/chat/completions` sin clave | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, formulario de allauth (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| envío del registro | **200 → `/accounts/confirm-email/`**, token de Turnstile de 730 caracteres, resuelto por el propio widget de la página en un Chrome visible |
| correo de confirmación | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** tras el envío; enlace `…/accounts/confirm-email/<key>/` → aterriza en `/app/` |
| `POST /accounts/login/` (cuenta confirmada) | sesión establecida (el GET posterior a `/app/` responde **403** aun así — inofensivo) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, clave `alv2_…` (48 caracteres) devuelta en línea |
| `POST /v1/chat/completions` | **200** con `content:"OK"` en las **10** claves (`aion-3.0-mini` y `aion-3.5`) |
| inicio de sesión con cuenta sin confirmar | **405** en `/accounts/confirm-email/` — la verificación realmente es obligatoria |
| buzón compartido temp.tf ya registrado | el registro envía `"[Aion Labs] Account Already Exists"` con un enlace de restablecimiento de contraseña — la herramienta rota a una dirección nueva |

> **Barreras de calidad.** Cada clave aquí pasó un `chat-200` en vivo antes de escribirse en `keys.txt`
> (las claves muertas nunca se entregan). Las combinaciones del router siguen la misma regla a nivel de modelo: una entrada se
> añade **solo si el modelo responde `chat-200` y puede llamar herramientas** — un modelo sin soporte de herramientas,
> una clave muerta o un proveedor muerto se descarta en lugar de añadirse. Vuelve a ejecutar el paso de verificación cuando quieras;
> los fallos se reportan, nunca se ocultan.

## 🧭 Cómo funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| buzón | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | alias plus sobre un buzón real de Microsoft, sin captcha, `POST /api/check` lo lee como JSON |
| prefiltro | `POST /api/check` | un buzón que ya lleva correo de Aion está registrado en origen — rota antes de gastar un registro |
| registro | Chrome (CDP) en `/accounts/signup/` | rellena correo + contraseña ×2 + términos, espera el propio token de Turnstile de la página (hace clic en el widget solo si se atasca) |
| confirmación | enlace del correo abierto en la misma sesión de navegador | debe aterrizar en `/app/`; `"Account Already Exists"` → rota |
| clave | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | HTTP simple, sin navegador: csrf de la página, clave de la respuesta |
| verificación | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **o** `reasoning` = viva; solo entonces `keys.txt` |

Chrome se lanza por cuenta con `--proxy-server` = la salida de esa cuenta, en un perfil desechable, y se cierra en cuanto se confirma la cuenta — así ninguna sesión se filtra entre cuentas y toda la ejecución permanece en el pool.

## ⚙️ Opciones del CLI

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

| Variable de entorno | Predeterminado | Significado |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | pool de salidas, una por línea (igual que `--pool`); ausente = directo |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | modelo usado para la verificación en vivo |
| `CHROME_PATH` | autodetectado | binario de Chrome/Chromium para el paso de registro |

## 🛰️ Detrás de un proxy

**Opcional — recomendado a escala.** Cada solicitud pasa por una salida de tu lista, y el navegador también (Chrome recibe esa salida como `--proxy-server`).

- **Con un pool:** `--pool proxies.txt` (o `AIONLABS_PROXIES`). Se fija una salida por cuenta, así que el registro, la confirmación, la acuñación de la clave y la verificación salen todos desde la misma dirección — el panel nunca ve un rastro mixto. Una salida muerta hace fallar ese intento y la siguiente rotación toma la siguiente salida.
- **Fallo cerrado:** un `--pool` explícito que falta o no tiene ninguna línea de salida utilizable es un **error fatal**, nunca una ejecución directa silenciosa. La variable de entorno (que establece el lanzador) advierte y recurre a directo en su lugar.
- **Sin un pool:** el CLI imprime `running WITHOUT a proxy (direct)` y funciona igual — solo cambia desde dónde salen los paquetes.
- Se aceptan líneas `socks5://`, `socks5h://`, `http://`, `https://` y `host:port` sin esquema; las líneas SOCKS5 con autenticación se descartan porque Chrome no puede autenticarse con ellas (la autenticación de proxy HTTP se maneja a través del dominio Fetch).
- La calidad de la salida importa más que la cantidad de salidas: las listas públicas se pudren en horas. `--screen` prueba cada línea contra la página de registro **y** la API antes de una ejecución real.

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | una clave verificada en vivo por línea (`alv2_…`, 48 caracteres) — ignorado por git |
| `accounts.jsonl` | dirección / contraseña / nombre de la clave / clave / salida / resultado de la verificación por cuenta — ignorado por git |
| `proxies.txt` | tus salidas, una por línea — ignorado por git |
| `out/` | registro de ejecución (`aionlabs-cli-<date>.log`) y capturas de pantalla de pasos de captcha fallidos — ignorado por git |

## 🔌 Conectar con 9Router

[9Router](https://9router.com) es un router autoalojado y compatible con OpenAI:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Predeterminados: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Los modelos se sirven como `aionlabs/<model id>`.

## 🔌 Conectar con OmniRoute

[OmniRoute](https://omniroute.online) es un router autoalojado y compatible con OpenAI:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-omniroute.js --api-key alv2_…
```

Predeterminados: `--omniroute-prefix aionlabs`, `--omniroute-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Los modelos se sirven como `aionlabs/<model id>`.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Qué da el proveedor | **nivel gratuito de $0**, sin tarjeta: una asignación diaria de crédito, 15 RPM, 20k tokens/día por cuenta |
| 🔑 Qué te da una clave | una clave `alv2_…` en su propia cuenta, verificada por chat en `aion-labs/aion-3.0-mini` |
| 🌐 Forma de la API | compatible con OpenAI: `POST https://api.aionlabs.ai/v1/chat/completions` (6 ids de modelo) |
| 🔒 Tus datos | solo se contacta a `aionlabs.ai`, `api.aionlabs.ai`, el backend de tu bandeja de entrada y tu propio proxy; las claves permanecen en tu máquina |

## ⚠️ Términos y riesgo de cuenta

Esta herramienta automatiza un flujo de registro, así que **tú** eres responsable de lo que hace: automatizar el registro de un proveedor puede infringir los términos de servicio de ese proveedor, y el nivel gratuito que una cuenta te otorga es del proveedor, que puede limitarlo, cambiarlo o retirarlo en cualquier momento — por cuenta y por IP. Úsala solo para cuentas que tengas permitido crear, mantén tu lista de proxies como propia y no trates estas claves como capacidad de producción. Nada de esto es una licencia para eludir las reglas de un proveedor.

## 🐞 Problemas

Si Aion Labs cambia su formulario de registro, su sitekey de Turnstile, el correo de confirmación o la ruta de api-keys, la herramienta se detiene en ese paso e informa el rechazo textualmente (el estado exacto, la página en la que aterrizó o el asunto del correo que vio). **[Abre un issue](../../issues)** con el comando y la salida exacta.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>
