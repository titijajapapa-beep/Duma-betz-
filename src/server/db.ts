import fs from 'fs';
import path from 'path';
import {
  User,
  Match,
  Ticket,
  Commission,
  Transaction,
  PlatformSettings,
  ApiProviderConfig,
  ApiSyncLog,
  AuditLog
} from '../types/index';

export interface DatabaseSchema {
  users: User[];
  matches: Match[];
  tickets: Ticket[];
  commissions: Commission[];
  transactions: Transaction[];
  settings: PlatformSettings;
  apiProviders: ApiProviderConfig[];
  apiSyncLogs: ApiSyncLog[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultSettings: PlatformSettings = {
  platformName: 'DUMA BETS',
  defaultCommissionRate: 10,
  minBet: 2.0,
  maxBet: 5000.0,
  maxReturn: 50000.0,
  platformStatus: 'active',
  contactPhone: '+55 11 98765-4321',
  termsText: 'Apostas esportivas proibidas para menores de 18 anos. Jogue com responsabilidade conforme as diretrizes regulatórias vigentes no Brasil.',
  welcomeBonusEnabled: true,
  welcomeBonusAmount: 10.0,
  welcomeBonusRequirement: 'Exclusivo para novos cadastros de usuários maiores de 18 anos. Concedido apenas uma vez por usuário.'
};

const defaultProviders: ApiProviderConfig[] = [
  {
    id: 'the-odds-api',
    name: 'The Odds API',
    type: 'Odds Pré-Jogo & Casas de Apostas',
    website: 'https://the-odds-api.com',
    envVar: 'ODDS_API_KEY',
    description: 'Fornece cotações ao vivo e pré-jogo de dezenas de casas esportivas para futebol nacional e internacional.',
    freeTier: '500 requisições gratuitas por mês (Sem necessidade de cartão)',
    configured: Boolean(process.env.ODDS_API_KEY),
    status: process.env.ODDS_API_KEY ? 'connected' : 'unconfigured',
    requestCount: 0,
    limitInfo: '500 req/mês no plano Free',
  },
  {
    id: 'football-data',
    name: 'Football-Data.org',
    type: 'Partidas, Campeonatos & Resultados',
    website: 'https://football-data.org',
    envVar: 'FOOTBALL_API_KEY',
    description: 'API europeia de partidas, classificações e placares atualizados para as maiores ligas mundiais.',
    freeTier: '10 requisições por minuto com cobertura de 12 principais competições',
    configured: Boolean(process.env.FOOTBALL_API_KEY || process.env.FSAPI_KEY),
    status: (process.env.FOOTBALL_API_KEY || process.env.FSAPI_KEY) ? 'connected' : 'unconfigured',
    requestCount: 0,
    limitInfo: '10 req/min no plano Free',
  },
  {
    id: 'api-football',
    name: 'API-Football (API-Sports)',
    type: 'Cobertura Global de Partidas & Estatísticas',
    website: 'https://www.api-football.com',
    envVar: 'SPORTS_API_KEY',
    description: 'Cobertura extensiva do futebol sul-americano e mundial, incluindo Série A e B do Brasileirão.',
    freeTier: '100 requisições gratuitas diárias',
    configured: Boolean(process.env.SPORTS_API_KEY),
    status: process.env.SPORTS_API_KEY ? 'connected' : 'unconfigured',
    requestCount: 0,
    limitInfo: '100 req/dia no plano Free',
  }
];

// NENHUM jogo fictício ou hardcoded. Jogos são carregados exclusivamente da API configurada.
const seedMatches: Match[] = [];

const seedUsers: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Administrador Master',
    username: 'admin',
    email: 'admin@dumabets.com',
    password: 'admin123',
    role: 'admin',
    status: 'active',
    phone: '+55 11 99999-1111',
    balance: 10000.0,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-agent-1',
    name: 'Carlos Cambista',
    username: 'cambista',
    email: 'cambista@dumabets.com',
    password: 'cambista123',
    role: 'agent',
    status: 'active',
    phone: '+55 11 98888-2222',
    balance: 450.0,
    agentCode: 'CARLOS10',
    commissionRate: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-agent-2',
    name: 'Rafael Apostas',
    username: 'rafael',
    email: 'rafael@dumabets.com',
    password: 'cambista123',
    role: 'agent',
    status: 'active',
    phone: '+55 21 97777-3333',
    balance: 280.0,
    agentCode: 'RAFAEL15',
    commissionRate: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    lastLoginAt: new Date().toISOString()
  },
  {
    id: 'usr-player-1',
    name: 'Lucas Silva',
    username: 'jogador',
    email: 'jogador@dumabets.com',
    password: 'jogador123',
    role: 'player',
    status: 'active',
    phone: '+55 11 96666-4444',
    balance: 10.0, // Bônus de boas-vindas padrão de R$ 10,00
    bonusReceived: true,
    referredByAgentCode: 'CARLOS10',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    lastLoginAt: new Date().toISOString()
  }
];

const seedAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'usr-admin-1',
    userName: 'Administrador Master',
    action: 'INICIALIZACAO_SISTEMA',
    details: 'Sistema DUMA BETS inicializado com sucesso.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

let inMemoryDb: DatabaseSchema | null = null;

// Remove quaisquer jogos fictícios remanescentes de execuções anteriores
function sanitizeMatches(matches: Match[]): Match[] {
  return (matches || []).filter(m => {
    const isMockId = m.id.startsWith('match-1') || m.id.startsWith('match-2') || m.id.startsWith('match-3') ||
      m.id.startsWith('match-4') || m.id.startsWith('match-5') || m.id.startsWith('match-6') || m.id.startsWith('match-7');
    const isMockExt = m.externalId?.startsWith('ext-bra-1') || m.externalId?.startsWith('ext-lib-4') ||
      m.externalId?.startsWith('ext-epl-2') || m.externalId?.startsWith('ext-ucl-3') || m.externalId?.startsWith('ext-bra-2');
    const isMockName = (m.homeTeam === 'Flamengo' && m.awayTeam === 'Palmeiras') ||
      (m.homeTeam === 'São Paulo' && m.awayTeam === 'Santos') ||
      (m.homeTeam === 'Corinthians' && m.awayTeam === 'Grêmio') ||
      (m.homeTeam === 'Real Madrid' && m.awayTeam === 'Manchester City') ||
      (m.homeTeam === 'Botafogo' && m.awayTeam === 'Vasco da Gama');

    return !isMockId && !isMockExt && !isMockName;
  });
}

export function getDb(): DatabaseSchema {
  if (inMemoryDb) {
    inMemoryDb.matches = sanitizeMatches(inMemoryDb.matches);
    return inMemoryDb;
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);
      if (inMemoryDb) {
        if (!inMemoryDb.users) inMemoryDb.users = seedUsers;
        inMemoryDb.matches = sanitizeMatches(inMemoryDb.matches || []);
        if (!inMemoryDb.tickets) inMemoryDb.tickets = [];
        if (!inMemoryDb.commissions) inMemoryDb.commissions = [];
        if (!inMemoryDb.transactions) inMemoryDb.transactions = [];
        if (!inMemoryDb.settings) inMemoryDb.settings = defaultSettings;
        else {
          inMemoryDb.settings.welcomeBonusEnabled = inMemoryDb.settings.welcomeBonusEnabled ?? true;
          inMemoryDb.settings.welcomeBonusAmount = inMemoryDb.settings.welcomeBonusAmount ?? 10.0;
          inMemoryDb.settings.welcomeBonusRequirement = inMemoryDb.settings.welcomeBonusRequirement ?? 'Exclusivo para novos cadastros de usuários maiores de 18 anos. Concedido apenas uma vez por usuário.';
        }
        if (!inMemoryDb.apiProviders) inMemoryDb.apiProviders = defaultProviders;
        if (!inMemoryDb.apiSyncLogs) inMemoryDb.apiSyncLogs = [];
        if (!inMemoryDb.auditLogs) inMemoryDb.auditLogs = seedAuditLogs;
        return inMemoryDb;
      }
    }
  } catch (err) {
    console.error('Error reading db.json, falling back to seed:', err);
  }

  inMemoryDb = {
    users: seedUsers,
    matches: [],
    tickets: [],
    commissions: [],
    transactions: [],
    settings: defaultSettings,
    apiProviders: defaultProviders,
    apiSyncLogs: [],
    auditLogs: seedAuditLogs
  };

  saveDb(inMemoryDb);
  return inMemoryDb;
}

export function saveDb(data: DatabaseSchema): void {
  data.matches = sanitizeMatches(data.matches);
  inMemoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db.json:', err);
  }
}

export function logAudit(action: string, details: string, user?: { id?: string; name?: string }) {
  const db = getDb();
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId: user?.id,
    userName: user?.name || 'Sistema',
    action,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDb(db);
}
