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

**Aion Labs hesaplarını otomatik oluşturulan API anahtarlarıyla toplu oluşturun — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-6-of-them) · [🧪 API'yi kullanın](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

Aion Labs (`aionlabs.ai`), Cloudflare arkasında bir Django + **django-allauth** panelidir ve kayıt işleminin iki zorlu kapısı vardır: gerçek bir **Cloudflare Turnstile** widget'ı (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, token alanı `cf-turnstile-response`) ve **zorunlu e-posta doğrulaması** — onaylanmamış bir hesapla giriş yapmak `/accounts/confirm-email/` adresine **405** ile yönlendirilir, yani gelen kutusunu okumadan kestirme yol yoktur. Postadan sonraki her şey düz HTTP'dir: `POST /accounts/login/` captcha istemez, oturum çerezi `/app/api-keys/` adresini açar ve `POST /app/api-keys/create/` `alv2_…` anahtarını satır içinde döndürür. Bu aracın otomatikleştirdiği tüm hat budur.

Bu hattın kendi çalışması, hem `aion-labs/aion-3.0-mini` hem de `aion-labs/aion-3.5` üzerinde **doğrulanmış anahtarlar** (`content:"OK"`, `finish_reason:stop`) elde etti; ölçek geçişi, tek bir tarayıcı oturumu ve sabitlenmiş bir çıkış üzerinden 8 kayıt denemesinde 6 anahtar üretti (anahtar başına ~56 sn).

## 🎁 Ücretsiz katman — ne kadar alırsınız

| Ne | Değer |
| --- | --- |
| Kayıtta plan | **Ücretsiz** — `$0`, **kart yok** (`/pricing`: "agent işlerini, API'yi ve tarayıcı sohbetini denemek için günlük kredi hakkı") |
| Dakika başına istek | **15** |
| Dakika başına token | **20.000** |
| Gün başına token | **20.000** — ücretsiz katmanın katı günlük üst sınırı |
| Daha yüksek katmanlar | yalnızca yaşam boyu kredi yüklemesiyle ($1 … $1.000); bir katman asla düşürülmez |
| Faturalama birimi | **hesap başına** — kota hesapta yaşar, bu yüzden bu araç anahtar başına bir hesap oluşturur |
| E-posta kapısı | **zorunlu** (allauth); onaylanmamış giriş → `/accounts/confirm-email/` adresinde `405` |
| Telefon / kart | hiçbiri |

N anahtarla N hesabınız olur, yani **N × 20.000 token/gün** ve her biri 15 RPM. Günlük sayaç IP başına değil, hesap başına sıfırlanır.

> 💡 Ücretsiz katman Aion Labs tarafından belirlenir ve değişebilir. Güncel sayıları [www.aionlabs.ai](https://www.aionlabs.ai) adresinden kontrol edin — ve kararı aracın kendi kapısına bırakın:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modeller — 6'sının tamamı

`GET /v1/models` **anahtar olmadan 200** yanıtlar ve **6 id** listeler; anahtarsız bir sohbet çağrısı `401 {"detail":"Authentication credentials were not provided."}` yanıtlar.

| Model ID | Bağlam | Girdi / 1M | Çıktı / 1M | Doğrulandı |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **doğrulandı** |
| `aion-labs/aion-3.5` | 256K | — | — | **doğrulandı** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | hat anahtarlarında chat-200 |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | listelendi |
| `aion-labs/aion-3.5-mini` | 256K | — | — | listelendi |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | listelendi (roleplay, 8B) |

> ⚠️ **Kapının zaten ele aldığı iki tuhaflık.** Akıl yürütme alanı `reasoning_content` değil **`reasoning`**'dir ve mini/3.5 modelleri yanıtlamadan önce düşünür: `max_tokens` ~512'nin altında olduğunda yanıt `content:""` ve `finish_reason:"length"` olarak döner. CLI varsayılan olarak **512** ister (`--max-tokens`); daha küçük bir bütçe, doğrulanmış bir anahtarı ölü gibi gösterir.

## 🧪 API nasıl kullanılır

Temel URL **`https://api.aionlabs.ai/v1`** — OpenAI uyumlu, yani ona yönlendirilen herhangi bir OpenAI SDK'sı veya istemcisi çalışır.

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

Doğrulanmış bir anahtar, 60–100 token'lık bir tamamlama için **1,5–2,6 sn** içinde yanıt verir. Panel hiçbir hız sınırı başlığı döndürmez (yalnızca `x-request-id`), bu yüzden 15 RPM / 20k TPD üst sınırları sessizce uygulanır.

## 🛠 Hızlı başlangıç

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

Tarayıcı adımı makinede **Chrome veya Chromium** gerektirir (varsayılan konumda değilse `--browser <exe>` veya `CHROME_PATH`). Bir anahtar `keys.txt` dosyasına **yalnızca** `/v1/chat/completions` gerçek içerikle 200 yanıtladıktan sonra yazılır; `accounts.jsonl` adresi, parolayı, anahtar adını ve kapı sonucunu saklar.

Anahtar başına bir hesap: `--count N` aslında "N ücretsiz hesap" demektir. Bir temp.tf havuz posta kutusunun panel tarafından bilindiği ortaya çıktığında (`[Aion Labs] Account Already Exists`) veya Turnstile widget'ı takıldığında araç otomatik olarak yeniden dener.

### 🖱️ Başlatıcı

Başlatıcı proxy listesini (isteğe bağlı — olmadan CLI doğrudan çalışır), sayıyı ve modeli sorar, bunları `launcher.config.json` içinde hatırlar ve CLI'yi çalıştırır: **mint**, **verify**, **screen** (çıkışları kayıt kapısına karşı test eder), **settings**, **help** ve **Connect to 9Router**.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

> **Kalite kapıları.** Buradaki her anahtar `keys.txt` dosyasına yazılmadan önce canlı bir `chat-200` geçti
> (ölü anahtarlar asla gönderilmez). Yönlendirici kombinasyonları model düzeyinde aynı kuralı izler: bir giriş
> **yalnızca model `chat-200` yanıtlıyorsa ve araçları çağırabiliyorsa** eklenir — araç desteği olmayan bir model,
> ölü bir anahtar veya ölü bir sağlayıcı eklenmek yerine çıkarılır. **9Router ve OmniRoute** ile çalışır.

| Kontrol | Sonuç |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, anahtar yok, **6 model id** |
| `POST /v1/chat/completions` anahtarsız | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, allauth formu (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| kayıt gönderimi | **200 → `/accounts/confirm-email/`**, Turnstile token'ı 730 karakter, görünür bir Chrome'da sayfanın kendi widget'ı tarafından çözüldü |
| onay postası | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`, gönderimden **~10 sn** sonra; bağlantı `…/accounts/confirm-email/<key>/` → `/app/` adresine iner |
| `POST /accounts/login/` (onaylanmış hesap) | oturum kuruldu (buna rağmen takip eden `/app/` GET'i **403** yanıtlar — zararsız) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, `alv2_…` anahtarı (48 karakter) satır içinde döndü |
| `POST /v1/chat/completions` | **10** anahtarın tamamında `content:"OK"` ile **200** (`aion-3.0-mini` ve `aion-3.5`) |
| onaylanmamış hesap girişi | `/accounts/confirm-email/` adresinde **405** — doğrulama gerçekten zorunlu |
| zaten kayıtlı paylaşılan temp.tf posta kutusu | kayıt `"[Aion Labs] Account Already Exists"` postalar ve parola sıfırlama bağlantısı içerir — araç yeni bir adrese geçer |

## 🧭 Nasıl çalışır

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| posta kutusu | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | gerçek bir Microsoft posta kutusunda plus takma adı, captcha yok, `POST /api/check` bunu JSON olarak okur |
| ön filtre | `POST /api/check` | halihazırda Aion postası taşıyan bir kutu yukarı akışta kayıtlıdır — bir kayıt harcamadan önce yeniden dene |
| kayıt | `/accounts/signup/` üzerinde Chrome (CDP) | e-posta + parola ×2 + koşulları doldurur, sayfanın kendi Turnstile token'ını bekler (yalnızca takılırsa widget'a tıklar) |
| onay | aynı tarayıcı oturumunda açılan posta bağlantısı | `/app/` adresine inmeli; `"Account Already Exists"` → yeniden dene |
| anahtar | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | düz HTTP, tarayıcı yok: csrf sayfadan, anahtar yanıttan |
| kapı | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **veya** `reasoning` = canlı; ancak o zaman `keys.txt` |

Chrome, hesap başına `--proxy-server` = o hesabın çıkışı olacak şekilde, tek kullanımlık bir profilde başlatılır ve hesap onaylanır onaylanmaz kapatılır — böylece hesaplar arasında oturum sızmaz ve tüm çalışma havuzda kalır.

## ⚙️ CLI seçenekleri

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

| Ortam | Varsayılan | Anlam |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | çıkış havuzu, satır başına bir tane (`--pool` ile aynı); yoksa = doğrudan |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | canlı kapı için kullanılan model |
| `CHROME_PATH` | otomatik algılanır | kayıt adımı için Chrome/Chromium ikili dosyası |

## 🛰️ Proxy arkasında

**İsteğe bağlı — ölçekte önerilir.** Her istek listenizden bir çıkıştan geçer ve tarayıcı da öyle (Chrome bu çıkışı `--proxy-server` olarak alır).

- **Havuzla:** `--pool proxies.txt` (veya `AIONLABS_PROXIES`). Hesap başına bir çıkış sabitlenir, böylece kayıt, onay, anahtar üretimi ve kapı hepsi aynı adresten çıkar — panel hiçbir zaman karışık bir iz görmez. Ölü bir çıkış o denemeyi başarısız kılar ve bir sonraki tur bir sonraki çıkışı alır.
- **Fail-closed:** eksik olan veya kullanılabilir çıkış satırı olmayan açık bir `--pool` **ölümcül bir hatadır**, asla sessiz bir doğrudan çalıştırma değildir. Ortam değişkeni (başlatıcının ayarladığı) uyarır ve doğrudana geri döner.
- **Havuz olmadan:** CLI `running WITHOUT a proxy (direct)` yazdırır ve aynı şekilde çalışır — yalnızca paketlerin nereden çıktığı değişir.
- `socks5://`, `socks5h://`, `http://`, `https://` ve çıplak `host:port` satırları kabul edilir; kimlik doğrulamalı SOCKS5 satırları çıkarılır çünkü Chrome bunlara kimlik doğrulayamaz (HTTP proxy kimlik doğrulaması Fetch alanı üzerinden işlenir).
- Çıkış kalitesi çıkış sayısından daha önemlidir: genel listeler saatler içinde çürür. `--screen`, gerçek bir çalıştırmadan önce her satırı kayıt sayfasına **ve** API'ye karşı test eder.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | satır başına bir canlı doğrulanmış anahtar (`alv2_…`, 48 karakter) — git tarafından yok sayılır |
| `accounts.jsonl` | hesap başına adres / parola / anahtar adı / anahtar / çıkış / kapı sonucu — git tarafından yok sayılır |
| `proxies.txt` | çıkışlarınız, satır başına bir tane — git tarafından yok sayılır |
| `out/` | çalıştırma günlüğü (`aionlabs-cli-<date>.log`) ve başarısız captcha adımlarının ekran görüntüleri — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456

```

## 🔌 OmniRoute'a bağlan

[OmniRoute](https://omniroute.online) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Varsayılanlar: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Modeller `aionlabs/<model id>` olarak sunulur.

## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 Sağlayıcının verdikleri | **$0 ücretsiz katman**, kart yok: günlük kredi hakkı, 15 RPM, hesap başına günlük 20k token |
| 🔑 Bir anahtarın size kazandırdıkları | kendi hesabında bir `alv2_…` anahtarı, `aion-labs/aion-3.0-mini` üzerinde sohbet doğrulamalı |
| 🌐 API şekli | OpenAI uyumlu: `POST https://api.aionlabs.ai/v1/chat/completions` (6 model id) |
| 🔒 Verileriniz | yalnızca `aionlabs.ai`, `api.aionlabs.ai`, gelen kutunuzun arka ucu ve kendi proxy'nizle iletişim kurulur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Aion Labs kayıt formunu, Turnstile sitekey'ini, onay postasını veya api-keys rotasını değiştirirse, araç o adımda durur ve reddi kelimesi kelimesine bildirir (tam durum kodu, indiği sayfa veya gördüğü posta konusu). Komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey katkıda bulunanlar

</div>