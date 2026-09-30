# DUMA BETS — Plataforma Profissional de Gestão de Apostas Esportivas

**DUMA BETS** é uma aplicação web full-stack de alta performance desenvolvida para gestão completa de bancas esportivas, cambistas (agentes), jogadores e bilhetes de apostas. A plataforma conta com arquitetura modular preparada para implantação no Google AI Studio, Docker e ambientes de nuvem em conformidade com as melhores práticas de segurança e regulamentação brasileira.

---

## 🚀 Principais Funcionalidades

### 1. Níveis de Acesso e Permissões
- **Administrador Master**: Acesso total ao sistema, dashboard analítico com gráficos financeiros e filtros de período, gerenciamento de jogos e odds, importação em lote, gerenciador de APIs, auditoria de logs e controle de cambistas.
- **Cambista (Agente)**: Painel exclusivo com link parametrizado (`?ref=SEUCODIGO`), cálculo automatizado de comissões individuais sobre o volume apostado, lista de clientes cadastrados e bilhetes emitidos.
- **Jogador (Cliente)**: Navegação rápida por campeonatos (Brasileirão Série A, Champions League, Premier League, Libertadores), cupom de apostas interativo simples e múltiplo, carteira com depósitos PIX instantâneos (QR Code + Copia e Cola) e histórico de bilhetes.

### 2. Importação e Sincronização Inteligente de Jogos
- Botões de importação em lote:
  - `IMPORTAR JOGOS DE HOJE`
  - `IMPORTAR JOGOS DE AMANHÃ`
  - `IMPORTAR PRÓXIMOS JOGOS`
  - `IMPORTAR 5 JOGOS`
  - `IMPORTAR 10 JOGOS`
- Tabela com seleção múltipla por checkboxes (`[x] Campeonato, Data, Horário, Mandante, Visitante, Status`) com botão `ADICIONAR SELECIONADOS / PUBLICAR`.
- Deduplicação automática: partidas já existentes não são recadastradas.
- Cache persistente no backend para evitar consumo excessivo de cotas de APIs externas.

### 3. Gerenciador de Provedores de API & Odds Gratuitas
- Catálogo nativo e extensível para provedores com plano gratuito legítimo:
  - **The Odds API** (`ODDS_API_KEY`): Cotações pré-jogo e ao vivo (500 requisições/mês grátis).
  - **Football-Data.org** (`FOOTBALL_API_KEY` ou `FSAPI_KEY`): Partidas, ligas e resultados (10 chamadas/min grátis).
  - **API-Football / API-Sports** (`SPORTS_API_KEY`): Cobertura ampla nacional e internacional (100 req/dia grátis).
- Botão "Testar Conexão" com feedback em tempo real de status da chave.
- Mensagem clara caso nenhuma API externa esteja configurada, permitindo a operação contínua e estável da plataforma com os dados do banco local.

### 4. Apuração Automática de Resultados
- Botão `ATUALIZAR RESULTADOS AGORA`: Processa o placar das partidas finalizadas, avalia todos os bilhetes pendentes (1X2, Mais/Menos Gols, Ambos Marcam, Dupla Chance), credita a premiação na carteira do usuário vencedor e atualiza a comissão do cambista correspondente.

### 5. Carteira e Pagamentos PIX
- Geração de código Copia e Cola no padrão EMV do Banco Central.
- Renderização dinâmica de QR Code para escaneamento via celular.
- Ambiente Sandbox para simulação de aprovação instantânea durante avaliações e testes.

### 6. Comprovante Térmico de Apostas (Bilhete)
- Código único curto (ex: `DM-71932`).
- Interface responsiva com layout específico para impressão em bobinas térmicas de 80mm (`@media print`).
- Compartilhamento direto no WhatsApp e consulta pública pelo código do bilhete.

---

## 🔑 Credenciais Padrão para Testes

Para facilitar a validação imediata no Google AI Studio, o sistema vem pré-configurado com os seguintes perfis:

| Perfil | Usuário / E-mail | Senha | Código Cambista |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin` ou `admin@dumabets.com` | `admin123` | - |
| **Cambista** | `cambista` ou `cambista@dumabets.com` | `cambista123` | `CARLOS10` (12%) |
| **Jogador** | `jogador` ou `jogador@dumabets.com` | `jogador123` | - |

*(No modal de login, há botões de acesso rápido que preenchem e conectam cada um desses perfis com apenas 1 clique).*

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide React, Motion.
- **Backend**: Node.js, Express, TSX.
- **Banco de Dados**: Armazenamento JSON atômico persistente com locking em disco (`/data/db.json`).
- **QR Code**: Geração SVG/DataURL nativa com a biblioteca `qrcode`.
- **Servidor Dev / Produção**: Vite com integração de middleware Express (`server.ts`).

---

## ⚙️ Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
# Porta do servidor full-stack
PORT=3000

# Chaves das APIs de Esportes (Opcionais no modo local, requeridas para chamadas ao vivo aos provedores)
FSAPI_KEY=""
FOOTBALL_API_KEY=""
ODDS_API_KEY=""
SPORTS_API_KEY=""

# URL base da aplicação (injetada automaticamente pelo Google AI Studio / Cloud Run)
APP_URL="http://localhost:3000"
```

---

## 📦 Como Executar Localmente

### 1. Instalar as dependências
```bash
npm install
```

### 2. Iniciar o servidor de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em [http://localhost:3000](http://localhost:3000).

### 3. Build de produção
```bash
npm run build
npm start
```

---

## 🐳 Executando com Docker & Docker Compose

Para rodar a aplicação em um container isolado:

```bash
docker-compose up --build -d
```

Acesse em [http://localhost:3000](http://localhost:3000).

Para visualizar os logs:
```bash
docker-compose logs -f
```

Para encerrar o container:
```bash
docker-compose down
```

---

## ⚡ Hospedagem Gratuita no Cloudflare Workers & D1

O projeto possui suporte nativo para publicação gratuita no **Cloudflare Workers Free** + **Cloudflare D1** (Serverless SQL).
Consulte o guia passo a passo completo em:
👉 [**DEPLOY_CLOUDFLARE.md**](./DEPLOY_CLOUDFLARE.md)

Comandos rápidos:
```bash
# 1. Criar o banco D1 gratuito
npx wrangler d1 create duma-bets-db

# 2. Executar as migrações SQL
npm run d1:migrate

# 3. Compilar e publicar no Cloudflare
npm run deploy:cf
```

---

## ⚖️ Conformidade e Jogo Responsável

A plataforma **DUMA BETS** adota mecanismos de proteção aos apostadores:
- Proibição estrita para menores de 18 anos.
- Limites configuráveis de aposta mínima, aposta máxima e retorno teto por bilhete.
- Rastreamento transparente de comissões e transações auditáveis.
