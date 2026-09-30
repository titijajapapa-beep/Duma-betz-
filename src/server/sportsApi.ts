import { Match, MatchMarket, ApiProviderConfig } from '../types/index';
import { getDb, saveDb, logAudit } from './db';
import { cacheService } from './cacheService';
import { ExternalApiClients, ExternalFetchResult } from './externalApiClients';
import { RawFixtureCandidate } from './sportsApiTypes';

export class SportsApiService {
  /**
   * Obtém a chave de API configurada para um provedor a partir do ambiente
   */
  private static getProviderApiKey(provider: ApiProviderConfig): string | undefined {
    let key = process.env[provider.envVar];
    // Aliases para máxima compatibilidade
    if (!key && provider.envVar === 'FOOTBALL_API_KEY') {
      key = process.env.FSAPI_KEY;
    }
    return key && key.trim().length > 0 ? key.trim() : undefined;
  }

  /**
   * Verifica se ao menos um provedor externo possui chave válida no ambiente
   */
  static isAnyApiConfigured(): boolean {
    const db = getDb();
    return db.apiProviders.some(p => Boolean(this.getProviderApiKey(p)));
  }

  /**
   * Retorna o status consolidado das APIs configuradas
   */
  static getApiStatus(): { isConfigured: boolean; activeProviderName?: string; status: 'connected' | 'unconfigured' | 'error' } {
    const db = getDb();
    for (const p of db.apiProviders) {
      const key = this.getProviderApiKey(p);
      if (key) {
        return { isConfigured: true, activeProviderName: p.name, status: p.status === 'error' ? 'error' : 'connected' };
      }
    }
    return { isConfigured: false, status: 'unconfigured' };
  }

  /**
   * Testa a conexão real com o provedor externo e atualiza diagnósticos
   */
  static async testConnection(providerId: string): Promise<{ success: boolean; message: string; details?: any }> {
    const db = getDb();
    const provider = db.apiProviders.find(p => p.id === providerId);
    if (!provider) {
      return { success: false, message: 'Provedor não encontrado no catálogo.' };
    }

    const apiKey = this.getProviderApiKey(provider);

    // Se chave não está configurada
    if (!apiKey) {
      provider.configured = false;
      provider.status = 'unconfigured';
      provider.diagnostics = `Variável ${provider.envVar} não configurada no ambiente. Cadastre-se gratuitamente em ${provider.website}.`;
      provider.lastError = 'API key ausente';
      saveDb(db);
      return {
        success: false,
        message: `A variável de ambiente ${provider.envVar} não está configurada. Acesse ${provider.website} para obter sua chave gratuita.`
      };
    }

    provider.configured = true;
    let result: ExternalFetchResult;

    if (provider.id === 'the-odds-api') {
      result = await ExternalApiClients.fetchTheOddsApi(apiKey);
    } else if (provider.id === 'football-data') {
      result = await ExternalApiClients.fetchFootballData(apiKey);
    } else if (provider.id === 'api-football') {
      result = await ExternalApiClients.fetchApiFootball(apiKey);
    } else {
      result = {
        success: false,
        providerId,
        fixtures: [],
        latencyMs: 0,
        errorMessage: 'Provedor não suportado para teste automatizado.'
      };
    }

    // Atualiza status do provedor no banco de dados
    provider.requestCount += 1;
    provider.latencyMs = result.latencyMs;
    provider.lastSyncAt = new Date().toISOString();

    if (typeof result.requestsRemaining === 'number') {
      provider.requestsRemaining = result.requestsRemaining;
    }

    if (result.success) {
      provider.status = 'connected';
      provider.lastError = undefined;
      provider.diagnostics = result.diagnostics || `Conexão bem-sucedida em ${result.latencyMs}ms.`;
      saveDb(db);
      logAudit('API_TEST', `Conexão bem-sucedida com ${provider.name} (${result.latencyMs}ms)`);
      return {
        success: true,
        message: `Conexão com ${provider.name} bem-sucedida! Latência: ${result.latencyMs}ms. ${provider.diagnostics}`
      };
    } else {
      provider.status = 'error';
      provider.lastError = result.errorMessage;
      provider.diagnostics = result.diagnostics || result.errorMessage;
      saveDb(db);
      logAudit('API_ERROR', `Falha no teste com ${provider.name}: ${result.errorMessage}`);
      return {
        success: false,
        message: `Falha ao conectar com ${provider.name}: ${result.errorMessage}`
      };
    }
  }

  /**
   * Busca candidatos a importação EXCLUSIVAMENTE a partir das APIs reais configuradas.
   * Se nenhuma API estiver configurada, retorna lista vazia (SEM dados fictícios).
   */
  static async getImportCandidates(filter: 'today' | 'tomorrow' | 'upcoming' | 'five' | 'ten'): Promise<RawFixtureCandidate[]> {
    const cacheKey = `candidates:${filter}`;
    const cached = cacheService.get<RawFixtureCandidate[]>(cacheKey);

    if (cached) {
      return cached.data;
    }

    const db = getDb();
    let rawFixtures: RawFixtureCandidate[] = [];

    // Tenta The Odds API primeiro se configurada
    const oddsProvider = db.apiProviders.find(p => p.id === 'the-odds-api');
    const oddsKey = oddsProvider ? this.getProviderApiKey(oddsProvider) : undefined;
    if (oddsKey) {
      const res = await ExternalApiClients.fetchTheOddsApi(oddsKey);
      if (res.success && res.fixtures.length > 0) {
        rawFixtures = res.fixtures;
      }
    }

    // Se ainda vazio, tenta Football-Data
    if (rawFixtures.length === 0) {
      const fdProvider = db.apiProviders.find(p => p.id === 'football-data');
      const fdKey = fdProvider ? this.getProviderApiKey(fdProvider) : undefined;
      if (fdKey) {
        const res = await ExternalApiClients.fetchFootballData(fdKey);
        if (res.success && res.fixtures.length > 0) {
          rawFixtures = res.fixtures;
        }
      }
    }

    // Se nenhuma API estiver configurada ou nenhuma retornar dados, retorna lista vazia (sem dados fictícios)
    if (rawFixtures.length === 0) {
      return [];
    }

    const existingTitles = new Set(db.matches.map(m => `${m.homeTeam.toLowerCase()} x ${m.awayTeam.toLowerCase()}`));
    const existingIds = new Set(db.matches.map(m => m.externalId || m.id));

    let candidates = rawFixtures.filter(fix => {
      const title = `${fix.homeTeam.toLowerCase()} x ${fix.awayTeam.toLowerCase()}`;
      return !existingTitles.has(title) && !existingIds.has(fix.externalId);
    });

    const now = Date.now();
    let result: RawFixtureCandidate[] = [];

    if (filter === 'today') {
      result = candidates.filter(f => {
        const diffHours = (new Date(f.startTime).getTime() - now) / (1000 * 60 * 60);
        return diffHours >= 0 && diffHours <= 24;
      });
    } else if (filter === 'tomorrow') {
      result = candidates.filter(f => {
        const diffHours = (new Date(f.startTime).getTime() - now) / (1000 * 60 * 60);
        return diffHours > 24 && diffHours <= 48;
      });
    } else if (filter === 'five') {
      result = candidates.slice(0, 5);
    } else if (filter === 'ten') {
      result = candidates.slice(0, 10);
    } else {
      result = candidates;
    }

    cacheService.set(cacheKey, result, 300); // 5 min
    return result;
  }

  /**
   * Converte candidato retornado pela API em entidade Match oficial.
   * Se as odds não forem fornecidas pela API, elas permanecem 0 (Odds indisponíveis).
   */
  static convertCandidateToMatch(candidate: RawFixtureCandidate): Match {
    const hasHomeOdd = candidate.odds?.home && candidate.odds.home > 0;
    const hasDrawOdd = candidate.odds?.draw && candidate.odds.draw > 0;
    const hasAwayOdd = candidate.odds?.away && candidate.odds.away > 0;

    const markets: MatchMarket[] = [];

    // Mercado 1X2 - Somente ativo se odds foram realmente fornecidas
    markets.push({
      id: `mkt-${candidate.id}-1x2`,
      name: 'Resultado Final (1X2)',
      type: '1x2',
      active: Boolean(hasHomeOdd && hasDrawOdd && hasAwayOdd),
      options: [
        { id: '1', label: `${candidate.homeTeam} (Casa)`, odd: hasHomeOdd ? candidate.odds.home : 0, active: Boolean(hasHomeOdd) },
        { id: 'X', label: 'Empate', odd: hasDrawOdd ? candidate.odds.draw : 0, active: Boolean(hasDrawOdd) },
        { id: '2', label: `${candidate.awayTeam} (Fora)`, odd: hasAwayOdd ? candidate.odds.away : 0, active: Boolean(hasAwayOdd) }
      ]
    });

    return {
      id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      externalId: candidate.externalId,
      league: candidate.league,
      homeTeam: candidate.homeTeam,
      awayTeam: candidate.awayTeam,
      startTime: candidate.startTime,
      status: candidate.status || 'scheduled',
      isPublished: true,
      markets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Importa jogos em lote a partir dos candidatos reais selecionados
   */
  static async batchImportMatches(candidatesOrIds: (RawFixtureCandidate | string)[]): Promise<{ importedCount: number; matches: Match[] }> {
    const db = getDb();
    const existingTitles = new Set(db.matches.map(m => `${m.homeTeam.toLowerCase()} x ${m.awayTeam.toLowerCase()}`));
    const existingIds = new Set(db.matches.map(m => m.externalId || m.id));

    let candidates: RawFixtureCandidate[] = [];
    if (candidatesOrIds.length > 0 && typeof candidatesOrIds[0] === 'string') {
      const allCandidates = await this.getImportCandidates('upcoming');
      const idSet = new Set(candidatesOrIds as string[]);
      candidates = allCandidates.filter(c => idSet.has(c.id) || idSet.has(c.externalId));
    } else {
      candidates = candidatesOrIds as RawFixtureCandidate[];
    }

    const newMatches: Match[] = [];

    for (const cand of candidates) {
      const title = `${cand.homeTeam.toLowerCase()} x ${cand.awayTeam.toLowerCase()}`;
      if (!existingTitles.has(title) && !existingIds.has(cand.externalId)) {
        const match = this.convertCandidateToMatch(cand);
        newMatches.push(match);
        existingTitles.add(title);
        existingIds.add(cand.externalId);
      }
    }

    if (newMatches.length > 0) {
      db.matches = [...newMatches, ...db.matches];
      db.apiSyncLogs.unshift({
        id: `sync-${Date.now()}`,
        provider: 'API Esportiva Oficial',
        endpoint: '/fixtures/batch-import',
        status: 'success',
        message: `${newMatches.length} jogos reais importados com sucesso.`,
        itemsImported: newMatches.length,
        timestamp: new Date().toISOString()
      });
      logAudit('IMPORTAR_JOGOS', `${newMatches.length} partidas reais importadas da API.`);
      saveDb(db);

      cacheService.clear('candidates:');
      cacheService.clear('sync:');
    }

    return { importedCount: newMatches.length, matches: newMatches };
  }

  /**
   * Sincronização inteligente com verificação de cache para economizar chamadas
   */
  static async syncAllAvailable(): Promise<{ count: number; message: string; fromCache: boolean; apiConfigured: boolean; activeProviderName?: string; syncTimestamp: string }> {
    const cacheKey = 'sync:all_fixtures';
    const cached = cacheService.get<{ count: number; message: string; apiConfigured: boolean; activeProviderName?: string; syncTimestamp: string }>(cacheKey);

    if (cached) {
      return {
        count: cached.data.count,
        message: `${cached.data.message} (Dados recuperados do cache)`,
        fromCache: true,
        apiConfigured: cached.data.apiConfigured,
        activeProviderName: cached.data.activeProviderName,
        syncTimestamp: cached.data.syncTimestamp
      };
    }

    const db = getDb();
    let importedTotal = 0;
    let providerUsed = '';

    // 1. Tenta The Odds API
    const oddsProvider = db.apiProviders.find(p => p.id === 'the-odds-api');
    const oddsKey = oddsProvider ? this.getProviderApiKey(oddsProvider) : undefined;

    if (oddsKey) {
      providerUsed = 'The Odds API';
      const res = await ExternalApiClients.fetchTheOddsApi(oddsKey);
      if (res.success && res.fixtures.length > 0) {
        const batch = await this.batchImportMatches(res.fixtures);
        importedTotal += batch.importedCount;
      }
    }

    // 2. Tenta Football-Data se nenhum foi importado
    if (importedTotal === 0) {
      const fdProvider = db.apiProviders.find(p => p.id === 'football-data');
      const fdKey = fdProvider ? this.getProviderApiKey(fdProvider) : undefined;
      if (fdKey) {
        providerUsed = 'Football-Data.org';
        const res = await ExternalApiClients.fetchFootballData(fdKey);
        if (res.success && res.fixtures.length > 0) {
          const batch = await this.batchImportMatches(res.fixtures);
          importedTotal += batch.importedCount;
        }
      }
    }

    // Se nenhuma API estiver configurada
    if (!oddsKey && !providerUsed) {
      const msg = {
        count: 0,
        message: 'Nenhuma API de futebol configurada. Configure ODDS_API_KEY, FOOTBALL_API_KEY ou SPORTS_API_KEY no arquivo .env.',
        apiConfigured: false,
        syncTimestamp: new Date().toISOString()
      };
      cacheService.set(cacheKey, msg, 60);
      return { ...msg, fromCache: false };
    }

    const result = {
      count: importedTotal,
      message: importedTotal > 0
        ? `${importedTotal} jogos reais sincronizados e publicados com sucesso via ${providerUsed}!`
        : `Nenhum novo jogo pendente retornado por ${providerUsed}. Os jogos existentes já estão atualizados.`,
      apiConfigured: true,
      activeProviderName: providerUsed,
      syncTimestamp: new Date().toISOString()
    };

    cacheService.set(cacheKey, result, 600); // 10 min
    return { ...result, fromCache: false };
  }

  /**
   * Limpa cache manual
   */
  static clearCache(): { clearedCount: number; stats: any } {
    const cleared = cacheService.clear();
    const stats = cacheService.getStats();
    return { clearedCount: cleared, stats };
  }

  /**
   * Inicia o agendador diário para atualizar os jogos do dia todo dia às 02:00 da manhã
   * no fuso horário do Brasil (Horário de Brasília), conforme especificado no item 11.
   */
  static startDailySyncScheduler(): void {
    let lastSyncDateKey = '';

    const checkSchedule = () => {
      try {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(new Date());
        const day = parts.find(p => p.type === 'day')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const year = parts.find(p => p.type === 'year')?.value;
        const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
        const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

        const todayKey = `${year}-${month}-${day}`;

        // Executa exatamente às 02:00 da manhã (fuso de Brasília) uma vez ao dia
        if (hour === 2 && minute < 10 && lastSyncDateKey !== todayKey) {
          lastSyncDateKey = todayKey;
          console.log(`[Scheduler] 02:00 AM (${todayKey}) - Sincronizando jogos diários da API esportiva...`);
          SportsApiService.syncAllAvailable().then(res => {
            console.log('[Scheduler] Sincronização diária concluída:', res.message);
          }).catch(err => {
            console.error('[Scheduler] Erro na sincronização diária das 02:00:', err);
          });
        }
      } catch (e) {
        console.error('[Scheduler] Erro ao checar agendador:', e);
      }
    };

    // Checa a cada 2 minutos
    setInterval(checkSchedule, 1000 * 60 * 2);
    console.log('[Scheduler] Agendador diário das 02:00 AM (Horário de Brasília) ativo.');
  }
}
