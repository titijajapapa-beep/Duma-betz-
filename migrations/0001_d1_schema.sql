-- ====================================================================
-- DUMA BETS - Cloudflare D1 (SQLite) Migration Schema
-- 100% Compatível com o Plano Gratuito do Cloudflare D1
-- ====================================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player', -- 'admin', 'agent', 'player'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'blocked'
  phone TEXT,
  balance REAL NOT NULL DEFAULT 0.0,
  agent_code TEXT,
  referred_by_agent_code TEXT,
  commission_rate REAL,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

-- 2. TABELA DE PARTIDAS
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  league TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'live', 'finished', 'cancelled'
  home_score INTEGER,
  away_score INTEGER,
  minute INTEGER,
  is_published INTEGER NOT NULL DEFAULT 1,
  markets_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. TABELA DE BILHETES DE APOSTAS
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  agent_code TEXT,
  items_json TEXT NOT NULL,
  stake REAL NOT NULL,
  total_odds REAL NOT NULL,
  potential_return REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'won', 'lost', 'cancelled'
  created_at TEXT NOT NULL,
  settled_at TEXT
);

-- 4. TABELA DE COMISSÕES DE CAMBISTAS
CREATE TABLE IF NOT EXISTS commissions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_code TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  ticket_code TEXT NOT NULL,
  bet_amount REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid'
  created_at TEXT NOT NULL,
  paid_at TEXT
);

-- 5. TABELA DE TRANSAÇÕES FINANCEIRAS (PIX / CARTEIRA)
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'bet_placed', 'bet_won'
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
  description TEXT NOT NULL,
  pix_key TEXT,
  pix_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

-- 6. TABELA DE CONFIGURAÇÕES GERAIS
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 7. TABELA DE PROVEDORES DE API
CREATE TABLE IF NOT EXISTS api_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  website TEXT NOT NULL,
  env_var TEXT NOT NULL,
  description TEXT NOT NULL,
  free_tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unconfigured',
  request_count INTEGER NOT NULL DEFAULT 0,
  requests_remaining INTEGER,
  latency_ms INTEGER,
  limit_info TEXT NOT NULL,
  last_sync_at TEXT,
  last_error TEXT,
  diagnostics TEXT
);

-- 8. TABELA DE LOGS DE SINCRONIZAÇÃO
CREATE TABLE IF NOT EXISTS api_sync_logs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  items_imported INTEGER NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL
);

-- 9. TABELA DE AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

-- ====================================================================
-- SEED DATA INICIAL
-- ====================================================================

-- Usuários padrão para testes
INSERT OR IGNORE INTO users (id, name, username, email, password, role, status, phone, balance, agent_code, commission_rate, created_at)
VALUES 
('usr-admin-1', 'Administrador Master', 'admin', 'admin@dumabets.com', 'admin123', 'admin', 'active', '+55 11 99999-1111', 10000.0, NULL, NULL, datetime('now')),
('usr-agent-1', 'Carlos Cambista', 'cambista', 'cambista@dumabets.com', 'cambista123', 'agent', 'active', '+55 11 98888-2222', 450.0, 'CARLOS10', 12.0, datetime('now')),
('usr-player-1', 'Lucas Silva', 'jogador', 'jogador@dumabets.com', 'jogador123', 'player', 'active', '+55 11 96666-4444', 250.0, NULL, NULL, datetime('now'));

-- Configurações padrão da plataforma
INSERT OR IGNORE INTO settings (key, value) VALUES
('platformName', 'DUMA BETS'),
('defaultCommissionRate', '10'),
('minBet', '2.0'),
('maxBet', '5000.0'),
('maxReturn', '50000.0'),
('platformStatus', 'active'),
('contactPhone', '+55 11 98765-4321'),
('termsText', 'Apostas esportivas proibidas para menores de 18 anos. Jogue com responsabilidade conforme as diretrizes regulatórias vigentes no Brasil.');

-- Provedores de API de Odds e Futebol
INSERT OR IGNORE INTO api_providers (id, name, type, website, env_var, description, free_tier, status, request_count, limit_info)
VALUES
('the-odds-api', 'The Odds API', 'Odds Pré-Jogo & Casas de Apostas', 'https://the-odds-api.com', 'ODDS_API_KEY', 'Fornece cotações ao vivo e pré-jogo de dezenas de casas esportivas.', '500 requisições gratuitas por mês (Sem cartão)', 'unconfigured', 0, '500 req/mês no plano Free'),
('football-data', 'Football-Data.org', 'Partidas, Campeonatos & Resultados', 'https://football-data.org', 'FOOTBALL_API_KEY', 'API europeia de partidas e placares atualizados para grandes ligas.', '10 requisições por minuto com cobertura de 12 ligas', 'unconfigured', 0, '10 req/min no plano Free'),
('api-football', 'API-Football (API-Sports)', 'Cobertura Global de Partidas & Estatísticas', 'https://www.api-football.com', 'SPORTS_API_KEY', 'Cobertura extensiva do futebol brasileiro e mundial.', '100 requisições gratuitas diárias', 'unconfigured', 0, '100 req/dia no plano Free');
