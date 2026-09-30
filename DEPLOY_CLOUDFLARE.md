# 🚀 Guia de Publicação Gratuita no Cloudflare Workers & Cloudflare D1

Este guia detalha o passo a passo completo para exportar o **DUMA BETS** para o GitHub e hospedar o sistema de forma **100% gratuita** utilizando o **Cloudflare Workers** (Compute Edge & Static Assets) e **Cloudflare D1** (Banco de dados relacional serverless gratuito).

---

## 📌 Visão Geral da Arquitetura Híbrida

O projeto foi estruturado com compatibilidade dupla para garantir flexibilidade máxima:
1. **Ambiente Local / Docker / AI Studio**: Utiliza o servidor Node.js/Express (`server.ts`) na porta 3000 com persistência local em `/data/db.json`.
2. **Ambiente Cloudflare Workers (Produção Edge Gratuita)**: Utiliza o entry point `src/worker/index.ts` e o banco relacional **Cloudflare D1**, servindo a interface React SPA diretamente pelos assets globais da Cloudflare (Edge CDN).

> **Nenhum recurso exige plano pago ou cartão de crédito.** O plano Cloudflare Workers Free disponibiliza:
> - 100.000 requisições diárias gratuitas de Worker.
> - 5 milhões de leituras de banco de dados D1 por dia.
> - 100.000 gravações D1 diárias.
> - Hospedagem de Assets estáticos ilimitada.

---

## 📋 Passo a Passo de Implantação

### 1. Exportar e Enviar para o GitHub

1. Inicialize o repositório git (se ainda não o fez):
   ```bash
   git init
   git add .
   git commit -m "feat: DUMA BETS - preparacao Cloudflare Workers e D1"
   ```
2. Crie um repositório no seu GitHub e envie o código:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/duma-bets.git
   git branch -M main
   git push -u origin main
   ```

---

### 2. Criar a Conta e Fazer Login no Wrangler CLI

1. Crie uma conta gratuita em [https://cloudflare.com](https://cloudflare.com) (não é necessário cadastrar cartão).
2. No seu computador ou terminal, faça login na Cloudflare:
   ```bash
   npx wrangler login
   ```
   *(Uma janela do navegador será aberta para autorizar o acesso).*

---

### 3. Criar o Banco de Dados Cloudflare D1 (Gratuito)

Execute o comando para provisionar a instância do banco D1:
```bash
npx wrangler d1 create duma-bets-db
```

O terminal exibirá uma saída similar a esta:
```text
✅ Successfully created DB 'duma-bets-db'!
[[d1_databases]]
binding = "DB"
database_name = "duma-bets-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copie o valor de `database_id` gerado e cole no arquivo `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "duma-bets-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # Seu ID aqui
```

---

### 4. Executar as Migrações SQL e Criar as Tabelas

Execute o arquivo de schema SQL diretamente no seu banco D1 na nuvem:
```bash
npx wrangler d1 execute duma-bets-db --file=./migrations/0001_d1_schema.sql --remote
```

Isso criará automaticamente:
- Tabelas: `users`, `matches`, `tickets`, `commissions`, `transactions`, `settings`, `api_providers`, `api_sync_logs`, `audit_logs`.
- Usuários padrão (`admin`, `cambista`, `jogador`).
- Configurações e registros iniciais.

---

### 5. Configurar as Secrets de APIs (Segurança Absoluta)

As chaves das APIs esportivas **nunca** devem ser colocadas no código ou no `wrangler.toml`. Cadastre-as como secrets criptografadas no Cloudflare Workers:

```bash
# Se utilizar The Odds API (opcional)
npx wrangler secret put ODDS_API_KEY

# Se utilizar Football-Data.org (opcional)
npx wrangler secret put FOOTBALL_API_KEY

# Se utilizar API-Football (opcional)
npx wrangler secret put SPORTS_API_KEY
```
*(O terminal solicitará o valor da chave de forma oculta e segura).*

> **Nota:** Se você não tiver chaves no momento, não se preocupe! O sistema operará normalmente com os dados da base de dados D1.

---

### 6. Gerar o Build e Fazer o Deploy

Gere os arquivos de produção do frontend React e publique no Cloudflare Workers:
```bash
# 1. Compilar o frontend React SPA
npm run build

# 2. Publicar na CDN e Edge da Cloudflare
npx wrangler deploy
```

O Wrangler exibirá a URL do seu site no ar:
```text
Uploaded duma-bets (dist)
Deployed duma-bets to:
https://duma-bets.SEU_SUBDOMINIO.workers.dev
```

Acesse o endereço fornecido. Sua plataforma estará **100% online, ultra rápida e com SSL automático gratuito**!

---

## 🔄 Deploy Contínuo Automatizado (GitHub Actions)

O arquivo `.github/workflows/deploy.yml` já está incluso no repositório. Para que qualquer `git push` publique seu site automaticamente:

1. Obtenha um API Token na Cloudflare em **My Profile > API Tokens > Create Token > Edit Cloudflare Workers**.
2. No seu repositório GitHub, acesse **Settings > Secrets and variables > Actions > New repository secret**:
   - `CLOUDFLARE_API_TOKEN`: Seu token gerado.
   - `CLOUDFLARE_ACCOUNT_ID`: Seu Account ID exibido no painel da Cloudflare.
3. Pronto! Toda vez que fizer um push na branch `main`, o build e o deploy serão executados sozinhos.
