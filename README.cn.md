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
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[⚡ 一条命令](#-one-command) · [🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-6-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [⚠️ 条款](#️-terms-and-account-risk) · [🐞 问题反馈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个项目

Aion Labs（`aionlabs.ai`）是一个运行在 Cloudflare 后面的 Django + **django-allauth** 面板，其注册流程有两道硬门槛：一个真实的 **Cloudflare Turnstile** 控件（`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`，令牌字段 `cf-turnstile-response`）以及**强制邮箱验证** — 使用未确认的账户登录会被跳转到 `/accounts/confirm-email/` 并返回 **405**，因此没有绕开读取收件箱的捷径。邮件之后的一切都是纯 HTTP：`POST /accounts/login/` 不需要验证码，会话 Cookie 即可打开 `/app/api-keys/`，而 `POST /app/api-keys/create/` 会直接返回 `alv2_…` 密钥。这就是本工具所自动化的全部流程。

该渠道自身的运行结果是**每个账户都会生成自己的密钥，且只有在实时聊天返回 200**（`content:"OK"`、`finish_reason:stop`）并且在 `aion-labs/aion-3.0-mini` 和 `aion-labs/aion-3.5` 两个模型上都通过后，才会保留每一个密钥；规模化测试中，通过一个浏览器会话和一个固定出口，在 8 次注册尝试中生成密钥（每个密钥约 56 秒）。

## 🎁 免费额度 — 你能得到多少

| 项目 | 数值 |
| --- | --- |
| 注册后的套餐 | **免费** — `$0`，**无需银行卡**（`/pricing`：“每天赠送一定额度，用于试用智能体任务、API 和浏览器聊天”） |
| 每分钟请求数 | **15** |
| 每分钟 Token 数 | **20,000** |
| 每天 Token 数 | **20,000** — 免费套餐每天的上限 |
| 更高套餐 | 只能通过终身额度充值获得（$1 … $1,000）；套餐等级只升不降 |
| 计费单位 | **按账户** — 配额属于账户，因此本工具为每个密钥创建一个账户 |
| 邮箱门槛 | **强制**（allauth）；未确认登录 → 在 `/accounts/confirm-email/` 返回 `405` |
| 手机 / 银行卡 | 均不需要 |

拥有 N 个密钥就意味着拥有 N 个账户，即**每天 N × 20,000 个 Token**，每个账户 15 RPM。每日计数器按账户重置，而不是按 IP。

> 💡 免费套餐由 Aion Labs 设定，可能会变化。请到 [www.aionlabs.ai](https://www.aionlabs.ai) 查看实时数值 — 并让工具自身的校验来决定：

```bash
node src/cli.js --verify-only     # keys.txt 中的每个密钥都会用一次真实聊天调用重新测试
```

## 🤖 模型 — 全部 6 个

`GET /v1/models` **无需密钥即返回 200**，并列出 **6 个 id**；不带密钥的聊天调用返回 `401 {"detail":"Authentication credentials were not provided."}`。

| 模型 ID | 上下文 | 输入 / 1M | 输出 / 1M | 已验证 |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **每个密钥，聊天 200** |
| `aion-labs/aion-3.5` | 256K | — | — | **每个密钥，聊天 200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | 渠道密钥聊天 200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | 已列出 |
| `aion-labs/aion-3.5-mini` | 256K | — | — | 已列出 |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | 已列出（角色扮演，8B） |

> ⚠️ **校验程序已处理的两个怪癖。** 推理字段是 **`reasoning`**，不是 `reasoning_content`，并且 mini/3.5 模型在回答前会先思考：当 `max_tokens` 低于约 512 时，回复会返回 `content:""` 且 `finish_reason:"length"`。CLI 默认请求 **512**（`--max-tokens`）；更小的预算会让一个有效的密钥看起来像是失效了。

## 🧪 如何使用 API

基础 URL **`https://api.aionlabs.ai/v1`** — 兼容 OpenAI，因此任何指向它的 OpenAI SDK 或客户端都可以使用。

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

对于一个 60–100 Token 的补全，有效密钥的响应时间为 **1.5–2.6 秒**。该面板不返回速率限制标头（仅有 `x-request-id`），因此 15 RPM / 20k TPD 的上限是静默执行的。

## ⚡ 一条命令

```bash
node src/cli.js --count N        # N 个账户 → N 个密钥，一条命令，无需回答任何问题
```

Cloudflare Turnstile 控件由内嵌的浏览器引擎（`src/solver.js`）在承载它的页面上、于真实 Chrome 中解决 — `--auto` 是**默认**开启且始终启用，因此无需粘贴验证码，也没有浏览器提问挡路。使用 `--dry` 会打印解析后的计划（数量、模型、路由、求解器、Chrome 路径），并以 0 退出，不写文件也不打开套接字：

```bash
node src/cli.js --count N --dry
```

`npm start`（或 `node src/launcher.js`）通过菜单执行相同操作：选择 **1) Mint keys**，回答“How many keys?”（回车 = 10），它就会运行 `node src/cli.js --auto --count N`。若 `proxies.txt` 存在，会自动读取它，否则运行将直连。

## 🛠 快速开始

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # 可选 — 每个请求（包括 Chrome）都会经过它
node src/launcher.js                     # 交互式：生成 / 验证 / 筛选 / 设置
# 或：node src/cli.js --count 10 --pool proxies.txt
```

浏览器步骤需要机器上安装 **Chrome 或 Chromium**（如果不在默认位置，可用 `--browser <exe>` 或 `CHROME_PATH`）。只有当 `/v1/chat/completions` 返回 200 且包含真实内容后，密钥才会被写入 `keys.txt`；`accounts.jsonl` 会保留地址、密码、密钥名称以及校验结果。

每个密钥对应一个账户：`--count N` 实际上是“N 个免费账户”。当 temp.tf 池中的邮箱被面板识别为已知（`[Aion Labs] Account Already Exists`）或 Turnstile 控件卡住时，工具会自动更换。

### 🖱️ 启动器

启动器会询问代理列表（可选 — 没有则 CLI 直连）、数量和模型，将它们记录到 `launcher.config.json`，然后运行 CLI：**mint**（生成）、**verify**（验证）、**screen**（针对注册门槛测试出口）、**settings**（设置）、**help**（帮助）以及 **Connect to 9Router**。

## ✅ 已验证可用 — 每个密钥都经过测试

| 检查项 | 结果 |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**，无需密钥，**6 个模型 id** |
| `POST /v1/chat/completions` 无密钥 | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**，allauth 表单（`#id_email`、`#id_password1/2`、`#id_accept_terms`）+ `div.cf-turnstile`（sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`） |
| 提交注册 | **200 → `/accounts/confirm-email/`**，Turnstile 令牌 730 字符，由页面自身的控件在可见的 Chrome 中解决 |
| 确认邮件 | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`，提交后 **约 10 秒**；链接 `…/accounts/confirm-email/<key>/` → 最终落到 `/app/` |
| `POST /accounts/login/`（已确认账户） | 会话已建立（即便如此，随后的 `/app/` GET 仍返回 **403** — 无碍） |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**，`alv2_…` 密钥（48 字符）直接返回 |
| `POST /v1/chat/completions` | 全部 **10** 个密钥均返回 **200** 且 `content:"OK"`（`aion-3.0-mini` 和 `aion-3.5`） |
| 未确认账户登录 | 在 `/accounts/confirm-email/` 返回 **405** — 验证确实是强制的 |
| 共享的、已被注册的 temp.tf 邮箱 | 注册时会发送 `"[Aion Labs] Account Already Exists"` 并附带密码重置链接 — 工具会更换为新地址 |

> **质量门槛。** 这里的每个密钥在写入 `keys.txt` 之前都通过了实时 `chat-200` 校验
> （绝不交付失效密钥）。路由器组合在模型层面遵循同样的规则：只有当模型返回 `chat-200` 且能调用工具时，
> 才会被添加 — 不支持工具的模型、失效的密钥或失效的提供方会被丢弃而不是添加。可随时重新运行验证步骤；
> 失败会被上报，绝不隐瞒。

## 🧭 工作原理

```
收件箱（每个账户一个地址）                                 每个账户一个全新地址
   │
   ├─▶ 注册：Aion Labs 页面 → 邮箱地址 → 来自收件箱的验证码 / 链接
   ├─▶ 会话：拿到该账户的 Cookie 或访问令牌
   ├─▶ 生成密钥：该账户的密钥端点 → 明文密钥仅返回一次（立即写入磁盘）
   └─▶ 实时校验：POST https://api.aionlabs.ai/v1/chat/completions → 返回真实内容 = 密钥有效
```

| 步骤 | 调用 | 备注 |
| --- | --- | --- |
| 邮箱 | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | 真实 Microsoft 邮箱上的 plus 别名，无验证码，`POST /api/check` 以 JSON 读取 |
| 预筛选 | `POST /api/check` | 已经带有 Aion 邮件的邮箱在上游已注册 — 在花费一次注册前先更换 |
| 注册 | 在 `/accounts/signup/` 上运行 Chrome（CDP） | 填写邮箱 + 密码 ×2 + 条款，等待页面自身的 Turnstile 令牌（仅在卡住时点击控件） |
| 确认 | 在同一浏览器会话中打开邮件链接 | 必须落到 `/app/`；`"Account Already Exists"` → 更换 |
| 密钥 | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | 纯 HTTP，无浏览器：csrf 来自页面，密钥来自响应 |
| 校验 | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`，`content` **或** `reasoning` 有内容 = 有效；只有此时才写入 `keys.txt` |

每个账户都会以 `--proxy-server` = 该账户的出口，在一次性配置文件中启动 Chrome，并在账户确认后立即关闭 — 因此账户之间不会泄露会话，整个运行都保持在代理池上。

## ⚙️ CLI 选项

```bash
node src/cli.js --count 10                        # 生成 10 个密钥（每个一个账户）
node src/cli.js --count 1 --model aion-labs/aion-3.5
node src/cli.js --count 5 --max-tokens 800        # 为校验提供更多思考预算
node src/cli.js --verify-only                     # 重新检查 keys.txt 中的每个密钥
node src/cli.js --verify-only --limit 5
node src/cli.js --screen                          # 针对注册门槛测试出口
node src/cli.js --connect-9router                 # 在本地 9Router 上注册提供方 + 密钥
node src/cli.js --help
```

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | 出口池，每行一个（与 `--pool` 相同）；缺省 = 直连 |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | 用于实时校验的模型 |
| `CHROME_PATH` | 自动检测 | 用于注册步骤的 Chrome/Chromium 可执行文件 |

## 🛰️ 在代理后面

**可选 — 大规模使用时推荐。** 每个请求都经过你列表中的一个出口，浏览器也是如此（Chrome 会将该出口作为 `--proxy-server`）。

- **有代理池：** `--pool proxies.txt`（或 `AIONLABS_PROXIES`）。每个账户固定一个出口，因此注册、确认、生成密钥和校验都从同一地址发出 — 面板永远不会看到混合的痕迹。失效的出口会使该次尝试失败，下一次更换会取用下一个出口。
- **故障即关闭：** 显式指定但缺失或没有可用出口行的 `--pool` 是**致命错误**，绝不静默直连。环境变量（由启动器设置）会发出警告并回退为直连。
- **无代理池：** CLI 会打印 `running WITHOUT a proxy (direct)`，行为相同 — 只是数据包的发出位置不同。
- 接受 `socks5://`、`socks5h://`、`http://`、`https://` 以及裸 `host:port` 行；带认证的 SOCKS5 行会被丢弃，因为 Chrome 无法向其认证（HTTP 代理认证通过 Fetch 域处理）。
- 出口质量比出口数量更重要：公开列表会在数小时内失效。`--screen` 会在真实运行前，针对注册页面**和** API 测试每一行。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 每行一个经过实时验证的密钥（`alv2_…`，48 字符）— 已被 git 忽略 |
| `accounts.jsonl` | 每个账户的地址 / 密码 / 密钥名称 / 密钥 / 出口 / 校验结果 — 已被 git 忽略 |
| `proxies.txt` | 你的出口，每行一个 — 已被 git 忽略 |
| `out/` | 运行日志（`aionlabs-cli-<date>.log`）以及验证码失败步骤的截图 — 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管的、兼容 OpenAI 的路由器：

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# 或者使用 CLI 旁边附带的独立连接器：
node src/connect-9router.js --api-key alv2_…
```

默认值：`--9router-prefix aionlabs`、`--9router-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。模型以 `aionlabs/<model id>` 的形式提供。

## 🔌 连接到 OmniRoute

[OmniRoute](https://omniroute.online) 是一个自托管的、兼容 OpenAI 的路由器：

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# 或者使用 CLI 旁边附带的独立连接器：
node src/connect-omniroute.js --api-key alv2_…
```

默认值：`--omniroute-prefix aionlabs`、`--omniroute-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。模型以 `aionlabs/<model id>` 的形式提供。

## 🔑 一个密钥能给你什么

| | |
| --- | --- |
| 🏢 提供方 | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 提供方给出的额度 | **$0 免费套餐**，无需银行卡：每日赠送额度，15 RPM，每账户每天 20k Token |
| 🔑 一个密钥能给你什么 | 在其自身账户上的一个 `alv2_…` 密钥，已在 `aion-labs/aion-3.0-mini` 上通过聊天验证 |
| 🌐 API 形态 | 兼容 OpenAI：`POST https://api.aionlabs.ai/v1/chat/completions`（6 个模型 id） |
| 🔒 你的数据 | 仅会联系 `aionlabs.ai`、`api.aionlabs.ai`、你的收件箱后端以及你自己的代理；密钥保留在你的机器上 |

## ⚠️ 条款与账户风险

本工具自动化了一个注册流程，因此**你**要为其行为负责：自动化提供方的注册流程可能违反该提供方的服务条款，而账户给你的免费额度由提供方决定，可随时限流、变更或收回 — 按账户也按 IP。请仅为你有权创建的账户运行本工具，妥善保管你的代理列表，不要将这些密钥视为生产容量。本文档不构成绕过提供方规则的许可。

## 🐞 问题反馈

如果 Aion Labs 更改了其注册表单、Turnstile sitekey、确认邮件或 api-keys 路由，工具会在该步骤停止并原样报告拒绝信息（确切的状态码、它落到的页面，或它看到的邮件主题）。请附上命令和确切输出 **[提交 issue](../../issues)**。

## 📄 许可证

MIT © 2026 — 参见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey 贡献者

</div>
