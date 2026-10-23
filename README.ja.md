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

**Aion Labs アカウントを自動生成された API キーとともに一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-6-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ なぜこれが存在するのか

Aion Labs (`aionlabs.ai`) は Cloudflare の背後にある Django + **django-allauth** パネルであり、そのサインアップには 2 つの厳しい関門があります。本物の **Cloudflare Turnstile** ウィジェット (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`、トークンフィールド `cf-turnstile-response`) と、**必須のメール認証**です — 未確認のアカウントでログインすると `/accounts/confirm-email/` に **405** で弾かれるため、受信トレイを読む以外に近道はありません。メール以降はすべてプレーンな HTTP です。`POST /accounts/login/` はキャプチャを要求せず、セッション Cookie が `/app/api-keys/` を開き、`POST /app/api-keys/create/` が `alv2_…` キーをインラインで返します。このツールが自動化するのは、まさにこの一連の流れです。

このレーンの実際の実行では、**各アカウントがそれぞれのキーを発行し、すべてが `aion-labs/aion-3.0-mini` と `aion-labs/aion-3.5` の両方で実際のチャット 200** (`content:"OK"`、`finish_reason:stop`) を返した後にのみ保持されました。スケール実行では、1 つのブラウザセッションと固定された出口を通じて、8 回のサインアップ試行でキーを発行しました (キーあたり約 56 秒)。

## 🎁 無料枠 — どれだけ得られるか

| 項目 | 値 |
| --- | --- |
| サインアップ時のプラン | **Free** — `$0`、**カード不要** (`/pricing`: 「エージェントジョブ、API、ブラウザチャットを試すための 1 日あたりのクレジット枠」) |
| 1 分あたりのリクエスト数 | **15** |
| 1 分あたりのトークン数 | **20,000** |
| 1 日あたりのトークン数 | **20,000** — 無料枠の 1 日あたりの厳格な上限 |
| 上位ティア | 生涯クレジットの追加購入 ($1 … $1,000) によってのみ; ティアが引き下げられることはない |
| 課金単位 | **アカウント単位** — クォータはアカウントに紐づくため、このツールはキー 1 つにつきアカウントを 1 つ作成する |
| メールの関門 | **必須** (allauth); 未確認ログイン → `/accounts/confirm-email/` で `405` |
| 電話 / カード | どちらも不要 |

N 個のキーがあれば N 個のアカウントを保有することになり、つまり **N × 20,000 トークン/日** とそれぞれ 15 RPM です。1 日あたりのカウンタは IP 単位ではなくアカウント単位でリセットされます。

> 💡 無料枠は Aion Labs が設定するものであり、変更される可能性があります。最新の数値は [www.aionlabs.ai](https://www.aionlabs.ai) で確認してください — そしてツール自身のゲートに判断させましょう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全 6 種類

`GET /v1/models` は**キーなしで 200** を返し、**6 個の id** を列挙します。キーなしのチャット呼び出しは `401 {"detail":"Authentication credentials were not provided."}` を返します。

| モデル ID | コンテキスト | 入力 / 1M | 出力 / 1M | 検証済み |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **すべてのキーで chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **すべてのキーで chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | レーンのキーで chat-200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | 掲載 |
| `aion-labs/aion-3.5-mini` | 256K | — | — | 掲載 |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | 掲載 (ロールプレイ、8B) |

> ⚠️ **ゲートがすでに対処している 2 つの癖。** reasoning フィールドは `reasoning_content` ではなく **`reasoning`** であり、mini/3.5 モデルは答える前に考えます。`max_tokens` が約 512 未満だと、返答は `content:""` と `finish_reason:"length"` になります。CLI はデフォルトで **512** を要求します (`--max-tokens`)。これより小さい予算では、生きているキーが死んでいるように見えてしまいます。

## 🧪 API の使い方

ベース URL は **`https://api.aionlabs.ai/v1`** — OpenAI 互換なので、これに向けた任意の OpenAI SDK やクライアントが動作します。

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

生きているキーは 60〜100 トークンの補完に対して **1.5〜2.6 秒**で応答します。パネルはレート制限ヘッダーを返さない (`x-request-id` のみ) ため、15 RPM / 20k TPD の上限は黙って適用されます。

## 🛠 クイックスタート

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings

# or: node src/cli.js --count 10 --pool proxies.txt
```

ブラウザのステップにはマシン上に **Chrome または Chromium** が必要です (デフォルトの場所にない場合は `--browser <exe>` または `CHROME_PATH`)。キーは `/v1/chat/completions` が実際のコンテンツとともに 200 を返した**後にのみ** `keys.txt` に書き込まれます。`accounts.jsonl` はアドレス、パスワード、キー名、ゲート結果を保持します。

キー 1 つにつきアカウント 1 つ: `--count N` は実質的に「N 個の無料アカウント」です。temp.tf プールのメールボックスがパネルに既知であることが判明した場合 (`[Aion Labs] Account Already Exists`) や、Turnstile ウィジェットが停止した場合、ツールは自動的にロールします。

### 🖱️ ランチャー

ランチャーはプロキシリスト (任意 — なしの場合は CLI は直接実行)、カウント、モデルを尋ね、それらを `launcher.config.json` に記憶し、CLI を実行します: **mint**、**verify**、**screen** (サインアップゲートに対して出口をテスト)、**settings**、**help**、**Connect to 9Router**。

## ✅ 動作検証済み — すべてのキーがテストされる

| チェック | 結果 |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**、キー不要、**6 個のモデル id** |
| キーなしの `POST /v1/chat/completions` | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**、allauth フォーム (`#id_email`、`#id_password1/2`、`#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| サインアップ送信 | **200 → `/accounts/confirm-email/`**、Turnstile トークン 730 文字、可視 Chrome でページ自身のウィジェットによって解決 |
| 確認メール | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`、送信後**約 10 秒**; リンク `…/accounts/confirm-email/<key>/` → `/app/` に着地 |
| `POST /accounts/login/` (確認済みアカウント) | セッション確立 (それでも後続の `/app/` GET は **403** を返す — 無害) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**、`alv2_…` キー (48 文字) がインラインで返される |
| `POST /v1/chat/completions` | **10** 個すべてのキーで `content:"OK"` とともに **200** (`aion-3.0-mini` と `aion-3.5`) |
| 未確認アカウントのログイン | `/accounts/confirm-email/` で **405** — 認証は本当に必須 |
| すでに登録済みの共有 temp.tf メールボックス | サインアップがパスワードリセットリンク付きの `"[Aion Labs] Account Already Exists"` を送信 — ツールは新しいアドレスにロールする |

> **品質ゲート。** ここにあるすべてのキーは、`keys.txt` に書き込まれる前に実際の `chat-200` を通過しています
> (死んだキーは決して出荷されません)。ルーターのコンボもモデルレベルで同じルールに従います: エントリは
> **モデルが `chat-200` を返し、かつツールを呼び出せる場合にのみ**追加されます — ツールサポートのないモデル、
> 死んだキー、死んだプロバイダは追加されずに破棄されます。検証ステップはいつでも再実行できます;
> 失敗は報告され、決して隠されません。

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| メールボックス | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | 実際の Microsoft メールボックスの plus エイリアス、キャプチャなし、`POST /api/check` が JSON として読み取る |
| 事前フィルタ | `POST /api/check` | すでに Aion のメールを保持しているボックスは上流に登録済み — サインアップを消費する前にロールする |
| サインアップ | `/accounts/signup/` 上の Chrome (CDP) | メール + パスワード ×2 + 規約を入力し、ページ自身の Turnstile トークンを待つ (停止した場合のみウィジェットをクリック) |
| 確認 | 同じブラウザセッションで開かれたメールリンク | `/app/` に着地しなければならない; `"Account Already Exists"` → ロール |
| キー | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | プレーン HTTP、ブラウザなし: ページから csrf、レスポンスからキー |
| ゲート | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`、`content` **または** `reasoning` = 生きている; その後にのみ `keys.txt` |

Chrome はアカウントごとに `--proxy-server` = そのアカウントの出口として、使い捨てプロファイルで起動され、アカウントが確認され次第閉じられます — これによりアカウント間でセッションが漏れることなく、実行全体がプール上に留まります。

## ⚙️ CLI オプション

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

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | 出口プール、1 行に 1 つ (`--pool` と同じ); なし = 直接 |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | ライブゲートに使用されるモデル |
| `CHROME_PATH` | 自動検出 | サインアップステップ用の Chrome/Chromium バイナリ |

## 🛰️ プロキシの背後で

**任意 — スケール時には推奨。** すべてのリクエストはリスト内の 1 つの出口を通り、ブラウザも同様です (Chrome はその出口を `--proxy-server` として受け取ります)。

- **プールあり:** `--pool proxies.txt` (または `AIONLABS_PROXIES`)。アカウントごとに 1 つの出口が固定されるため、サインアップ、確認、キー発行、ゲートがすべて同じアドレスから出ていきます — パネルが混在した痕跡を見ることはありません。死んだ出口はその試行を失敗させ、次のロールが次の出口を取ります。
- **フェイルクローズ:** 明示的な `--pool` が存在しないか、使用可能な出口行がない場合は**致命的エラー**であり、決して黙って直接実行にはなりません。環境変数 (ランチャーが設定するもの) は警告して代わりに直接実行にフォールバックします。
- **プールなし:** CLI は `running WITHOUT a proxy (direct)` と表示し、同じように動作します — 変わるのはパケットが出ていく場所だけです。
- `socks5://`、`socks5h://`、`http://`、`https://`、およびベアな `host:port` 行が受け入れられます; SOCKS5 認証付きの行は Chrome が認証できないため破棄されます (HTTP プロキシ認証は Fetch ドメインを通じて処理されます)。
- 出口の品質は出口の数よりも重要です: 公開リストは数時間で腐ります。`--screen` は実際の実行前に各行をサインアップページ**および** API に対してテストします。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | 1 行に 1 つのライブ検証済みキー (`alv2_…`、48 文字) — git 無視 |
| `accounts.jsonl` | アカウントごとのアドレス / パスワード / キー名 / キー / 出口 / ゲート結果 — git 無視 |
| `proxies.txt` | あなたの出口、1 行に 1 つ — git 無視 |
| `out/` | 実行ログ (`aionlabs-cli-<date>.log`) と失敗したキャプチャステップのスクリーンショット — git 無視 |

## 🔌 9Router に接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

デフォルト: `--9router-prefix aionlabs`、`--9router-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。モデルは `aionlabs/<model id>` として提供されます。

## 🔌 OmniRoute に接続

[OmniRoute](https://omniroute.online) はセルフホスト型の OpenAI 互換ルーターです:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-omniroute.js --api-key alv2_…
```

デフォルト: `--omniroute-prefix aionlabs`、`--omniroute-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。モデルは `aionlabs/<model id>` として提供されます。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダ | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 プロバイダが提供するもの | **$0 無料枠**、カード不要: 1 日あたりのクレジット枠、15 RPM、アカウントあたり 1 日 20k トークン |
| 🔑 1 つのキーで得られるもの | 独自のアカウント上の 1 つの `alv2_…` キー、`aion-labs/aion-3.0-mini` でチャット検証済み |
| 🌐 API の形 | OpenAI 互換: `POST https://api.aionlabs.ai/v1/chat/completions` (6 個のモデル id) |
| 🔒 あなたのデータ | 接触するのは `aionlabs.ai`、`api.aionlabs.ai`、あなたの受信トレイバックエンド、あなた自身のプロキシのみ; キーはあなたのマシンに留まります |

## 🐞 問題報告

Aion Labs がサインアップフォーム、Turnstile sitekey、確認メール、または api-keys ルートを変更した場合、ツールはそのステップで停止し、拒否をそのまま報告します (正確なステータス、着地したページ、または見たメールの件名)。**[issue を開いてください](../../issues)** コマンドと正確な出力を添えて。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>