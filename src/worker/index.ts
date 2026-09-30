/**
 * DUMA BETS - Cloudflare Workers Edge Backend
 * Totalmente compatível com o plano gratuito (Free Tier) do Cloudflare Workers e Cloudflare D1.
 */

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: any }>;
  all<T = unknown>(): Promise<{ results?: T[]; success: boolean; meta?: any }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<any[]>;
  exec(query: string): Promise<any>;
}

export interface Env {
  DB: D1Database;
  ODDS_API_KEY?: string;
  FOOTBALL_API_KEY?: string;
  FSAPI_KEY?: string;
  SPORTS_API_KEY?: string;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

// Utilitário para respostas JSON com CORS
function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Resolução de autenticação via header
async function authenticateUser(request: Request, db: D1Database): Promise<any | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  const user = await db
    .prepare('SELECT * FROM users WHERE id = ? OR username = ?')
    .bind(token, token)
    .first();

  return user;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // ----------------------------------------------------
    // ROTAS DE API
    // ----------------------------------------------------

    // 1. Auth: Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const { identifier, password } = body;
      if (!identifier || !password) {
        return jsonResponse({ error: 'Informe usuário/e-mail e senha.' }, 400);
      }

      const cleanIdent = identifier.trim().toLowerCase();
      const user: any = await env.DB
        .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
        .bind(cleanIdent, cleanIdent)
        .first();

      if (!user || user.password !== password) {
        return jsonResponse({ error: 'Credenciais inválidas.' }, 401);
      }

      if (user.status === 'blocked') {
        return jsonResponse({ error: 'Sua conta está bloqueada pela administração.' }, 403);
      }

      await env.DB
        .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
        .bind(user.id)
        .run();

      const { password: _, ...safeUser } = user;
      return jsonResponse({ token: user.id, user: safeUser });
    }

    // 2. Auth: Register
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const { name, username, email, password, phone, referralCode } = body;

      if (!name || !username || !email || !password) {
        return jsonResponse({ error: 'Preencha todos os campos obrigatórios.' }, 400);
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      const existing = await env.DB
        .prepare('SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?')
        .bind(cleanUsername, cleanEmail)
        .first();

      if (existing) {
        return jsonResponse({ error: 'Nome de usuário ou e-mail já cadastrado.' }, 400);
      }

      let validAgentCode: string | null = null;
      if (referralCode) {
        const agent: any = await env.DB
          .prepare("SELECT agent_code FROM users WHERE role = 'agent' AND UPPER(agent_code) = ?")
          .bind(referralCode.trim().toUpperCase())
          .first();
        if (agent) validAgentCode = agent.agent_code;
      }

      const newId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();

      await env.DB
        .prepare(`
          INSERT INTO users (id, name, username, email, password, role, status, phone, balance, referred_by_agent_code, created_at, last_login_at)
          VALUES (?, ?, ?, ?, ?, 'player', 'active', ?, 50.0, ?, ?, ?)
        `)
        .bind(newId, name.trim(), cleanUsername, cleanEmail, password, phone?.trim() || null, validAgentCode, createdAt, createdAt)
        .run();

      // Transação de bônus inicial
      await env.DB
        .prepare(`
          INSERT INTO transactions (id, user_id, user_name, type, amount, status, description, created_at, completed_at)
          VALUES (?, ?, ?, 'deposit', 50.0, 'completed', 'Bônus de boas-vindas DUMA BETS', ?, ?)
        `)
        .bind(`tx-wel-${Date.now()}`, newId, name.trim(), createdAt, createdAt)
        .run();

      return jsonResponse({
        token: newId,
        user: {
          id: newId,
          name: name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          role: 'player',
          status: 'active',
          balance: 50.0,
          referredByAgentCode: validAgentCode,
          createdAt
        }
      });
    }

    // 3. Auth: Me
    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await authenticateUser(request, env.DB);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401);
      const { password: _, ...safeUser } = user;
      return jsonResponse({ user: safeUser });
    }

    // 4. Matches (Público)
    if (pathname === '/api/matches' && method === 'GET') {
      const rows: any = await env.DB
        .prepare('SELECT * FROM matches WHERE is_published = 1 ORDER BY start_time ASC')
        .all();

      const matches = (rows.results || []).map((m: any) => ({
        id: m.id,
        externalId: m.external_id,
        league: m.league,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        startTime: m.start_time,
        status: m.status,
        homeScore: m.home_score,
        awayScore: m.away_score,
        minute: m.minute,
        isPublished: Boolean(m.is_published),
        markets: JSON.parse(m.markets_json || '[]'),
        createdAt: m.created_at,
        updatedAt: m.updated_at
      }));

      const leagues = Array.from(new Set(matches.map((m: any) => m.league)));
      return jsonResponse({ matches, leagues });
    }

    // 5. Verify Ticket (Público)
    if (pathname.startsWith('/api/bets/verify/') && method === 'GET') {
      const code = decodeURIComponent(pathname.replace('/api/bets/verify/', '')).trim().toUpperCase();
      const ticket: any = await env.DB
        .prepare('SELECT * FROM tickets WHERE UPPER(code) = ?')
        .bind(code)
        .first();

      if (!ticket) return jsonResponse({ error: 'Bilhete não encontrado.' }, 404);

      return jsonResponse({
        ticket: {
          id: ticket.id,
          code: ticket.code,
          userId: ticket.user_id,
          userName: ticket.user_name,
          agentCode: ticket.agent_code,
          items: JSON.parse(ticket.items_json || '[]'),
          stake: ticket.stake,
          totalOdds: ticket.total_odds,
          potentialReturn: ticket.potential_return,
          status: ticket.status,
          createdAt: ticket.created_at,
          settledAt: ticket.settled_at
        }
      });
    }

    // 6. Place Bet
    if (pathname === '/api/bets/place' && method === 'POST') {
      const user = await authenticateUser(request, env.DB);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401);

      const body: any = await request.json().catch(() => ({}));
      const { items, stake } = body;
      const betStake = Number(stake);

      if (!items || !Array.isArray(items) || items.length === 0) {
        return jsonResponse({ error: 'Selecione ao menos um jogo no seu bilhete.' }, 400);
      }
      if (isNaN(betStake) || betStake < 2) {
        return jsonResponse({ error: 'Valor mínimo da aposta é R$ 2,00.' }, 400);
      }
      if (user.balance < betStake) {
        return jsonResponse({ error: 'Saldo insuficiente. Faça um depósito via PIX.' }, 400);
      }

      // Calcula odd total
      const totalOdds = Number(items.reduce((acc: number, it: any) => acc * (Number(it.odd) || 1), 1).toFixed(2));
      const potentialReturn = Number((betStake * totalOdds).toFixed(2));
      const randomCode = `DM-${Math.floor(10000 + Math.random() * 90000)}`;
      const ticketId = `tkt-${Date.now()}`;
      const createdAt = new Date().toISOString();

      // Deduz saldo do usuário
      const newBalance = user.balance - betStake;
      await env.DB
        .prepare('UPDATE users SET balance = ? WHERE id = ?')
        .bind(newBalance, user.id)
        .run();

      // Insere bilhete
      await env.DB
        .prepare(`
          INSERT INTO tickets (id, code, user_id, user_name, agent_code, items_json, stake, total_odds, potential_return, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `)
        .bind(ticketId, randomCode, user.id, user.name, user.referred_by_agent_code || null, JSON.stringify(items), betStake, totalOdds, potentialReturn, createdAt)
        .run();

      // Registra transação
      await env.DB
        .prepare(`
          INSERT INTO transactions (id, user_id, user_name, type, amount, status, description, created_at, completed_at)
          VALUES (?, ?, ?, 'bet_placed', ?, 'completed', ?, ?, ?)
        `)
        .bind(`tx-bet-${Date.now()}`, user.id, user.name, -betStake, `Aposta no Bilhete ${randomCode}`, createdAt, createdAt)
        .run();

      // Gera comissão para cambista se aplicável
      if (user.referred_by_agent_code) {
        const agent: any = await env.DB
          .prepare("SELECT * FROM users WHERE agent_code = ? AND role = 'agent'")
          .bind(user.referred_by_agent_code)
          .first();

        if (agent) {
          const commRate = agent.commission_rate || 10;
          const commAmount = Number((betStake * (commRate / 100)).toFixed(2));
          await env.DB
            .prepare(`
              INSERT INTO commissions (id, agent_id, agent_code, ticket_id, ticket_code, bet_amount, commission_rate, commission_amount, status, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            `)
            .bind(`comm-${Date.now()}`, agent.id, agent.agent_code, ticketId, randomCode, betStake, commRate, commAmount, createdAt)
            .run();
        }
      }

      return jsonResponse({
        ticket: {
          id: ticketId,
          code: randomCode,
          userId: user.id,
          userName: user.name,
          agentCode: user.referred_by_agent_code,
          items,
          stake: betStake,
          totalOdds,
          potentialReturn,
          status: 'pending',
          createdAt
        },
        newBalance
      });
    }

    // 7. My Tickets
    if (pathname === '/api/bets/my-tickets' && method === 'GET') {
      const user = await authenticateUser(request, env.DB);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401);

      const rows: any = await env.DB
        .prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC')
        .bind(user.id)
        .all();

      const tickets = (rows.results || []).map((t: any) => ({
        id: t.id,
        code: t.code,
        userId: t.user_id,
        userName: t.user_name,
        agentCode: t.agent_code,
        items: JSON.parse(t.items_json || '[]'),
        stake: t.stake,
        totalOdds: t.total_odds,
        potentialReturn: t.potential_return,
        status: t.status,
        createdAt: t.created_at,
        settledAt: t.settled_at
      }));

      return jsonResponse({ tickets });
    }

    // 8. Wallet & PIX
    if (pathname === '/api/wallet' && method === 'GET') {
      const user = await authenticateUser(request, env.DB);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401);

      const rows: any = await env.DB
        .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC')
        .bind(user.id)
        .all();

      return jsonResponse({
        balance: user.balance,
        transactions: rows.results || []
      });
    }

    // 9. Wallet PIX Deposit
    if (pathname === '/api/wallet/deposit' && method === 'POST') {
      const user = await authenticateUser(request, env.DB);
      if (!user) return jsonResponse({ error: 'Não autenticado.' }, 401);

      const body: any = await request.json().catch(() => ({}));
      const numAmount = Number(body.amount);
      if (isNaN(numAmount) || numAmount < 5) {
        return jsonResponse({ error: 'Valor mínimo para depósito é R$ 5,00.' }, 400);
      }

      const txId = `tx-dep-${Date.now()}`;
      const pixKey = 'financeiro@dumabets.com';
      const emvPayload = `00020126580014br.gov.bcb.pix0136${pixKey}520400005303986540${numAmount.toFixed(2)}5802BR5909DUMA BETS6009SAO PAULO62070503***6304`;
      const createdAt = new Date().toISOString();

      await env.DB
        .prepare(`
          INSERT INTO transactions (id, user_id, user_name, type, amount, status, description, pix_key, pix_code, created_at)
          VALUES (?, ?, ?, 'deposit', ?, 'pending', ?, ?, ?, ?)
        `)
        .bind(txId, user.id, user.name, numAmount, `Depósito PIX de R$ ${numAmount.toFixed(2)}`, pixKey, emvPayload, createdAt)
        .run();

      return jsonResponse({
        transaction: {
          id: txId,
          userId: user.id,
          userName: user.name,
          type: 'deposit',
          amount: numAmount,
          status: 'pending',
          pixCode: emvPayload,
          createdAt
        },
        pixCopyPaste: emvPayload
      });
    }

    // 10. Cambista (Agent) Stats
    if (pathname === '/api/agent/stats' && method === 'GET') {
      const user = await authenticateUser(request, env.DB);
      if (!user || user.role !== 'agent') return jsonResponse({ error: 'Acesso restrito a cambistas.' }, 403);

      const agentCode = user.agent_code || 'CAMBISTA';
      const clients: any = await env.DB
        .prepare('SELECT id, name, username, created_at, last_login_at FROM users WHERE referred_by_agent_code = ?')
        .bind(agentCode)
        .all();

      const tickets: any = await env.DB
        .prepare('SELECT * FROM tickets WHERE agent_code = ? ORDER BY created_at DESC')
        .bind(agentCode)
        .all();

      const commissions: any = await env.DB
        .prepare('SELECT * FROM commissions WHERE agent_code = ?')
        .bind(agentCode)
        .all();

      const totalTurnover = (tickets.results || []).reduce((acc: number, t: any) => acc + t.stake, 0);
      const pendingCommissions = (commissions.results || [])
        .filter((c: any) => c.status === 'pending')
        .reduce((acc: number, c: any) => acc + c.commission_amount, 0);
      const paidCommissions = (commissions.results || [])
        .filter((c: any) => c.status === 'paid')
        .reduce((acc: number, c: any) => acc + c.commission_amount, 0);

      return jsonResponse({
        agentCode,
        commissionRate: user.commission_rate || 10,
        totalClients: (clients.results || []).length,
        totalTickets: (tickets.results || []).length,
        totalTurnover,
        pendingCommissions,
        paidCommissions,
        totalCommissions: pendingCommissions + paidCommissions,
        recentTickets: (tickets.results || []).slice(0, 10).map((t: any) => ({
          ...t,
          items: JSON.parse(t.items_json || '[]')
        })),
        clients: clients.results || []
      });
    }

    // 11. Admin API Manager
    if (pathname === '/api/admin/api-manager' && method === 'GET') {
      const user = await authenticateUser(request, env.DB);
      if (!user || user.role !== 'admin') return jsonResponse({ error: 'Acesso restrito ao administrador.' }, 403);

      const providers: any = await env.DB.prepare('SELECT * FROM api_providers').all();
      const logs: any = await env.DB.prepare('SELECT * FROM api_sync_logs ORDER BY timestamp DESC LIMIT 20').all();

      return jsonResponse({
        providers: (providers.results || []).map((p: any) => ({
          ...p,
          configured: Boolean(env[p.env_var as keyof Env] || (p.env_var === 'FOOTBALL_API_KEY' && env.FSAPI_KEY))
        })),
        syncLogs: logs.results || [],
        cacheStats: { size: 0, hits: 0, misses: 0, hitRate: 0, cachedKeys: [] }
      });
    }

    // Servir aplicação Frontend estática (Cloudflare Workers Static Assets)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('DUMA BETS Edge Worker Active', { status: 200 });
  }
};
