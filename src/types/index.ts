export type UserRole = 'admin' | 'agent' | 'player';
export type UserStatus = 'active' | 'blocked';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  balance: number;
  bonusReceived?: boolean; // Controle para impedir que o mesmo usuário receba o bônus mais de uma vez
  birthDate?: string; // Verificação de idade mínima legal (18+)
  agentCode?: string; // exclusive code for agent (cambista)
  referredByAgentCode?: string; // agent who referred this player
  commissionRate?: number; // specific commission rate for cambista (%)
  createdAt: string;
  lastLoginAt?: string;
}

export interface MarketOption {
  id: string;
  label: string; // e.g. "Casa", "Empate", "Fora", "Mais de 2.5", "Sim"
  odd: number;
  active: boolean;
}

export interface MatchMarket {
  id: string;
  name: string; // e.g. "1X2 - Resultado Final", "Mais/Menos 2.5 Gols", "Ambos Marcam"
  type: '1x2' | 'over_under_25' | 'over_under_15' | 'both_score' | 'double_chance' | 'custom';
  active: boolean;
  options: MarketOption[];
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export interface Match {
  id: string;
  externalId?: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string; // ISO string
  status: MatchStatus;
  homeScore?: number;
  awayScore?: number;
  minute?: number;
  isPublished: boolean;
  markets: MatchMarket[];
  createdAt: string;
  updatedAt: string;
}

export interface BetItem {
  matchId: string;
  matchTitle: string; // "Flamengo x Palmeiras"
  league: string;
  marketId: string;
  marketName: string;
  selectionId: string;
  selectionLabel: string;
  odd: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
}

export type TicketStatus = 'pending' | 'won' | 'lost' | 'cancelled';

export interface Ticket {
  id: string;
  code: string; // short unique code e.g. "DM-82910"
  userId: string;
  userName: string;
  agentCode?: string;
  items: BetItem[];
  stake: number; // Valor apostado
  totalOdds: number; // Cotação total
  potentialReturn: number; // Possível retorno
  status: TicketStatus;
  createdAt: string;
  settledAt?: string;
}

export interface Commission {
  id: string;
  agentId: string;
  agentCode: string;
  ticketId: string;
  ticketCode: string;
  betAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bet_placed' | 'bet_won' | 'commission_payout';
export type TransactionStatus = 'pending' | 'completed' | 'rejected';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  pixKey?: string;
  pixCode?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PlatformSettings {
  platformName: string;
  logoUrl?: string;
  defaultCommissionRate: number; // e.g. 10%
  minBet: number; // e.g. 2.00
  maxBet: number; // e.g. 5000.00
  maxReturn: number; // e.g. 50000.00
  platformStatus: 'active' | 'maintenance';
  contactPhone: string;
  termsText: string;
  welcomeBonusEnabled: boolean; // Ativar/Desativar Bônus
  welcomeBonusAmount: number; // Valor padrão: R$ 10,00
  welcomeBonusRequirement: string; // Exclusivo para maiores de 18 anos
}

export interface ApiProviderConfig {
  id: string;
  name: string;
  type: string;
  website: string;
  envVar: string;
  description: string;
  freeTier: string;
  configured: boolean;
  status: 'connected' | 'unconfigured' | 'error';
  requestCount: number;
  requestsRemaining?: number;
  latencyMs?: number;
  limitInfo: string;
  lastSyncAt?: string;
  lastError?: string;
  diagnostics?: string;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  cachedKeys: string[];
}

export interface ApiSyncLog {
  id: string;
  provider: string;
  endpoint: string;
  status: 'success' | 'error';
  message: string;
  itemsImported: number;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
  timestamp: string;
}
