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

**Crie contas Aion Labs em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-6%20served-412991?style=for-the-badge)](https://www.aionlabs.ai/docs/models/)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Início rápido](#-quick-start) · [🎁 Nível gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-6-of-them) · [🧪 Use a API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Como funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Opções](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Por que isso existe

Aion Labs (`aionlabs.ai`) é um painel Django + **django-allauth** atrás do Cloudflare, e seu cadastro tem dois portões rígidos: um widget real do **Cloudflare Turnstile** (`sitekey 0x4AAAAAAAz_ySGy6QN0NLcx`, campo de token `cf-turnstile-response`) e **verificação de e-mail obrigatória** — fazer login com uma conta não confirmada é redirecionado para `/accounts/confirm-email/` com um **405**, então não há atalho para evitar ler a caixa de entrada. Tudo depois do e-mail é HTTP puro: `POST /accounts/login/` não exige captcha, o cookie de sessão abre `/app/api-keys/`, e `POST /app/api-keys/create/` retorna a chave `alv2_…` inline. Esse é todo o trilho que esta ferramenta automatiza.

A execução da própria lane teve **chaves verificadas** (`content:"OK"`, `finish_reason:stop`) tanto em `aion-labs/aion-3.0-mini` quanto em `aion-labs/aion-3.5`; a passada em escala gerou 6 chaves em 8 tentativas de cadastro (~56 s por chave) através de uma sessão de navegador e uma saída fixada.

## 🎁 Nível gratuito — quanto você recebe

| O quê | Valor |
| --- | --- |
| Plano no cadastro | **Free** — `$0`, **sem cartão** (`/pricing`: "a daily credit allowance to try agent jobs, the API, and browser chat") |
| Requisições por minuto | **15** |
| Tokens por minuto | **20,000** |
| Tokens por dia | **20,000** — o limite diário rígido do nível gratuito |
| Níveis superiores | apenas por recarga de crédito vitalício ($1 … $1,000); um nível nunca é reduzido |
| Unidade de cobrança | **por conta** — a cota fica na conta, e é por isso que esta ferramenta cria uma conta por chave |
| Portão de e-mail | **obrigatório** (allauth); login não confirmado → `405` em `/accounts/confirm-email/` |
| Telefone / cartão | nenhum |

Com N chaves você tem N contas, ou seja, **N × 20,000 tokens/dia** e 15 RPM cada. O contador diário é redefinido por conta, não por IP.

> 💡 O nível gratuito é definido pela Aion Labs e pode mudar. Confira os números ao vivo em [www.aionlabs.ai](https://www.aionlabs.ai) — e deixe o próprio portão da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 6

`GET /v1/models` responde **200 sem chave** e lista **6 ids**; uma chamada de chat sem chave responde `401 {"detail":"Authentication credentials were not provided."}`.

| ID do modelo | Contexto | Entrada / 1M | Saída / 1M | Verificado |
| --- | --- | --- | --- | --- |
| `aion-labs/aion-3.0-mini` | 128K | $0.70 | $1.40 | **verificado** |
| `aion-labs/aion-3.5` | 256K | — | — | **verificado** |
| `aion-labs/aion-2.0` | 128K | $0.80 | $1.60 | chat-200 nas chaves da lane |
| `aion-labs/aion-3.0` | 128K | $3.00 | $6.00 | listado |
| `aion-labs/aion-3.5-mini` | 256K | — | — | listado |
| `aion-labs/aion-rp-llama-3.1-8b` | 32K | — | — | listado (roleplay, 8B) |

> ⚠️ **Duas peculiaridades que o portão já trata.** O campo de raciocínio é **`reasoning`**, não `reasoning_content`, e os modelos mini/3.5 pensam antes de responder: com `max_tokens` abaixo de ~512 a resposta volta como `content:""` com `finish_reason:"length"`. A CLI pede **512** por padrão (`--max-tokens`); um orçamento menor faz uma chave verificada parecer morta.

## 🧪 Como usar a API

URL base **`https://api.aionlabs.ai/v1`** — compatível com OpenAI, então qualquer SDK ou cliente OpenAI apontado para ela funciona.

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

Uma chave verificada responde em **1.5–2.6 s** para uma conclusão de 60–100 tokens. O painel não retorna cabeçalhos de limite de taxa (apenas `x-request-id`), então os tetos de 15 RPM / 20k TPD são aplicados silenciosamente.

## 🛠 Início rápido

```bash
cd aionlabs-bulk-apikey
printf 'socks5://host:port\n' > proxies.txt   # optional — every request, Chrome included, goes through it
node src/launcher.js                     # interactive: mint / verify / screen / settings
# or: node src/cli.js --count 10 --pool proxies.txt
```

A etapa do navegador precisa do **Chrome ou Chromium** na máquina (`--browser <exe>` ou `CHROME_PATH` se não estiver no local padrão). Uma chave é gravada em `keys.txt` **somente** depois que `/v1/chat/completions` responde 200 com conteúdo real; `accounts.jsonl` mantém o endereço, a senha, o nome da chave e o resultado do portão.

Uma conta por chave: `--count N` na verdade significa "N contas gratuitas". A ferramenta troca automaticamente quando uma caixa postal do pool temp.tf é reconhecida pelo painel (`[Aion Labs] Account Already Exists`) ou quando o widget Turnstile trava.

### 🖱️ O launcher

O launcher pede a lista de proxies (opcional — sem uma, a CLI roda direto), a contagem e o modelo, memoriza-os em `launcher.config.json`, e executa a CLI: **mint**, **verify**, **screen** (testa as saídas contra o portão de cadastro), **settings**, **help** e **Connect to 9Router**.

## ✅ Verificado e funcionando — toda chave é testada

> **Portões de qualidade.** Toda chave aqui passou por um `chat-200` ao vivo antes de ser gravada em `keys.txt`
> (chaves mortas nunca são entregues). As combinações do roteador seguem a mesma regra no nível do modelo: uma entrada é
> adicionada **somente se o modelo responder `chat-200` e puder chamar ferramentas** — um modelo sem suporte a ferramentas,
> uma chave morta ou um provedor morto é descartado em vez de adicionado. Funciona com **9Router e OmniRoute**.

| Verificação | Resultado |
| --- | --- |
| `GET https://api.aionlabs.ai/v1/models` | **200**, sem chave, **6 ids de modelo** |
| `POST /v1/chat/completions` sem chave | **401** `"Authentication credentials were not provided."` |
| `GET /accounts/signup/` | **200**, formulário allauth (`#id_email`, `#id_password1/2`, `#id_accept_terms`) + `div.cf-turnstile` (sitekey `0x4AAAAAAAz_ySGy6QN0NLcx`) |
| envio do cadastro | **200 → `/accounts/confirm-email/`**, token Turnstile de 730 caracteres, resolvido pelo próprio widget da página em um Chrome visível |
| e-mail de confirmação | `noreply@<panel-mail>` `"[Aion Labs] Please Confirm Your Email Address"`, **~10 s** após o envio; link `…/accounts/confirm-email/<key>/` → chega em `/app/` |
| `POST /accounts/login/` (conta confirmada) | sessão estabelecida (o GET seguinte em `/app/` responde **403** mesmo assim — inofensivo) |
| `GET /app/api-keys/` + `POST /app/api-keys/create/` | **200**, chave `alv2_…` (48 caracteres) retornada inline |
| `POST /v1/chat/completions` | **200** com `content:"OK"` em todas as **10** chaves (`aion-3.0-mini` e `aion-3.5`) |
| login de conta não confirmada | **405** em `/accounts/confirm-email/` — a verificação é realmente obrigatória |
| caixa postal temp.tf compartilhada já registrada | o cadastro envia `"[Aion Labs] Account Already Exists"` com um link de redefinição de senha — a ferramenta troca para um endereço novo |

## 🧭 Como funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Aion Labs page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://api.aionlabs.ai/v1/chat/completions → real content = the key is live
```

| Etapa | Chamada | Notas |
| --- | --- | --- |
| caixa postal | temp.tf `GET /api/account?providers=hotmail,outlook&plus=1` | alias plus em uma caixa postal real da Microsoft, sem captcha, `POST /api/check` lê como JSON |
| pré-filtro | `POST /api/check` | uma caixa que já contém e-mail da Aion está registrada upstream — troque antes de gastar um cadastro |
| cadastro | Chrome (CDP) em `/accounts/signup/` | preenche e-mail + senha ×2 + termos, aguarda o token Turnstile da própria página (clica no widget apenas se travar) |
| confirmação | link do e-mail aberto na mesma sessão do navegador | deve chegar em `/app/`; `"Account Already Exists"` → trocar |
| chave | `POST /accounts/login/` → `GET /app/api-keys/` → `POST /app/api-keys/create/` | HTTP puro, sem navegador: csrf da página, chave da resposta |
| portão | `POST /api.aionlabs.ai/v1/chat/completions` | `max_tokens: 512`, `content` **ou** `reasoning` = ativo; só então `keys.txt` |

O Chrome é iniciado por conta com `--proxy-server` = a saída daquela conta, em um perfil descartável, e fechado assim que a conta é confirmada — assim nenhuma sessão vaza entre contas e toda a execução permanece no pool.

## ⚙️ Opções da CLI

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

| Env | Padrão | Significado |
| --- | --- | --- |
| `AIONLABS_PROXIES` | — | pool de saídas, uma por linha (igual a `--pool`); ausente = direto |
| `AIONLABS_MODEL` | `aion-labs/aion-3.0-mini` | modelo usado para o portão ao vivo |
| `CHROME_PATH` | detectado automaticamente | binário do Chrome/Chromium para a etapa de cadastro |

## 🛰️ Atrás de um proxy

**Opcional — recomendado em escala.** Toda requisição passa por uma saída da sua lista, e o navegador também (o Chrome recebe essa saída como `--proxy-server`).

- **Com um pool:** `--pool proxies.txt` (ou `AIONLABS_PROXIES`). Uma saída é fixada por conta, então cadastro, confirmação, geração de chave e portão saem todos do mesmo endereço — o painel nunca vê um rastro misto. Uma saída morta falha naquela tentativa e a próxima troca pega a próxima saída.
- **Fail-closed:** um `--pool` explícito que está ausente ou não tem linha de saída utilizável é um **erro fatal**, nunca uma execução direta silenciosa. A variável de ambiente (que o launcher define) avisa e recorre ao direto.
- **Sem um pool:** a CLI imprime `running WITHOUT a proxy (direct)` e funciona da mesma forma — só muda de onde os pacotes saem.
- Linhas `socks5://`, `socks5h://`, `http://`, `https://` e `host:port` simples são aceitas; linhas SOCKS5-com-autenticação são descartadas porque o Chrome não consegue autenticar nelas (autenticação de proxy HTTP é tratada através do domínio Fetch).
- A qualidade da saída importa mais que a quantidade: listas públicas apodrecem em horas. `--screen` testa cada linha contra a página de cadastro **e** a API antes de uma execução real.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | uma chave verificada ao vivo por linha (`alv2_…`, 48 caracteres) — ignorado pelo git |
| `accounts.jsonl` | endereço / senha / nome da chave / chave / saída / resultado do portão por conta — ignorado pelo git |
| `proxies.txt` | suas saídas, uma por linha — ignorado pelo git |
| `out/` | log de execução (`aionlabs-cli-<date>.log`) e capturas de tela das etapas de captcha com falha — ignorado pelo git |

## 🔌 Conectar ao 9Router

[9Router](https://9router.com) é um roteador auto-hospedado, compatível com OpenAI:

```bash
node src/cli.js --connect-9router --9router-base http://localhost:20128 --9router-password 123456

```

## 🔌 Conectar ao OmniRoute

[OmniRoute](https://omniroute.online) é um roteador auto-hospedado, compatível com OpenAI:

```bash
node src/cli.js --connect-omniroute --omniroute-base http://localhost:20128 --omniroute-password 123456
# or the standalone connector shipped next to the CLI:
node src/connect-9router.js --api-key alv2_…
```

Padrões: `--9router-prefix aionlabs`, `--9router-name Aion Labs`, `--base-url https://api.aionlabs.ai/v1`, `--model aion-labs/aion-3.0-mini`. Os modelos são servidos como `aionlabs/<model id>`.

## 🔑 O que uma chave te dá

| | |
| --- | --- |
| 🏢 Provedor | **Aion Labs** — [aionlabs.ai](https://www.aionlabs.ai) |
| 🎁 O que o provedor oferece | **nível gratuito de $0**, sem cartão: uma cota diária de créditos, 15 RPM, 20k tokens/dia por conta |
| 🔑 O que uma chave te dá | uma chave `alv2_…` em sua própria conta, verificada por chat em `aion-labs/aion-3.0-mini` |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://api.aionlabs.ai/v1/chat/completions` (6 ids de modelo) |
| 🔒 Seus dados | apenas `aionlabs.ai`, `api.aionlabs.ai`, seu backend de caixa postal e seu próprio proxy são contatados; as chaves ficam na sua máquina |

## 🐞 Problemas

Se a Aion Labs mudar seu formulário de cadastro, seu sitekey do Turnstile, o e-mail de confirmação ou a rota de api-keys, a ferramenta para nessa etapa e relata a recusa literalmente (o status exato, a página em que chegou, ou o assunto do e-mail que viu). **[Abra uma issue](../../issues)** com o comando e a saída exata.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 aionlabs-bulk-apikey contributors

</div>