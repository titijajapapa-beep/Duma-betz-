import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { getDb, saveDb, logAudit } from './src/server/db';
import { SportsApiService } from './src/server/sportsApi';
import { cacheService } from './src/server/cacheService';
import { TicketEngine } from './src/server/ticketEngine';
import { User, Ticket, BetItem, Commission, Transaction } from './src/types/index';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Simple Bearer/Header-based token or session middleware
function getUserFromHeader(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  const db = getDb();
  // We can support token as userId or direct user match
  const user = db.users.find(u => u.id === token || u.username === token);
  return user || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getUserFromHeader(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado. Por favor realize o login.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Usuário bloqueado pela administração.' });
  }
  (req as any).user = user;
  next();
}

function requireRole(role: 'admin' | 'agent' | 'player') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user || user.role !== role) {
      return res.status(403).json({ error: 'Acesso negado para esta função.' });
    }
    next();
  };
}

// ----------------------------------------------------
// AUTH ENDPOINTS
// ----------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const db = getDb();

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Informe usuário/e-mail e senha.' });
  }

  const cleanIdent = identifier.trim().toLowerCase();
  const user = db.users.find(
    u => (u.email.toLowerCase() === cleanIdent || u.username.toLowerCase() === cleanIdent) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique usuário e senha.' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Sua conta está bloqueada pelo administrador.' });
  }

  user.lastLoginAt = new Date().toISOString();
  saveDb(db);
  logAudit('LOGIN', `Login realizado com sucesso por ${user.username} (${user.role})`, user);

  // Return user without password
  const { password: _, ...safeUser } = user;
  return res.json({
    token: user.id,
    user: safeUser
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, username, email, password, phone, referralCode, ageConfirmed } = req.body;
  const db = getDb();

  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
  }

  // Requirement: Exigir idade mínima legal (18+)
  if (ageConfirmed === false) {
    return res.status(400).json({ error: 'É obrigatório ter no mínimo 18 anos de idade para se cadastrar.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();

  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
  }

  if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
  }

  // Validate referral code if provided
  let validAgentCode: string | undefined;
  if (referralCode) {
    const agent = db.users.find(u => u.role === 'agent' && u.agentCode?.toUpperCase() === referralCode.trim().toUpperCase());
    if (agent) {
      validAgentCode = agent.agentCode;
    }
  }

  // Configuração do Bônus pelo Administrador (Valor padrão R$ 10,00)
  const isBonusActive = db.settings.welcomeBonusEnabled ?? true;
  const bonusAmount = isBonusActive ? (Number(db.settings.welcomeBonusAmount) || 10.0) : 0.0;

  const newUser: User = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: name.trim(),
    username: cleanUsername,
    email: cleanEmail,
    password,
    role: 'player',
    status: 'active',
    phone: phone?.trim(),
    balance: bonusAmount,
    bonusReceived: isBonusActive, // Controle para impedir recebimento duplicado
    referredByAgentCode: validAgentCode,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  db.users.push(newUser);

  // Se bônus estiver ativado pelo administrador, registra a transação de depósito de bônus
  if (isBonusActive && bonusAmount > 0) {
    db.transactions.unshift({
      id: `tx-welcome-${Date.now()}`,
      userId: newUser.id,
      userName: newUser.name,
      type: 'deposit',
      amount: bonusAmount,
      status: 'completed',
      description: `Bônus de boas-vindas DUMA BETS (R$ ${bonusAmount.toFixed(2)})`,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    });
  }

  saveDb(db);
  logAudit('NOVO_CADASTRO', `Novo jogador cadastrado: ${newUser.username}${isBonusActive ? ` com bônus de R$ ${bonusAmount.toFixed(2)}` : ''}`, newUser);

  const { password: _, ...safeUser } = newUser;
  return res.json({
    token: newUser.id,
    user: safeUser
  });
});

app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { password: _, ...safeUser } = user;
  return res.json({ user: safeUser });
});

app.post('/api/auth/recover', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Informe seu e-mail cadastrado.' });
  }
  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'Nenhum usuário encontrado com este e-mail.' });
  }
  // Simulate secure password reset token sent
  return res.json({
    success: true,
    message: 'Instruções de recuperação foram enviadas para o seu e-mail. Para testes, sua senha atual é: ' + user.password
  });
});

// ----------------------------------------------------
// PUBLIC MATCHES & BETS ENDPOINTS
// ----------------------------------------------------
app.get('/api/settings', (_req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    platformName: db.settings.platformName,
    minBet: db.settings.minBet,
    maxBet: db.settings.maxBet,
    maxReturn: db.settings.maxReturn,
    platformStatus: db.settings.platformStatus,
    welcomeBonusEnabled: db.settings.welcomeBonusEnabled ?? true,
    welcomeBonusAmount: db.settings.welcomeBonusAmount ?? 10.0,
    welcomeBonusRequirement: db.settings.welcomeBonusRequirement ?? 'Exclusivo para novos cadastros de usuários maiores de 18 anos. Concedido apenas uma vez por usuário.',
    termsText: db.settings.termsText
  });
});

app.get('/api/matches', (req: Request, res: Response) => {
  const db = getDb();
  const apiStatus = SportsApiService.getApiStatus();
  const { league, status, search, excludeFinished } = req.query;

  let list = db.matches.filter(m => m.isPublished);

  // Requirement: Não mostrar partidas já encerradas dentro da lista de próximos jogos
  if (status === 'upcoming' || status === 'scheduled' || excludeFinished === 'true') {
    list = list.filter(m => m.status !== 'finished' && m.status !== 'cancelled');
  } else if (status && status !== 'all') {
    list = list.filter(m => m.status === status);
  }

  if (league && league !== 'all') {
    list = list.filter(m => m.league === league);
  }

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(m =>
      m.homeTeam.toLowerCase().includes(q) ||
      m.awayTeam.toLowerCase().includes(q) ||
      m.league.toLowerCase().includes(q)
    );
  }

  // Sort by start time asc
  list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Distinct leagues
  const leagues = Array.from(new Set(db.matches.map(m => m.league)));

  return res.json({
    matches: list,
    leagues,
    apiConfigured: apiStatus.isConfigured,
    apiStatus: apiStatus.status,
    activeProviderName: apiStatus.activeProviderName
  });
});

// Verify ticket by code (public)
app.get('/api/bets/verify/:code', (req: Request, res: Response) => {
  const { code } = req.params;
  const db = getDb();
  const cleanCode = code.trim().toUpperCase();

  const ticket = db.tickets.find(t => t.code.toUpperCase() === cleanCode);
  if (!ticket) {
    return res.status(404).json({ error: 'Bilhete não encontrado no sistema.' });
  }

  return res.json({ ticket });
});

// Place bet / create ticket
app.post('/api/bets/place', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { items, stake } = req.body as { items: BetItem[]; stake: number };
  const db = getDb();

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um jogo no seu bilhete.' });
  }

  const betStake = Number(stake);
  if (isNaN(betStake) || betStake <= 0) {
    return res.status(400).json({ error: 'Valor da aposta inválido.' });
  }

  if (betStake < db.settings.minBet) {
    return res.status(400).json({ error: `Valor mínimo por aposta é R$ ${db.settings.minBet.toFixed(2)}.` });
  }

  if (betStake > db.settings.maxBet) {
    return res.status(400).json({ error: `Valor máximo por aposta é R$ ${db.settings.maxBet.toFixed(2)}.` });
  }

  if (user.balance < betStake) {
    return res.status(400).json({ error: 'Saldo insuficiente. Realize um depósito via PIX para continuar.' });
  }

  // Calculate combined odds
  let totalOdds = 1;
  const betItems: BetItem[] = [];

  for (const item of items) {
    const match = db.matches.find(m => m.id === item.matchId);
    if (!match) {
      return res.status(400).json({ error: `Partida "${item.matchTitle}" não encontrada.` });
    }
    if (match.status === 'finished' || match.status === 'cancelled') {
      return res.status(400).json({ error: `A partida "${match.homeTeam} x ${match.awayTeam}" já foi encerrada.` });
    }

    const market = match.markets.find(m => m.id === item.marketId || m.name === item.marketName);
    const option = market?.options.find(o => o.id === item.selectionId);
    const odd = option ? option.odd : item.odd;

    totalOdds *= odd;
    betItems.push({
      matchId: match.id,
      matchTitle: `${match.homeTeam} x ${match.awayTeam}`,
      league: match.league,
      marketId: item.marketId,
      marketName: item.marketName,
      selectionId: item.selectionId,
      selectionLabel: item.selectionLabel,
      odd: Number(odd.toFixed(2)),
      status: 'pending'
    });
  }

  totalOdds = Number(totalOdds.toFixed(2));
  let potentialReturn = Number((betStake * totalOdds).toFixed(2));

  if (potentialReturn > db.settings.maxReturn) {
    potentialReturn = db.settings.maxReturn;
  }

  // Deduct balance
  user.balance -= betStake;

  // Generate short ticket code
  const randomCode = `DM-${Math.floor(10000 + Math.random() * 90000)}`;

  const newTicket: Ticket = {
    id: `tkt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    code: randomCode,
    userId: user.id,
    userName: user.name,
    agentCode: user.referredByAgentCode,
    items: betItems,
    stake: betStake,
    totalOdds,
    potentialReturn,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  db.tickets.unshift(newTicket);

  // Record transaction
  db.transactions.unshift({
    id: `tx-bet-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    type: 'bet_placed',
    amount: -betStake,
    status: 'completed',
    description: `Aposta no Bilhete ${newTicket.code}`,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  });

  // Calculate cambista commission if player is referred
  if (user.referredByAgentCode) {
    const agent = db.users.find(u => u.agentCode === user.referredByAgentCode && u.role === 'agent');
    if (agent) {
      const commRate = agent.commissionRate || db.settings.defaultCommissionRate;
      const commAmount = Number((betStake * (commRate / 100)).toFixed(2));
      const commission: Commission = {
        id: `comm-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        agentId: agent.id,
        agentCode: agent.agentCode!,
        ticketId: newTicket.id,
        ticketCode: newTicket.code,
        betAmount: betStake,
        commissionRate: commRate,
        commissionAmount: commAmount,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      db.commissions.unshift(commission);
    }
  }

  saveDb(db);
  logAudit('APOSTA_CRIADA', `Bilhete ${newTicket.code} registrado no valor de R$ ${betStake.toFixed(2)}`, user);

  return res.json({
    ticket: newTicket,
    newBalance: user.balance
  });
});

app.get('/api/bets/my-tickets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDb();
  const tickets = db.tickets.filter(t => t.userId === user.id);
  tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ tickets });
});

// ----------------------------------------------------
// WALLET & PIX ENDPOINTS
// ----------------------------------------------------
app.get('/api/wallet', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDb();
  const transactions = db.transactions.filter(t => t.userId === user.id);
  transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({
    balance: user.balance,
    transactions
  });
});

// Request PIX deposit (generates copy-paste code and QR code image)
app.post('/api/wallet/deposit', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { amount } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount < 5) {
    return res.status(400).json({ error: 'O valor mínimo para depósito via PIX é R$ 5,00.' });
  }

  const txId = `tx-dep-${Date.now()}`;
  // Standard Brazilian EMV PIX payload format
  const pixKey = 'financeiro@dumabets.com';
  const emvPayload = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${numAmount.toFixed(2)}5802BR5909DUMA BETS6009SAO PAULO62070503***6304`;

  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(emvPayload, { margin: 2, width: 260 });
  } catch (err) {
    console.error('Error generating QR code:', err);
  }

  const db = getDb();
  const tx: Transaction = {
    id: txId,
    userId: user.id,
    userName: user.name,
    type: 'deposit',
    amount: numAmount,
    status: 'pending',
    description: `Depósito PIX de R$ ${numAmount.toFixed(2)}`,
    pixKey,
    pixCode: emvPayload,
    createdAt: new Date().toISOString()
  };

  db.transactions.unshift(tx);
  saveDb(db);

  return res.json({
    transaction: tx,
    pixCopyPaste: emvPayload,
    qrCodeImage: qrCodeDataUrl
  });
});

// Confirm/Simulate instant PIX deposit approval (testing sandbox)
app.post('/api/wallet/deposit/confirm-test', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { transactionId } = req.body;
  const db = getDb();

  const tx = db.transactions.find(t => t.id === transactionId && t.userId === user.id);
  if (!tx || tx.status !== 'pending') {
    return res.status(404).json({ error: 'Transação pendente não encontrada.' });
  }

  tx.status = 'completed';
  tx.completedAt = new Date().toISOString();
  user.balance += tx.amount;

  saveDb(db);
  logAudit('DEPOSITO_CONFIRMADO', `Depósito PIX de R$ ${tx.amount.toFixed(2)} confirmado para ${user.name}`, user);

  return res.json({
    success: true,
    newBalance: user.balance,
    transaction: tx
  });
});

// Request withdrawal
app.post('/api/wallet/withdraw', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { amount, pixKey } = req.body;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount < 20) {
    return res.status(400).json({ error: 'O valor mínimo para saque é R$ 20,00.' });
  }

  if (!pixKey || pixKey.trim().length < 5) {
    return res.status(400).json({ error: 'Informe uma chave PIX válida (CPF, Telefone, E-mail ou Aleatória).' });
  }

  if (user.balance < numAmount) {
    return res.status(400).json({ error: 'Saldo insuficiente para realizar este saque.' });
  }

  const db = getDb();
  user.balance -= numAmount;

  const tx: Transaction = {
    id: `tx-wd-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    type: 'withdrawal',
    amount: -numAmount,
    status: 'pending',
    description: `Solicitação de Saque PIX para chave: ${pixKey.trim()}`,
    pixKey: pixKey.trim(),
    createdAt: new Date().toISOString()
  };

  db.transactions.unshift(tx);
  saveDb(db);
  logAudit('SAQUE_SOLICITADO', `Saque de R$ ${numAmount.toFixed(2)} solicitado por ${user.name}`, user);

  return res.json({
    success: true,
    newBalance: user.balance,
    transaction: tx
  });
});

// ----------------------------------------------------
// CAMBISTA (AGENT) AREA ENDPOINTS
// ----------------------------------------------------
app.get('/api/agent/stats', requireAuth, requireRole('agent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDb();

  const agentCode = user.agentCode || 'DEFAULT';
  const clients = db.users.filter(u => u.referredByAgentCode === agentCode);
  const tickets = db.tickets.filter(t => t.agentCode === agentCode);
  const commissions = db.commissions.filter(c => c.agentCode === agentCode);

  const totalTurnover = tickets.reduce((acc, t) => acc + t.stake, 0);
  const pendingCommissions = commissions
    .filter(c => c.status === 'pending')
    .reduce((acc, c) => acc + c.commissionAmount, 0);
  const paidCommissions = commissions
    .filter(c => c.status === 'paid')
    .reduce((acc, c) => acc + c.commissionAmount, 0);

  const pendingTickets = tickets.filter(t => t.status === 'pending').length;
  const wonTickets = tickets.filter(t => t.status === 'won').length;
  const lostTickets = tickets.filter(t => t.status === 'lost').length;

  return res.json({
    agentCode,
    commissionRate: user.commissionRate || db.settings.defaultCommissionRate,
    totalClients: clients.length,
    totalTickets: tickets.length,
    totalTurnover,
    pendingCommissions,
    paidCommissions,
    totalCommissions: pendingCommissions + paidCommissions,
    pendingTickets,
    wonTickets,
    lostTickets,
    recentTickets: tickets.slice(0, 10),
    clients: clients.map(c => ({
      id: c.id,
      name: c.name,
      username: c.username,
      createdAt: c.createdAt,
      lastLoginAt: c.lastLoginAt
    }))
  });
});

app.get('/api/agent/tickets', requireAuth, requireRole('agent'), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDb();
  const tickets = db.tickets.filter(t => t.agentCode === user.agentCode);
  tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ tickets });
});

// ----------------------------------------------------
// ADMIN DASHBOARD & CONTROLS ENDPOINTS
// ----------------------------------------------------
app.get('/api/admin/stats', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { period } = req.query as { period?: string };
  const db = getDb();

  const now = new Date();
  let startTime = 0;

  if (period === 'today') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (period === 'yesterday') {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  } else if (period === '7days') {
    startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (period === '30days') {
    startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }

  const filteredTickets = startTime > 0
    ? db.tickets.filter(t => new Date(t.createdAt).getTime() >= startTime)
    : db.tickets;

  const totalUsers = db.users.length;
  const totalAgents = db.users.filter(u => u.role === 'agent').length;
  const totalPlayers = db.users.filter(u => u.role === 'player').length;

  const totalBetAmount = filteredTickets.reduce((acc, t) => acc + t.stake, 0);
  const totalWonPayout = filteredTickets
    .filter(t => t.status === 'won')
    .reduce((acc, t) => acc + t.potentialReturn, 0);

  const pendingTickets = filteredTickets.filter(t => t.status === 'pending').length;
  const wonTickets = filteredTickets.filter(t => t.status === 'won').length;
  const lostTickets = filteredTickets.filter(t => t.status === 'lost').length;

  const totalCommissions = db.commissions.reduce((acc, c) => acc + c.commissionAmount, 0);
  const grossProfit = totalBetAmount - totalWonPayout;
  const netProfit = grossProfit - totalCommissions;

  const activeMatches = db.matches.filter(m => m.status === 'scheduled' || m.status === 'live').length;
  const finishedMatches = db.matches.filter(m => m.status === 'finished').length;

  // Chart data: daily turnover and payouts over last 7 days
  const dailyStats: Record<string, { label: string; bets: number; volume: number; payout: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split('T')[0];
    const dayLabel = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    dailyStats[key] = { label: dayLabel, bets: 0, volume: 0, payout: 0 };
  }

  for (const t of db.tickets) {
    const key = t.createdAt.split('T')[0];
    if (dailyStats[key]) {
      dailyStats[key].bets += 1;
      dailyStats[key].volume += t.stake;
      if (t.status === 'won') {
        dailyStats[key].payout += t.potentialReturn;
      }
    }
  }

  return res.json({
    totalUsers,
    totalAgents,
    totalPlayers,
    totalTickets: filteredTickets.length,
    pendingTickets,
    wonTickets,
    lostTickets,
    totalBetAmount,
    totalWonPayout,
    totalCommissions,
    grossProfit,
    netProfit,
    activeMatches,
    finishedMatches,
    chartData: Object.values(dailyStats)
  });
});

// Admin Users
app.get('/api/admin/users', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const safeUsers = db.users.map(({ password, ...u }) => u);
  return res.json({ users: safeUsers });
});

app.post('/api/admin/users/:id/toggle-status', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }
  user.status = user.status === 'active' ? 'blocked' : 'active';
  saveDb(db);
  logAudit('ALTERACAO_STATUS_USUARIO', `Status de ${user.username} alterado para ${user.status}`);
  return res.json({ success: true, status: user.status });
});

// Admin Agents (Cambistas)
app.get('/api/admin/agents', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const agents = db.users
    .filter(u => u.role === 'agent')
    .map(agent => {
      const tickets = db.tickets.filter(t => t.agentCode === agent.agentCode);
      const totalVolume = tickets.reduce((acc, t) => acc + t.stake, 0);
      const commissions = db.commissions.filter(c => c.agentCode === agent.agentCode);
      const totalCommission = commissions.reduce((acc, c) => acc + c.commissionAmount, 0);

      const { password, ...safeAgent } = agent;
      return {
        ...safeAgent,
        totalTickets: tickets.length,
        totalVolume,
        totalCommission
      };
    });

  return res.json({ agents });
});

app.post('/api/admin/agents', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { name, username, password, phone, commissionRate, customCode } = req.body;
  const db = getDb();

  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Nome, usuário e senha são obrigatórios.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (db.users.some(u => u.username.toLowerCase() === cleanUsername)) {
    return res.status(400).json({ error: 'Nome de usuário já existe.' });
  }

  // Generate agent unique referral code
  const code = (customCode || username).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (db.users.some(u => u.agentCode === code)) {
    return res.status(400).json({ error: 'Este código de cambista já está em uso.' });
  }

  const rate = Number(commissionRate) || db.settings.defaultCommissionRate;

  const newAgent: User = {
    id: `usr-agent-${Date.now()}`,
    name: name.trim(),
    username: cleanUsername,
    email: `${cleanUsername}@dumabets.com`,
    password,
    role: 'agent',
    status: 'active',
    phone: phone?.trim(),
    balance: 0,
    agentCode: code,
    commissionRate: rate,
    createdAt: new Date().toISOString()
  };

  db.users.push(newAgent);
  saveDb(db);
  logAudit('CRIAR_CAMBISTA', `Novo cambista cadastrado: ${newAgent.name} (Código: ${code}, Comissão: ${rate}%)`);

  const { password: _, ...safeAgent } = newAgent;
  return res.json({ agent: safeAgent });
});

app.put('/api/admin/agents/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, phone, commissionRate, password, status } = req.body;
  const db = getDb();

  const agent = db.users.find(u => u.id === id && u.role === 'agent');
  if (!agent) {
    return res.status(404).json({ error: 'Cambista não encontrado.' });
  }

  if (name) agent.name = name.trim();
  if (phone !== undefined) agent.phone = phone.trim();
  if (commissionRate !== undefined) agent.commissionRate = Number(commissionRate);
  if (password && password.trim().length > 0) agent.password = password.trim();
  if (status) agent.status = status;

  saveDb(db);
  logAudit('EDITAR_CAMBISTA', `Dados do cambista ${agent.name} atualizados.`);

  const { password: _, ...safeAgent } = agent;
  return res.json({ agent: safeAgent });
});

// Admin Matches Management
app.get('/api/admin/matches', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ matches: db.matches });
});

app.post('/api/admin/matches', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { league, homeTeam, awayTeam, startTime, oddsHome, oddsDraw, oddsAway } = req.body;
  const db = getDb();

  if (!league || !homeTeam || !awayTeam) {
    return res.status(400).json({ error: 'Campeonato, time mandante e time visitante são obrigatórios.' });
  }

  const hOdd = Number(oddsHome) || 2.0;
  const dOdd = Number(oddsDraw) || 3.2;
  const aOdd = Number(oddsAway) || 3.4;

  const newMatch = SportsApiService.convertCandidateToMatch({
    id: `fix-custom-${Date.now()}`,
    externalId: `ext-custom-${Date.now()}`,
    league: league.trim(),
    homeTeam: homeTeam.trim(),
    awayTeam: awayTeam.trim(),
    startTime: startTime ? new Date(startTime).toISOString() : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    status: 'scheduled',
    odds: {
      home: hOdd,
      draw: dOdd,
      away: aOdd,
      over25: 1.95,
      under25: 1.85,
      bttsYes: 1.80,
      bttsNo: 1.95
    }
  });

  db.matches.unshift(newMatch);
  saveDb(db);
  logAudit('CRIAR_PARTIDA', `Partida ${newMatch.homeTeam} x ${newMatch.awayTeam} criada manualmente.`);

  return res.json({ match: newMatch });
});

app.put('/api/admin/matches/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const { homeTeam, awayTeam, league, startTime, status, homeScore, awayScore, isPublished, markets } = req.body;
  const db = getDb();

  const match = db.matches.find(m => m.id === id);
  if (!match) {
    return res.status(404).json({ error: 'Partida não encontrada.' });
  }

  if (homeTeam) match.homeTeam = homeTeam;
  if (awayTeam) match.awayTeam = awayTeam;
  if (league) match.league = league;
  if (startTime) match.startTime = startTime;
  if (status) match.status = status;
  if (homeScore !== undefined) match.homeScore = Number(homeScore);
  if (awayScore !== undefined) match.awayScore = Number(awayScore);
  if (isPublished !== undefined) match.isPublished = Boolean(isPublished);
  if (markets && Array.isArray(markets)) match.markets = markets;

  match.updatedAt = new Date().toISOString();

  // If status became finished, settle affected tickets immediately
  if (match.status === 'finished') {
    TicketEngine.settleTickets();
  }

  saveDb(db);
  logAudit('EDITAR_PARTIDA', `Partida ${match.homeTeam} x ${match.awayTeam} atualizada.`);

  return res.json({ match });
});

app.delete('/api/admin/matches/:id', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const index = db.matches.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Partida não encontrada.' });
  }

  const [removed] = db.matches.splice(index, 1);
  saveDb(db);
  logAudit('EXCLUIR_PARTIDA', `Partida ${removed.homeTeam} x ${removed.awayTeam} excluída.`);

  return res.json({ success: true });
});

// Import candidates preview endpoint
app.get('/api/admin/import/candidates', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { filter } = req.query as { filter?: 'today' | 'tomorrow' | 'upcoming' | 'five' | 'ten' };
  const candidates = await SportsApiService.getImportCandidates(filter || 'today');
  return res.json({ candidates });
});

// Batch import selected candidates
app.post('/api/admin/import/batch', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { candidateIds, candidates } = req.body as { candidateIds?: string[]; candidates?: any[] };
  const items = candidates && candidates.length > 0 ? candidates : candidateIds;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Selecione ao menos um jogo para importar.' });
  }

  const result = await SportsApiService.batchImportMatches(items);
  return res.json(result);
});

// Sync trigger
app.post('/api/admin/matches/sync-now', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const result = await SportsApiService.syncAllAvailable();
  return res.json(result);
});

// Results update and settlement trigger ("ATUALIZAR RESULTADOS AGORA")
app.post('/api/admin/matches/settle-now', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const result = TicketEngine.simulateScoresForScheduledMatches();
  return res.json({
    success: true,
    message: `${result.updatedMatches} partida(s) finalizadas com novos placares. ${result.settled.processedCount} bilhete(s) processados (${result.settled.wonCount} ganhos, ${result.settled.lostCount} perdidos).`
  });
});

// API Providers manager
app.get('/api/admin/api-manager', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    providers: db.apiProviders,
    syncLogs: db.apiSyncLogs.slice(0, 20),
    cacheStats: cacheService.getStats()
  });
});

app.post('/api/admin/api-manager/clear-cache', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const result = SportsApiService.clearCache();
  logAudit('LIMPEZA_CACHE', `${result.clearedCount} itens removidos do cache pelo administrador.`);
  return res.json({
    success: true,
    message: `${result.clearedCount} itens removidos do cache com sucesso.`,
    cacheStats: result.stats
  });
});

app.post('/api/admin/api-manager/:id/test', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SportsApiService.testConnection(id);
  return res.json(result);
});

// Settings
app.get('/api/admin/settings', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  const newSettings = req.body;
  db.settings = { ...db.settings, ...newSettings };
  saveDb(db);
  logAudit('ALTERACAO_CONFIGURACOES', 'Configurações gerais da plataforma atualizadas.');
  return res.json({ settings: db.settings });
});

// Logs
app.get('/api/admin/logs', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ logs: db.auditLogs.slice(0, 100) });
});

// All Tickets
app.get('/api/admin/tickets', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ tickets: db.tickets });
});

// Financial transactions for admin
app.get('/api/admin/financial', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    transactions: db.transactions,
    commissions: db.commissions
  });
});

// Approve or reject pending withdrawal
app.post('/api/admin/financial/:txId/status', requireAuth, requireRole('admin'), (req: Request, res: Response) => {
  const { txId } = req.params;
  const { status } = req.body; // 'completed' | 'rejected'
  const db = getDb();

  const tx = db.transactions.find(t => t.id === txId);
  if (!tx) {
    return res.status(404).json({ error: 'Transação não encontrada.' });
  }

  tx.status = status;
  if (status === 'completed') {
    tx.completedAt = new Date().toISOString();
  } else if (status === 'rejected' && tx.type === 'withdrawal') {
    // Refund user balance
    const user = db.users.find(u => u.id === tx.userId);
    if (user) {
      user.balance += Math.abs(tx.amount);
    }
  }

  saveDb(db);
  logAudit('STATUS_TRANSACAO', `Transação ${txId} alterada para ${status}`);
  return res.json({ transaction: tx });
});

// ----------------------------------------------------
// SERVER STARTUP WITH VITE INTEGRATION
// ----------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DUMA BETS] Servidor full-stack rodando em http://localhost:${PORT}`);
    // Item 11: Inicia o agendador diário para atualizar jogos todo dia às 02:00 da manhã
    SportsApiService.startDailySyncScheduler();
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
