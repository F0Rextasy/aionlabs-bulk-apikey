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

**Массовое создание аккаунтов Aion Labs с автоматически сгенерированными API-ключами — вывод, совместимый с OpenAI, + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-6-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Опции](#️-cli-options) · [🛰️ Прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

Aion Labs (`aionlabs.ai`) — это панель на Django + **django-allauth** за Cloudflare, и у её регистрации есть два жёстких барьера: настоящий виджет **Cloudflare Turnstile** (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, поле токена `cf-turnstile-response`) и **обязательное подтверждение e-mail** — вход с неподтверждённым аккаунтом перенаправляется на `/accounts/confirm-email/` с кодом **405**, так что обойти чтение входящих не получится. Всё после письма — это обычный HTTP: `POST /accounts/login/` не требует капчи, сессионная cookie открывает `/app/api-keys/`, а `POST /app/api-keys/create/` возвращает ключ `alv2_…` прямо в ответе. Именно этот путь и автоматизирует данный инструмент.

Собственный прогон этого решения дал **10 аккаунтов → 10 ключей, и каждый был сохранён только после живого ответа чата 200** (`content:"OK"`, `finish_reason:stop`) как на `aion-labs/aion-3.0-mini`, так и на `aion-labs/aion-3.5`; масштабный прогон создал 6 ключей за 8 попыток регистрации (~56 с на ключ) через одну сессию браузера и закреплённый выход.

## 🎁 Бесплатный тариф — сколько вы получаете

| Что | Значение |
| --- | --- |
| Тариф при регистрации | **Free** — `$0`, **без карты** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Запросов в минуту | **15** |
| Токенов в минуту | **20,000** |
| Токенов в день | **20,000** — жёсткий дневной лимит бесплатного тарифа |
| Более высокие тарифы | только через пожизненное пополнение баланса ($1 … $1,000); тариф никогда не понижается |
| Единица биллинга | **на аккаунт** — квота привязана к аккаунту, поэтому этот инструмент создаёт один аккаунт на ключ |
| Барьер e-mail | **обязателен** (allauth); вход без подтверждения → `405` на `/accounts/confirm-email/` |
| Телефон / карта | ни то, ни другое |

С N ключами у вас N аккаунтов, то есть **N × 20,000 токенов/день** и по 15 RPM на каждый. Дневной счётчик сбрасывается на аккаунт, а не на IP.

> 💡 Бесплатный тариф устанавливается Aion Labs и может измениться. Проверяйте актуальные цифры на [www.aionlabs.ai](https://www.aionlabs.ai) — и пусть собственный гейт инструмента решает:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 6

`GET /v1/models` отвечает **200 без ключа** и перечисляет **6 id**; запрос чата без ключа отвечает `401 {"detail":"Authentication credentials were not provided."}`.

| ID модели | Контекст | Ввод / 1M | Вывод / 1M | Проверено |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **10 из 10 ключей chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **10 из 10 ключей chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 на ключах прогона |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | в списке |
| `aion-labs/aion-3.5-mini` | 256K | — | — | в списке |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | в списке (roleplay, 8B) |

> ⚠️ **Две особенности, которые гейт уже учитывает.** Поле рассуждений — это **`reasoning`**, а не `reasoning_content`, и модели mini/3.5 думают перед ответом: при `max_tokens` ниже ~512 ответ приходит с `content:""` и `finish_reason:"length"`. CLI по умолчанию запрашивает **512** (`--max-tokens`); меньший бюджет заставит живой ключ выглядеть мёртвым.

## 🧪 Как использовать API

Базовый URL **`https://api.aionlabs.ai/v1`** — совместим с OpenAI, поэтому подойдёт любой OpenAI SDK или клиент, настроенный на него.

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

Живой ключ отвечает за **1.5–2.6 с** для завершения на 60–100 токенов. Панель не возвращает заголовков ограничения скорости (только `x-request-id`), поэтому лимиты 15 RPM / 20k TPD применяются молча.

## 🛠 Быстрый старт

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

Для шага с браузером нужен **Chrome или Chromium** на машине (`--browser <exe>` или `CHROME_PATH`, если он не в стандартном месте). Ключ записывается в `keys.txt` **только** после того, как `/v1/chat/completions` ответит 200 с реальным содержимым; `accounts.jsonl` хранит адрес, пароль, имя ключа и результат гейта.

Один аккаунт на ключ: `--count N` — это на самом деле "N бесплатных аккаунтов". Инструмент автоматически переходит к следующему, когда почтовый ящик из пула temp.tf оказывается уже известен панели (`[Aion Labs] Account Already Exists`) или когда виджет Turnstile зависает.

### 🖱️ Лаунчер

Лаунчер запрашивает список прокси (необязательно — без него CLI работает напрямую), количество и модель, запоминает их в `launcher.config.json` и запускает CLI: **mint**, **verify**, **screen** (проверить выходы против барьера регистрации), **settings**, **help** и **Connect to 9Router**.

## ✅ Проверено в работе — каждый ключ тестируется

| Проверка | Результат |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, без ключа, **6 id моделей** |
| `POST /v1/chat/completions` без ключа | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, форма allauth (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| отправка регистрации | **200 → `/accounts/confirm-email/`**, токен Turnstile 730 символов, решён собственным виджетом страницы в видимом Chrome |
| письмо с подтверждением | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 с** после отправки; ссылка `…/accounts/confirm-email/<key>/` → приводит на `/app/` |
| `POST /accounts/login/` (подтверждённый аккаунт) | сессия установлена (последующий GET `/app/` всё равно отвечает **403** — безвредно) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, ключ `alv2_…` (48 символов) возвращён прямо в ответе |
| `POST /v1/chat/completions` | **200** с `content:"OK"` на всех **10** ключах (`aion-3.0-mini` и `aion-3.5`) |
| вход с неподтверждённым аккаунтом | **405** на `/accounts/confirm-email/` — подтверждение действительно обязательно |
| общий ящик temp.tf, который уже зарегистрирован | регистрация присылает `"[Aion Labs] Account Already Exists"` со ссылкой сброса пароля — инструмент переходит к новому адресу |

## 🧭 Как это работает

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| почтовый ящик | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | plus-алиас на реальном ящике Microsoft, без капчи, `POST /api/check` читает его как JSON |
| предварительный фильтр | `POST /api/check` | ящик, который уже содержит письма Aion, зарегистрирован выше по потоку — переход до траты попытки регистрации |
| регистрация | Chrome (CDP) на `/accounts/signup/` | заполняет e-mail + пароль ×2 + условия, ждёт собственный токен Turnstile страницы (кликает по виджету только если он завис) |
| подтверждение | ссылка из письма открывается в той же сессии браузера | должна привести на `/app/`; `"Account Already Exists"` → переход к следующему |
| ключ | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | обычный HTTP, без браузера: csrf со страницы, ключ из ответа |
| гейт | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **или** `reasoning` = живой; только тогда `keys.txt` |

Chrome запускается для каждого аккаунта с `--proxy-server` = выход этого аккаунта, в одноразовом профиле, и закрывается сразу после подтверждения аккаунта — так ни одна сессия не утекает между аккаунтами, и весь прогон остаётся на пуле.

## ⚙️ Опции CLI

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

| Переменная | По умолчанию | Значение |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | пул выходов, по одному в строке (то же, что `--pool`); отсутствует = напрямую |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | модель, используемая для живого гейта |
| `CHROME_PATH` | автоопределение | бинарник Chrome/Chromium для шага регистрации |

## 🛰️ За прокси

**Необязательно — рекомендуется при масштабе.** Каждый запрос проходит через один выход из вашего списка, и браузер тоже (Chrome получает этот выход как `--proxy-server`).

- **С пулом:** `--pool proxies.txt` (или `AIONLABS_PROXIES`). Один выход закрепляется за аккаунтом, поэтому регистрация, подтверждение, создание ключа и гейт исходят с одного адреса — панель никогда не видит смешанный след. Мёртвый выход проваливает эту попытку, и следующий переход берёт следующий выход.
- **Fail-closed:** явный `--pool`, который отсутствует или не содержит пригодной строки выхода, — это **фатальная ошибка**, а не молчаливый прямой запуск. Переменная окружения (которую задаёт лаунчер) вместо этого предупреждает и откатывается к прямому режиму.
- **Без пула:** CLI печатает `running WITHOUT a proxy (direct)` и работает так же — меняется только то, откуда уходят пакеты.
- Принимаются строки `socks5://`, `socks5h://`, `http://`, `https://` и просто `host:port`; строки SOCKS5-с-аутентификацией отбрасываются, потому что Chrome не может к ним аутентифицироваться (аутентификация HTTP-прокси обрабатывается через домен Fetch).
- Качество выходов важнее их количества: публичные списки устаревают за часы. `--screen` проверяет каждую строку против страницы регистрации **и** API перед реальным прогоном.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | по одному проверенному вживую ключу на строку (`alv2_…`, 48 символов) — игнорируется git |
| `accounts.jsonl` | адрес / пароль / имя ключа / ключ / выход / результат гейта для каждого аккаунта — игнорируется git |
| `proxies.txt` | ваши выходы, по одному в строке — игнорируется git |
| `out/` | лог прогона (`aionlabs-cli-<date>.log`) и скриншоты неудачных шагов с капчей — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый маршрутизатор, совместимый с OpenAI:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Значения по умолчанию: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Модели предоставляются как `aionlabs/<model id>`.

## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Что даёт провайдер | **бесплатный тариф $0**, без карты: ежедневная квота кредитов, 15 RPM, 20k токенов/день на аккаунт |
| 🔑 Что даёт один ключ | один ключ `alv2_…` на собственном аккаунте, проверенный чатом на `aion-labs/aion-3.0-mini` |
| 🌐 Форма API | совместим с OpenAI: `POST https://api.aionlabs.ai/v1/chat/completions` (6 id моделей) |
| 🔒 Ваши данные | контакт только с `aionlabs.ai`, `api.aionlabs.ai`, вашим почтовым бэкендом и вашим собственным прокси; ключи остаются на вашей машине |

## 🐞 Проблемы

Если Aion Labs изменит форму регистрации, sitekey Turnstile, письмо с подтверждением или маршрут api-keys, инструмент остановится на этом шаге и сообщит об отказе дословно (точный статус, страницу, на которую он попал, или увиденную тему письма). **[Откройте issue](../../issues)** с командой и точным выводом.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>