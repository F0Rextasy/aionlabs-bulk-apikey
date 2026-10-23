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

**自動生成された API キーで Aion Labs アカウントを一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[⚡ コマンド一発](#-one-command) · [🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-6-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [⚠️ 規約](#️-terms-and-account-risk) · [🐞 問題報告](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ なぜこれが存在するのか

Aion Labs (`aionlabs.ai`) は Cloudflare の背後にある Django + **django-allauth** のパネルで、そのサインアップには 2 つの厳しい関門があります。本物の **Cloudflare Turnstile** ウィジェット（`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`、トークンフィールド `cf-turnstile-response`）と、**必須のメール認証**です — 未確認のアカウントでログインすると `/accounts/confirm-email/` に **405** で弾かれるため、受信トレイを読む以外に近道はありません。メール以降はすべてプレーンな HTTP です。`POST /accounts/login/` はキャプチャを要求せず、セッション Cookie が `/app/api-keys/` を開き、`POST /app/api-keys/create/` が `alv2_…` キーをインラインで返します。このツールが自動化するのは、まさにこの一連の流れです。

このレーンの実運用では **各アカウントがそれぞれ自分のキーを発行し、`aion-labs/aion-3.0-mini` と `aion-labs/aion-3.5` の両方でライブチャットが 200**（`content:"OK"`、`finish_reason:stop`）を返したものだけが保持されました。スケール時の実行では、1 つのブラウザセッションと固定した出口を通じて 8 回のサインアップ試行でキーを発行しました（キーあたり約 56 秒）。

## 🎁 無料枠 — いくら使えるか

| 項目 | 値 |
| --- | --- |
| サインアップ時のプラン | **Free** — `$0`、**カード不要**（`/pricing`: 「エージェントジョブ、API、ブラウザチャットを試すための 1 日あたりのクレジット枠」） |
| 1 分あたりのリクエスト数 | **15** |
| 1 分あたりのトークン数 | **20,000** |
| 1 日あたりのトークン数 | **20,000** — 無料枠の 1 日あたりの厳格な上限 |
| 上位プラン | 生涯クレジットの追加購入（$1 … $1,000）のみ。プランが引き下げられることはない |
| 課金単位 | **アカウント単位** — クォータはアカウントに紐づくため、このツールは 1 キーにつき 1 アカウントを作成する |
| メール関門 | **必須**（allauth）。未確認でのログイン → `/accounts/confirm-email/` にて `405` |
| 電話 / カード | どちらも不要 |

N 個のキーがあれば N 個のアカウントを保有することになり、すなわち **N × 20,000 トークン/日**、それぞれ 15 RPM です。1 日ごとのカウンターは IP 単位ではなくアカウント単位でリセットされます。

> 💡 無料枠は Aion Labs が設定するもので、変更される可能性があります。最新の数値は [www.aionlabs.ai](https://www.aionlabs.ai) で確認してください — そして最終判断はツール自身の関門に任せましょう：

```bash
node src/cli.js --verify-only     # keys.txt の各キーを実際のチャット呼び出しで再テスト
```

## 🤖 モデル — 全 6 種

`GET /v1/models` は**キーなしで 200** を返し、**6 個の id** を列挙します。キーなしのチャット呼び出しは `401 {"detail":"Authentication credentials were not provided."}` を返します。

| モデル ID | コンテキスト | 入力 / 1M | 出力 / 1M | 検証状況 |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **全キー、chat-200** |
| `aion-labs/aion-3.5` | 256K | — | — | **全キー、chat-200** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | レーンキーで chat-200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | 掲載のみ |
| `aion-labs/aion-3.5-mini` | 256K | — | — | 掲載のみ |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | 掲載のみ（ロールプレイ、8B） |

> ⚠️ **関門がすでに対処済みの 2 つの癖。** reasoning フィールドは `reasoning_content` ではなく **`reasoning`** であり、mini/3.5 モデルは答える前に考えます。`max_tokens` を約 512 未満にすると、応答は `content:""` かつ `finish_reason:"length"` で返ってきます。CLI はデフォルトで **512** を要求します（`--max-tokens`）。これより小さい予算では、生きているキーが死んでいるように見えてしまいます。

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

60～100 トークンの補完に対して、生きたキーは **1.5～2.6 秒**で応答します。パネルはレート制限ヘッダーを返しません（`x-request-id` のみ）ので、15 RPM / 20k TPD の上限は黙って適用されます。

## ⚡ コマンド一発

```bash
node src/cli.js --count N        # N アカウント → N キー、コマンド一発、答えるものは何もない
```

Cloudflare Turnstile ウィジェットは、それを載せているページ上で、実際の Chrome 内の組み込みブラウザエンジン（`src/solver.js`）によって解決されます — `--auto` は**デフォルト**で有効のままなので、貼り付けるキャプチャも、邪魔になるブラウザの質問もありません。`--dry` を指定すると、解決されたプラン（count、model、route、solver、Chrome のパス）が出力され、ファイルを書き込んだりソケットを開いたりせずに終了コード 0 で終了します：

```bash
node src/cli.js --count N --dry
```

`npm start`（または `node src/launcher.js`）はメニューから同じことを行います。**1) Mint keys** を選び、「How many keys?」に答える（Enter = 10）と `node src/cli.js --auto --count N` を実行します。`proxies.txt` が存在すれば自動的に読み込まれ、なければ実行は直接接続になります。

## 🛠 クイックスタート

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # 任意 — Chrome を含むすべてのリクエストがこれを通る
node src/launcher.js                     # 対話式: mint / verify / screen / settings
# または: node src/cli.js --count 10 --pool proxies.txt
```

ブラウザのステップには、マシン上に **Chrome または Chromium** が必要です（デフォルトの場所にない場合は `--browser <exe>` または `CHROME_PATH`）。キーは `/v1/chat/completions` が実際の内容とともに 200 を返した**後にのみ** `keys.txt` に書き込まれます。`accounts.jsonl` にはアドレス、パスワード、キー名、関門の結果が保存されます。

1 キーにつき 1 アカウント：`--count N` は実質的に「N 個の無料アカウント」です。temp.tf のプールメールボックスがパネルに既知であることが判明した場合（`[Aion Labs] Account Already Exists`）や、Turnstile ウィジェットが停止した場合、ツールは自動的に切り替えます。

### 🖱️ ランチャー

ランチャーはプロキシリスト（任意 — なければ CLI は直接実行）、カウント、モデルを尋ね、それらを `launcher.config.json` に記憶して CLI を実行します：**mint**、**verify**、**screen**（出口をサインアップ関門に対してテスト）、**settings**、**help**、**Connect to 9Router**。

## ✅ 検証済み — すべてのキーがテストされている

| チェック | 結果 |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**、キーなし、**6 個のモデル id** |
| キーなしの `POST /v1/chat/completions` | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**、allauth フォーム（`#id_email`、`#id_password1/2`、`#id_accept_terms`）+ `div.cf-turnstile`（sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`） |
| サインアップ送信 | **200 → `/accounts/confirm-email/`**、Turnstile トークン 730 文字、可視 Chrome 内のページ自身のウィジェットによって解決 |
| 確認メール | `noreply@mg.aionlabs.ai` `"[Aion Labs] Please Confirm Your Email Address"`、送信後**約 10 秒**。リンク `…/accounts/confirm-email/<key>/` → `/app/` に着地 |
| `POST /accounts/login/`（確認済みアカウント） | セッション確立（それでも後続の `/app/` GET は **403** を返す — 無害） |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**、`alv2_…` キー（48 文字）がインラインで返る |
| `POST /v1/chat/completions` | **10** 個すべてのキーで `content:"OK"` とともに **200**（`aion-3.0-mini` と `aion-3.5`） |
| 未確認アカウントのログイン | `/accounts/confirm-email/` にて **405** — 認証は本当に必須 |
| すでに登録済みの共有 temp.tf メールボックス | サインアップはパスワードリセットリンク付きの `"[Aion Labs] Account Already Exists"` をメール送信 — ツールは新しいアドレスに切り替える |

> **品質ゲート。** ここにあるすべてのキーは、`keys.txt` に書き込まれる前にライブの `chat-200` を通過しています
> （死んだキーは決して出荷されません）。ルーターのコンボもモデルレベルで同じルールに従います：エントリは
> **モデルが `chat-200` を返し、かつツール呼び出しができる場合にのみ**追加されます — ツールサポートのないモデル、
> 死んだキー、死んだプロバイダは追加されずに破棄されます。検証ステップはいつでも再実行できます。
> 失敗は報告され、決して隠されません。

## 🧭 仕組み

```
受信トレイ（1 アカウントにつき 1 アドレス）                          アカウントごとに新しいアドレス
   │
   ├─▶ サインアップ: Aion Labs ページ → メールアドレス → 受信トレイからのコード / リンク
   ├─▶ セッション: アカウントの Cookie またはアクセストークンを取得
   ├─▶ キー発行: アカウントのキーエンドポイント → 平文キーが一度だけ返る（即座にディスクへ書き込み）
   └─▶ ライブ証明: POST https://api.aionlabs.ai/v1/chat/completions → 実コンテンツ = キーは生きている
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| メールボックス | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | 実際の Microsoft メールボックスのプラスエイリアス、キャプチャなし、`POST /api/check` が JSON として読み取る |
| 事前フィルタ | `POST /api/check` | すでに Aion のメールを持つボックスは上流で登録済み — サインアップを消費する前に切り替える |
| サインアップ | `/accounts/signup/` 上の Chrome（CDP） | メール + パスワード ×2 + 規約を入力し、ページ自身の Turnstile トークンを待つ（停止した場合のみウィジェットをクリック） |
| 確認 | 同じブラウザセッションでメールリンクを開く | `/app/` に着地する必要がある。`"Account Already Exists"` → 切り替え |
| キー | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | プレーン HTTP、ブラウザなし：ページから csrf、レスポンスからキー |
| 関門 | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`、`content` **または** `reasoning` = 生きている。その後にのみ `keys.txt` |

Chrome はアカウントごとに `--proxy-server` = そのアカウントの出口として起動され、使い捨てのプロファイルで実行され、アカウントが確認されるとすぐに閉じられます — これによりアカウント間でセッションが漏れることはなく、実行全体がプール上に留まります。

## ⚙️ CLI オプション

```bash
node src/cli.js --count 10                        # 10 キーを発行（それぞれ 1 アカウント）
node src/cli.js --count 1 --model aion-labs/aion-3.5
node src/cli.js --count 5 --max-tokens 800        # 関門のためのより大きな思考予算
node src/cli.js --verify-only                     # keys.txt のすべてのキーを再チェック
node src/cli.js --verify-only --limit 5
node src/cli.js --screen                          # 出口をサインアップ関門に対してテスト
node src/cli.js --connect-9router                 # ローカル 9Router にプロバイダ + キーを登録
node src/cli.js --help
```

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | 出口プール、1 行に 1 つ（`--pool` と同じ）。なければ直接接続 |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | ライブ関門に使用するモデル |
| `CHROME_PATH` | 自動検出 | サインアップステップ用の Chrome/Chromium バイナリ |

## 🛰️ プロキシの背後で

**任意 — スケール時には推奨。** すべてのリクエストはリスト内の 1 つの出口を通り、ブラウザも同様です（Chrome はその出口を `--proxy-server` として受け取ります）。

- **プールあり:** `--pool proxies.txt`（または `AIONLABS_PROXIES`）。アカウントごとに 1 つの出口が固定されるため、サインアップ、確認、キー発行、関門がすべて同じアドレスから出ていきます — パネルが混在した痕跡を見ることはありません。死んだ出口はその試行を失敗させ、次の切り替えで次の出口が使われます。
- **フェイルクローズ:** 明示的な `--pool` が存在しないか、使用可能な出口行がない場合は**致命的エラー**であり、決して黙って直接実行されません。環境変数（ランチャーが設定するもの）の場合は警告して直接接続にフォールバックします。
- **プールなし:** CLI は `running WITHOUT a proxy (direct)` と出力し、同様に動作します — 変わるのはパケットが出ていく場所だけです。
- `socks5://`、`socks5h://`、`http://`、`https://`、およびベアな `host:port` 行が受け入れられます。SOCKS5 認証付きの行は、Chrome がそれらに対して認証できないため破棄されます（HTTP プロキシ認証は Fetch ドメインを通じて処理されます）。
- 出口の質は数よりも重要です：公開リストは数時間で朽ちます。`--screen` は実際の実行前に各行各をサインアップページ**および** API に対してテストします。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | 1 行につき 1 つのライブ検証済みキー（`alv2_…`、48 文字） — git 管理外 |
| `accounts.jsonl` | アカウントごとのアドレス / パスワード / キー名 / キー / 出口 / 関門結果 — git 管理外 |
| `proxies.txt` | あなたの出口、1 行に 1 つ — git 管理外 |
| `out/` | 実行ログ（`aionlabs-cli-<date>.log`）と失敗したキャプチャステップのスクリーンショット — git 管理外 |

## 🔌 9Router への接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです：

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456
# または CLI の隣に同梱されているスタンドアロンコネクタ：
node src/connect-9router.js --api-key alv2_…
```

デフォルト：`--9router-prefix aionlabs`、`--9router-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。モデルは `aionlabs/<model id>` として提供されます。

## 🔌 OmniRoute への接続

[OmniRoute](https://omniroute.online) はセルフホスト型の OpenAI 互換ルーターです：

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# または CLI の隣に同梱されているスタンドアロンコネクタ：
node src/connect-omniroute.js --api-key alv2_…
```

デフォルト：`--omniroute-prefix aionlabs`、`--omniroute-name Aion Labs`、`--base-url https://api.aionlabs.ai/v1`、`--model aion-labs/aion-3.0-mini`。モデルは `aionlabs/<model id>` として提供されます。

## 🔑 1 つのキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダ | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 プロバイダが提供するもの | **$0 無料枠**、カード不要：1 日あたりのクレジット枠、15 RPM、アカウントあたり 1 日 20k トークン |
| 🔑 1 つのキーで得られるもの | 独自のアカウント上の 1 つの `alv2_…` キー、`aion-labs/aion-3.0-mini` でチャット検証済み |
| 🌐 API の形 | OpenAI 互換：`POST https://api.aionlabs.ai/v1/chat/completions`（6 個のモデル id） |
| 🔒 あなたのデータ | 接触するのは `aionlabs.ai`、`api.aionlabs.ai`、あなたの受信トレイバックエンド、あなた自身のプロキシのみ。キーはあなたのマシンに留まります |

## ⚠️ 規約とアカウントのリスク

このツールはサインアップフローを自動化するため、**あなた**がその行為の責任を負います。プロバイダのサインアップを自動化することはそのプロバイダの利用規約に違反する可能性があり、アカウントが与える無料枠は、プロバイダがアカウント単位および IP 単位でいつでもスロットル、変更、取り戻すことのできるものです。作成が許可されているアカウントにのみ使用し、プロキシリストはあなた自身のものとして管理し、これらのキーを本番キャパシティとして扱わないでください。ここにあるものは、プロバイダのルールを回避するライセンスではありません。

## 🐞 問題報告

Aion Labs がサインアップフォーム、Turnstile sitekey、確認メール、または api-keys ルートを変更した場合、ツールはそのステップで停止し、拒否をそのまま報告します（正確なステータス、着地したページ、または確認したメールの件名）。コマンドと正確な出力を添えて **[issue を作成してください](../../issues)**。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>
