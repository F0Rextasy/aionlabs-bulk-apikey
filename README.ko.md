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

**자동 생성된 API 키로 Aion Labs 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-6-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 이 도구가 존재하는 이유

Aion Labs(`aionlabs.ai`)는 Cloudflare 뒤에 있는 Django + **django-allauth** 패널이며, 가입에는 두 가지 강력한 관문이 있습니다. 실제 **Cloudflare Turnstile** 위젯(`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, 토큰 필드 `cf-turnstile-response`)과 **필수 이메일 인증**입니다. 확인되지 않은 계정으로 로그인하면 **405**와 함께 `/accounts/confirm-email/`로 튕겨 나가므로, 받은편지함을 읽는 것을 우회할 방법은 없습니다. 메일 이후의 모든 과정은 평범한 HTTP입니다. `POST /accounts/login/`은 캡차를 요구하지 않고, 세션 쿠키로 `/app/api-keys/`를 열 수 있으며, `POST /app/api-keys/create/`는 `alv2_…` 키를 인라인으로 반환합니다. 이것이 이 도구가 자동화하는 전체 경로입니다.

이 레인의 자체 실행에서는 `aion-labs/aion-3.0-mini`와 `aion-labs/aion-3.5` 모두에서 **키가 검증**되었습니다(`content:"OK"`, `finish_reason:stop`). 대량 실행에서는 하나의 브라우저 세션과 고정된 출구를 통해 8번의 가입 시도에서 6개의 키를 생성했습니다(키당 약 56초).

## 🎁 무료 티어 — 얼마나 받을 수 있나

| 항목 | 값 |
| --- | --- |
| 가입 시 플랜 | **Free** — `$0`, **카드 불필요** (`/pricing`: "에이전트 작업, API, 브라우저 채팅을 시험해 볼 수 있는 일일 크레딧 허용량") |
| 분당 요청 수 | **15** |
| 분당 토큰 수 | **20,000** |
| 일일 토큰 수 | **20,000** — 무료 티어의 하드 일일 한도 |
| 상위 티어 | 평생 크레딧 충전($1 … $1,000)으로만 가능; 티어가 낮아지는 일은 없음 |
| 청구 단위 | **계정당** — 할당량은 계정에 있으므로, 이 도구가 키당 하나의 계정을 생성함 |
| 이메일 관문 | **필수** (allauth); 미확인 로그인 → `/accounts/confirm-email/`에서 `405` |
| 전화 / 카드 | 둘 다 불필요 |

N개의 키가 있으면 N개의 계정, 즉 **N × 20,000 토큰/일**과 각각 15 RPM을 보유합니다. 일일 카운터는 IP가 아니라 계정별로 초기화됩니다.

> 💡 무료 티어는 Aion Labs가 설정하며 변경될 수 있습니다. 실시간 수치는 [www.aionlabs.ai](https://www.aionlabs.ai)에서 확인하세요 — 그리고 도구 자체의 관문이 판단하게 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 6개 전부

`GET /v1/models`는 **키 없이 200**을 반환하며 **6개의 id**를 나열합니다. 키 없이 채팅 호출을 하면 `401 {"detail":"Authentication credentials were not provided."}`를 반환합니다.

| 모델 ID | 컨텍스트 | 입력 / 1M | 출력 / 1M | 검증됨 |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **검증됨** |
| `aion-labs/aion-3.5` | 256K | — | — | **검증됨** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | 레인 키에서 chat-200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | 목록에 있음 |
| `aion-labs/aion-3.5-mini` | 256K | — | — | 목록에 있음 |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | 목록에 있음 (롤플레이, 8B) |

> ⚠️ **관문이 이미 처리하는 두 가지 특이점.** 추론 필드는 `reasoning_content`가 아니라 **`reasoning`**이며, mini/3.5 모델은 답변 전에 사고합니다. `max_tokens`가 약 512 미만이면 응답이 `content:""`와 `finish_reason:"length"`로 돌아옵니다. CLI는 기본적으로 **512**를 요청합니다(`--max-tokens`). 더 작은 예산은 검증된 키를 죽은 것처럼 보이게 만듭니다.

## 🧪 API 사용 방법

베이스 URL **`https://api.aionlabs.ai/v1`** — OpenAI 호환이므로, 이를 가리키는 모든 OpenAI SDK나 클라이언트가 작동합니다.

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

검증된 키는 60–100 토큰 완성에 대해 **1.5–2.6초** 안에 응답합니다. 패널은 레이트 리밋 헤더를 반환하지 않으므로(`x-request-id`만), 15 RPM / 20k TPD 한도는 조용히 적용됩니다.

## 🛠 빠른 시작

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings

# or: node src/cli.js --count 10 --pool proxies.txt
```

브라우저 단계는 머신에 **Chrome 또는 Chromium**이 필요합니다(기본 위치에 없으면 `--browser <exe>` 또는 `CHROME_PATH`). 키는 `/v1/chat/completions`가 실제 콘텐츠와 함께 200을 반환한 **후에만** `keys.txt`에 기록됩니다. `accounts.jsonl`은 주소, 비밀번호, 키 이름, 관문 결과를 보관합니다.

키당 하나의 계정: `--count N`은 사실상 "N개의 무료 계정"입니다. 임시 temp.tf 풀 메일박스가 패널에 이미 알려진 것으로 판명되면(`[Aion Labs] Account Already Exists`) 또는 Turnstile 위젯이 멈추면 도구는 자동으로 다시 시도합니다.

### 🖱️ 런처

런처는 프록시 목록(선택 사항 — 없으면 CLI는 직접 실행), 개수, 모델을 묻고, 이를 `launcher.config.json`에 기억한 뒤 CLI를 실행합니다: **mint**, **verify**, **screen**(가입 관문에 대해 출구 테스트), **settings**, **help**, **Connect to 9Router**.

## ✅ 검증된 작동 — 모든 키가 테스트됨

> **품질 관문.** 여기의 모든 키는 `keys.txt`에 기록되기 전에 실제 `chat-200`을 통과했습니다
> (죽은 키는 절대 배포되지 않습니다). 라우터 조합도 모델 수준에서 동일한 규칙을 따릅니다: 모델이
> `chat-200`으로 응답하고 도구를 호출할 수 있는 **경우에만** 항목이 추가됩니다 — 도구 지원이 없는 모델,
> 죽은 키, 죽은 제공자는 추가되지 않고 제거됩니다. **9Router 및 OmniRoute**와 함께 작동합니다.

| 검사 | 결과 |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, 키 불필요, **6개 모델 id** |
| 키 없이 `POST /v1/chat/completions` | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, allauth 폼(`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| 가입 제출 | **200 → `/accounts/confirm-email/`**, Turnstile 토큰 730자, 표시되는 Chrome에서 페이지 자체 위젯으로 해결됨 |
| 확인 메일 | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`, 제출 후 **약 10초**; 링크 `…/accounts/confirm-email/<key>/` → `/app/` 도착 |
| `POST /accounts/login/` (확인된 계정) | 세션 설정됨 (그럼에도 후속 `/app/` GET은 **403**을 반환 — 무해함) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, `alv2_…` 키(48자) 인라인 반환 |
| `POST /v1/chat/completions` | **10개** 키 모두에서 `content:"OK"`와 함께 **200** (`aion-3.0-mini` 및 `aion-3.5`) |
| 미확인 계정 로그인 | `/accounts/confirm-email/`에서 **405** — 인증은 정말로 필수 |
| 이미 등록된 공유 temp.tf 메일박스 | 가입 시 비밀번호 재설정 링크와 함께 `"[Aion Labs] Account Already Exists"` 메일 발송 — 도구는 새 주소로 다시 시도 |

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 메일박스 | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | 실제 Microsoft 메일박스의 plus 별칭, 캡차 없음, `POST /api/check`가 JSON으로 읽음 |
| 사전 필터 | `POST /api/check` | 이미 Aion 메일을 보유한 박스는 업스트림에 등록된 것 — 가입을 소비하기 전에 다시 시도 |
| 가입 | `/accounts/signup/`에서 Chrome (CDP) | 이메일 + 비밀번호 ×2 + 약관 입력, 페이지 자체 Turnstile 토큰 대기(멈추면 위젯을 클릭) |
| 확인 | 같은 브라우저 세션에서 메일 링크 열기 | `/app/`에 도착해야 함; `"Account Already Exists"` → 다시 시도 |
| 키 | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | 평범한 HTTP, 브라우저 불필요: 페이지에서 csrf, 응답에서 키 |
| 관문 | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **또는** `reasoning` = 살아 있음; 그 후에만 `keys.txt` |

Chrome은 계정마다 해당 계정의 출구를 `--proxy-server`로 지정하여 일회용 프로필로 실행되고, 계정이 확인되는 즉시 닫힙니다 — 따라서 계정 간에 세션이 누출되지 않고 전체 실행이 풀에 머무릅니다.

## ⚙️ CLI 옵션

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

| 환경 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | 출구 풀, 한 줄에 하나 (`--pool`과 동일); 없으면 직접 연결 |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | 라이브 관문에 사용되는 모델 |
| `CHROME_PATH` | 자동 감지 | 가입 단계용 Chrome/Chromium 바이너리 |

## 🛰️ 프록시 뒤에서

**선택 사항 — 대규모에서는 권장.** 모든 요청이 목록의 하나의 출구를 통과하며, 브라우저도 마찬가지입니다(Chrome은 해당 출구를 `--proxy-server`로 받음).

- **풀이 있는 경우:** `--pool proxies.txt` (또는 `AIONLABS_PROXIES`). 계정마다 하나의 출구가 고정되므로, 가입, 확인, 키 생성, 관문이 모두 같은 주소에서 나갑니다 — 패널은 결코 뒤섞인 흔적을 보지 못합니다. 죽은 출구는 해당 시도를 실패시키고 다음 시도는 다음 출구를 사용합니다.
- **Fail-closed:** 명시적 `--pool`이 없거나 사용 가능한 출구 줄이 없으면 **치명적 오류**이며, 결코 조용히 직접 실행하지 않습니다. 환경 변수(런처가 설정)는 경고하고 직접 연결로 폴백합니다.
- **풀이 없는 경우:** CLI는 `running WITHOUT a proxy (direct)`를 출력하고 동일하게 작동합니다 — 패킷이 나가는 위치만 달라집니다.
- `socks5://`, `socks5h://`, `http://`, `https://` 및 맨 `host:port` 줄이 허용됩니다. SOCKS5-with-auth 줄은 Chrome이 인증할 수 없으므로 제거됩니다(HTTP 프록시 인증은 Fetch 도메인을 통해 처리됨).
- 출구 품질이 출구 개수보다 중요합니다: 공개 목록은 몇 시간 안에 썩습니다. `--screen`은 실제 실행 전에 각 줄을 가입 페이지 **및** API에 대해 테스트합니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | 한 줄에 하나의 라이브 검증된 키 (`alv2_…`, 48자) — git-ignored |
| `accounts.jsonl` | 계정별 주소 / 비밀번호 / 키 이름 / 키 / 출구 / 관문 결과 — git-ignored |
| `proxies.txt` | 출구, 한 줄에 하나 — git-ignored |
| `out/` | 실행 로그 (`aionlabs-cli-<date>.log`) 및 실패한 캡차 단계의 스크린샷 — git-ignored |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅, OpenAI 호환 라우터입니다:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456

```

## 🔌 OmniRoute에 연결

[OmniRoute](https://omniroute.online)는 자체 호스팅, OpenAI 호환 라우터입니다:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

기본값: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. 모델은 `aionlabs/<model id>`로 제공됩니다.

## 🔑 키 하나로 얻는 것

| | |
| --- | --- |
| 🏢 제공자 | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 제공자가 주는 것 | **$0 무료 티어**, 카드 불필요: 일일 크레딧 허용량, 15 RPM, 계정당 일일 20k 토큰 |
| 🔑 키 하나로 얻는 것 | 자체 계정의 `alv2_…` 키 하나, `aion-labs/aion-3.0-mini`에서 채팅 검증됨 |
| 🌐 API 형태 | OpenAI 호환: `POST https://api.aionlabs.ai/v1/chat/completions` (6개 모델 id) |
| 🔒 데이터 | `aionlabs.ai`, `api.aionlabs.ai`, 받은편지함 백엔드, 자체 프록시만 접속됨; 키는 머신에 남음 |

## 🐞 이슈

Aion Labs가 가입 폼, Turnstile sitekey, 확인 메일 또는 api-keys 경로를 변경하면, 도구는 해당 단계에서 멈추고 거부를 그대로 보고합니다(정확한 상태, 도착한 페이지, 또는 본 메일 제목). 명령과 정확한 출력을 포함하여 **[이슈를 열어주세요](../../issues)**.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>