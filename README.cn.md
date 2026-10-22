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

**批量创建 Aion Labs 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-6-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个工具

Aion Labs（`aionlabs.ai`）是 Cloudflare 后面的一个 Django + **django-allauth** 面板，它的注册有两道硬门槛：一个真实的 **Cloudflare Turnstile** 组件（`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`，令牌字段 `cf-turnstile-response`）以及**强制邮箱验证**——用未确认的账户登录会被跳转到 `/accounts/confirm-email/` 并返回 **405**，所以除了读收件箱之外没有捷径。邮件之后的一切都是普通 HTTP：`POST /accounts/login/` 不需要验证码，会话 cookie 可以打开 `/app/api-keys/`，而 `POST /app/api-keys/create/` 会直接返回 `alv2_…` 密钥。这就是本工具自动化的全部流程。

本流程自身的运行结果是 **10 个账户 → 10 个密钥，每一个都只有在 `aion-labs/aion-3.0-mini` 和 `aion-labs/aion-3.5` 上实时聊天返回 200**（`content:"OK"`，`finish_reason:stop`）之后才被保留；规模化测试通过一个浏览器会话和一个固定出口，在 8 次注册尝试中生成了 6 个密钥（每个密钥约 56 秒）。

## 🎁 免费额度 — 你能得到多少

| 项目 | 值 |
| --- | --- |
| 注册时的套餐 | **免费** — `$0`，**无需银行卡**（`/pricing`：“每日额度，用于试用 agent 任务、API 和浏览器聊天”） |
| 每分钟请求数 | **15** |
| 每分钟令牌数 | **20,000** |
| 每天令牌数 | **20,000** — 免费套餐的每日硬上限 |
| 更高套餐 | 仅通过终身额度充值获得（$1 … $1,000）；套餐永不降级 |
| 计费单位 | **按账户** — 配额属于账户，这就是本工具为每个密钥创建一个账户的原因 |
| 邮箱门槛 | **强制**（allauth）；未确认登录 → 在 `/accounts/confirm-email/` 返回 `405` |
| 手机 / 银行卡 | 都不需要 |

拥有 N 个密钥就意味着拥有 N 个账户，即 **N × 20,000 令牌/天**，每个账户 15 RPM。每日计数器按账户重置，而非按 IP。

> 💡 免费额度由 Aion Labs 设定，可能会变化。请到 [www.aionlabs.ai](https://www.aionlabs.ai) 查看实时数字——并让工具自身的门槛来判定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 — 全部 6 个

`GET /v1/models` **无需密钥**即可返回 **200**，并列出 **6 个 id**；不带密钥的聊天调用返回 `401 {"detail":"Authentication credentials were not provided."}`。

| 模型 ID | 上下文 | 输入 / 1M | 输出 / 1M | 已验证 |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **10 个密钥全部聊天 200** |
| `aion-labs/aion-3.5` | 256K | — | — | **10 个密钥全部聊天 200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | 流程密钥聊天 200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | 已列出 |
| `aion-labs/aion-3.5-mini` | 256K | — | — | 已列出 |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | 已列出（角色扮演，8B） |

> ⚠️ **门槛已经处理的两个怪癖。** 推理字段是 **`reasoning`**，而不是 `reasoning_content`，并且 mini/3.5 模型在回答前会先思考：当 `max_tokens` 低于约 512 时，回复会返回 `content:""` 和 `finish_reason:"length"`。CLI 默认请求 **512**（`--max-tokens`）；更小的预算会让一个可用的密钥看起来像失效了。

## 🧪 如何使用 API

基础 URL **`https://api.aionlabs.ai/v1`** — 兼容 OpenAI，因此任何指向它的 OpenAI SDK 或客户端都能工作。

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

一个可用的密钥在 60–100 令牌的补全上会在 **1.5–2.6 秒**内响应。面板不返回速率限制头（只有 `x-request-id`），所以 15 RPM / 20k TPD 的上限是静默执行的。

## 🛠 快速开始

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings

# or: node src/cli.js --count 10 --pool proxies.txt
```

浏览器步骤需要机器上有 **Chrome 或 Chromium**（如果不在默认位置，用 `--browser <exe>` 或 `CHROME_PATH`）。只有当 `/v1/chat/completions` 返回 200 且带有真实内容时，密钥才会被写入 `keys.txt`；`accounts.jsonl` 保存地址、密码、密钥名称和门槛结果。

一个密钥对应一个账户：`--count N` 实际上是“N 个免费账户”。当 temp.tf 池邮箱被面板识别为已知（`[Aion Labs] Account Already Exists`）或 Turnstile 组件卡住时，工具会自动重试。

### 🖱️ 启动器

启动器会询问代理列表（可选——没有则 CLI 直接运行）、数量和模型，将它们记在 `launcher.config.json` 中，并运行 CLI：**mint**、**verify**、**screen**（针对注册门槛测试出口）、**settings**、**help** 和 **Connect to 9Router**。

## ✅ 已验证可用 — 每个密钥都经过测试

| 检查 | 结果 |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**，无需密钥，**6 个模型 id** |
| 不带密钥的 `POST /v1/chat/completions` | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**，allauth 表单（`#id_email`、`#id_password1/2`、`#id_accept_terms`）+ `div.cf-turnstile`（sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`） |
| 注册提交 | **200 → `/accounts/confirm-email/`**，Turnstile 令牌 730 字符，由页面自身的组件在可见的 Chrome 中解决 |
| 确认邮件 | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`，提交后约 **10 秒**；链接 `…/accounts/confirm-email/<key>/` → 落到 `/app/` |
| `POST /accounts/login/`（已确认账户） | 会话已建立（即便如此，后续的 `/app/` GET 仍返回 **403**——无害） |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**，`alv2_…` 密钥（48 字符）直接返回 |
| `POST /v1/chat/completions` | 全部 **10** 个密钥（`aion-3.0-mini` 和 `aion-3.5`）返回 **200** 且 `content:"OK"` |
| 未确认账户登录 | 在 `/accounts/confirm-email/` 返回 **405** — 验证确实是强制的 |
| 已被注册的共享 temp.tf 邮箱 | 注册邮件为 `"[Aion Labs] Account Already Exists"` 并附带密码重置链接 — 工具会切换到新地址 |

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| 步骤 | 调用 | 备注 |
| --- | --- | --- |
| 邮箱 | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | 真实 Microsoft 邮箱上的 plus 别名，无验证码，`POST /api/check` 以 JSON 读取 |
| 预筛选 | `POST /api/check` | 已带有 Aion 邮件的邮箱在上游已注册 — 在花费一次注册前先切换 |
| 注册 | 在 `/accounts/signup/` 上运行 Chrome（CDP） | 填写邮箱 + 密码 ×2 + 条款，等待页面自身的 Turnstile 令牌（仅在卡住时点击组件） |
| 确认 | 在同一浏览器会话中打开邮件链接 | 必须落到 `/app/`；`"Account Already Exists"` → 切换 |
| 密钥 | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | 普通 HTTP，无浏览器：从页面获取 csrf，从响应获取密钥 |
| 门槛 | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`，`content` **或** `reasoning` = 可用；只有此时才写入 `keys.txt` |

每个账户都会启动一次 Chrome，`--proxy-server` = 该账户的出口，使用一次性配置文件，并在账户确认后立即关闭——因此账户之间不会泄露会话，整个运行都保持在代理池上。

## ⚙️ CLI 选项

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

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | 出口池，每行一个（与 `--pool` 相同）；不存在 = 直连 |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | 用于实时门槛的模型 |
| `CHROME_PATH` | 自动检测 | 用于注册步骤的 Chrome/Chromium 可执行文件 |

## 🛰️ 在代理后面

**可选 — 规模化时推荐。** 每个请求都通过你列表中的一个出口，浏览器也是如此（Chrome 将该出口作为 `--proxy-server`）。

- **有代理池时：** `--pool proxies.txt`（或 `AIONLABS_PROXIES`）。每个账户固定一个出口，因此注册、确认、密钥生成和门槛都从同一地址发出——面板永远不会看到混合的轨迹。出口失效会导致该次尝试失败，下一次切换会使用下一个出口。
- **故障关闭：** 显式指定的 `--pool` 如果缺失或没有可用的出口行，则是**致命错误**，绝不会静默直连。环境变量（由启动器设置）会警告并回退到直连。
- **无代理池时：** CLI 会打印 `running WITHOUT a proxy (direct)`，工作方式相同——只是数据包发出的位置不同。
- 接受 `socks5://`、`socks5h://`、`http://`、`https://` 和裸 `host:port` 行；带认证的 SOCKS5 行会被丢弃，因为 Chrome 无法对其认证（HTTP 代理认证通过 Fetch 域处理）。
- 出口质量比出口数量更重要：公共列表会在数小时内失效。`--screen` 会在真实运行前针对注册页面**和** API 测试每一行。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 每行一个实时验证的密钥（`alv2_…`，48 字符）— 已被 git 忽略 |
| `accounts.jsonl` | 每个账户的地址 / 密码 / 密钥名称 / 密钥 / 出口 / 门槛结果 — 已被 git 忽略 |
| `proxies.txt` | 你的出口，每行一个 — 已被 git 忽略 |
| `out/` | 运行日志（`aionlabs-cli-<date>.log`）和失败验证码步骤的截图 — 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器：

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

默认值：`--9router-prefix aionlabs`、`--9router-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。模型以 `aionlabs/<model id>` 形式提供。

## 🔑 一个密钥能给你什么

| | |
| --- | --- |
| 🏢 提供商 | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 提供商提供什么 | **$0 免费套餐**，无需银行卡：每日额度、15 RPM、每账户每天 20k 令牌 |
| 🔑 一个密钥能给你什么 | 在其自己账户上的一个 `alv2_…` 密钥，已在 `aion-labs/aion-3.0-mini` 上聊天验证 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.aionlabs.ai/v1/chat/completions`（6 个模型 id） |
| 🔒 你的数据 | 仅联系 `aionlabs.ai`、`api.aionlabs.ai`、你的收件箱后端和你自己的代理；密钥保留在你的机器上 |

## 🐞 问题反馈

如果 Aion Labs 更改了其注册表单、Turnstile sitekey、确认邮件或 api-keys 路由，工具会在该步骤停止并逐字报告拒绝信息（确切的状态码、它落到的页面，或它看到的邮件主题）。请附上命令和确切输出**[提交 issue](../../issues)**。

## 📄 许可证

MIT © 2026 — 见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>