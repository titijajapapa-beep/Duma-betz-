import { RawFixtureCandidate } from './sportsApiTypes';

export interface ExternalFetchResult {
  success: boolean;
  providerId: string;
  fixtures: RawFixtureCandidate[];
  latencyMs: number;
  requestsRemaining?: number;
  requestsUsed?: number;
  errorMessage?: string;
  statusCode?: number;
  diagnostics?: string;
}

export class ExternalApiClients {
  private static FETCH_TIMEOUT_MS = 6000;

  /**
   * Provedor: The Odds API
   * Plano Free: 500 req/mês
   * Documentação: https://the-odds-api.com/liveapi/guides/v4/
   */
  static async fetchTheOddsApi(apiKey: string): Promise<ExternalFetchResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      // Busca odds de futebol do Brasileirão Série A ou futebol internacional
      const url = `https://api.the-odds-api.com/v4/sports/soccer_brazil_campeonato/odds/?apiKey=${encodeURIComponent(
        apiKey.trim()
      )}&regions=eu&markets=h2h`;

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'DumaBets-Sportsbook/1.0' }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      const remainingHeader = response.headers.get('x-requests-remaining');
      const usedHeader = response.headers.get('x-requests-used');
      const requestsRemaining = remainingHeader ? parseInt(remainingHeader, 10) : undefined;
      const requestsUsed = usedHeader ? parseInt(usedHeader, 10) : undefined;

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `HTTP ${response.status}: `;
        if (response.status === 401) {
          errorMsg += 'Chave de API inválida ou não autorizada pela The Odds API.';
        } else if (response.status === 429) {
          errorMsg += 'Limite mensal de 500 requisições gratuitas atingido.';
        } else {
          errorMsg += errorText.slice(0, 150);
        }

        return {
          success: false,
          providerId: 'the-odds-api',
          fixtures: [],
          latencyMs,
          statusCode: response.status,
          requestsRemaining,
          requestsUsed,
          errorMessage: errorMsg,
          diagnostics: `Falha na requisição com status ${response.status}. Verifique a variável ODDS_API_KEY.`
        };
      }

      const json = await response.json();
      const fixtures: RawFixtureCandidate[] = [];

      if (Array.isArray(json)) {
        for (const item of json) {
          // Extrai odds do bookmaker padrão ou primeira casa disponível (ex: betfair, bet365)
          const bookmaker = item.bookmakers?.[0];
          const market = bookmaker?.markets?.find((m: any) => m.key === 'h2h');

          let homeOdd = 0;
          let drawOdd = 0;
          let awayOdd = 0;

          if (market?.outcomes) {
            for (const out of market.outcomes) {
              if (out.name === item.home_team) homeOdd = out.price;
              else if (out.name === item.away_team) awayOdd = out.price;
              else if (out.name.toLowerCase() === 'draw') drawOdd = out.price;
            }
          }

          fixtures.push({
            id: `toa-${item.id}`,
            externalId: `toa-${item.id}`,
            league: item.sport_title || 'Futebol Internacional',
            homeTeam: item.home_team,
            awayTeam: item.away_team,
            startTime: item.commence_time || new Date().toISOString(),
            status: 'scheduled',
            odds: {
              home: homeOdd > 0 ? Number(homeOdd.toFixed(2)) : 0,
              draw: drawOdd > 0 ? Number(drawOdd.toFixed(2)) : 0,
              away: awayOdd > 0 ? Number(awayOdd.toFixed(2)) : 0
            }
          });
        }
      }

      return {
        success: true,
        providerId: 'the-odds-api',
        fixtures,
        latencyMs,
        requestsRemaining,
        requestsUsed,
        diagnostics: `Conexão excelente (${latencyMs}ms). ${fixtures.length} confrontos com odds reais de casas obtidos.`
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? 'Tempo limite da requisição esgotado (timeout 6s)' : err.message || 'Erro de rede';

      return {
        success: false,
        providerId: 'the-odds-api',
        fixtures: [],
        latencyMs,
        errorMessage: msg,
        diagnostics: `Erro ao comunicar com The Odds API: ${msg}`
      };
    }
  }

  /**
   * Provedor: Football-Data.org
   * Plano Free: 10 chamadas/min
   * Documentação: https://docs.football-data.org
   */
  static async fetchFootballData(apiKey: string): Promise<ExternalFetchResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      const url = 'https://api.football-data.org/v4/matches?status=SCHEDULED';
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'X-Auth-Token': apiKey.trim(),
          'User-Agent': 'DumaBets-Sportsbook/1.0'
        }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        let msg = `HTTP ${response.status}: `;
        if (response.status === 403 || response.status === 401) {
          msg += 'Chave FOOTBALL_API_KEY ou FSAPI_KEY inválida.';
        } else if (response.status === 429) {
          msg += 'Limite de 10 chamadas por minuto excedido (rate limit).';
        } else {
          msg += (await response.text()).slice(0, 150);
        }

        return {
          success: false,
          providerId: 'football-data',
          fixtures: [],
          latencyMs,
          statusCode: response.status,
          errorMessage: msg,
          diagnostics: `Erro retornado pelo Football-Data.org (${response.status})`
        };
      }

      const json = await response.json();
      const fixtures: RawFixtureCandidate[] = [];

      if (json.matches && Array.isArray(json.matches)) {
        for (const m of json.matches.slice(0, 15)) {
          fixtures.push({
            id: `fd-${m.id}`,
            externalId: `fd-${m.id}`,
            league: m.competition?.name || 'Futebol Internacional',
            homeTeam: m.homeTeam?.name || 'Mandante',
            awayTeam: m.awayTeam?.name || 'Visitante',
            startTime: m.utcDate || new Date().toISOString(),
            status: 'scheduled',
            odds: {
              home: 0,
              draw: 0,
              away: 0
            }
          });
        }
      }

      return {
        success: true,
        providerId: 'football-data',
        fixtures,
        latencyMs,
        diagnostics: `Conexão estabelecida com sucesso (${latencyMs}ms). ${fixtures.length} partidas sincronizadas.`
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout ? 'Timeout na conexão com Football-Data.org' : err.message;

      return {
        success: false,
        providerId: 'football-data',
        fixtures: [],
        latencyMs,
        errorMessage: msg,
        diagnostics: `Erro de rede: ${msg}`
      };
    }
  }

  /**
   * Provedor: API-Football (API-Sports)
   * Plano Free: 100 req/dia
   * Documentação: https://www.api-football.com/documentation-v3
   */
  static async fetchApiFootball(apiKey: string): Promise<ExternalFetchResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      const url = 'https://v3.football.api-sports.io/status';
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'x-apisports-key': apiKey.trim()
        }
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          providerId: 'api-football',
          fixtures: [],
          latencyMs,
          statusCode: response.status,
          errorMessage: `Status HTTP ${response.status}`,
          diagnostics: 'Falha na validação com API-Football.'
        };
      }

      const json = await response.json();
      const requestsUsed = json.response?.requests?.current;
      const limit_day = json.response?.requests?.limit_day || 100;
      const requestsRemaining = typeof requestsUsed === 'number' ? Math.max(0, limit_day - requestsUsed) : undefined;

      return {
        success: true,
        providerId: 'api-football',
        fixtures: [],
        latencyMs,
        requestsRemaining,
        requestsUsed,
        diagnostics: `Conexão ativa (${latencyMs}ms). Cota de ${requestsUsed}/${limit_day} requisições hoje.`
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        providerId: 'api-football',
        fixtures: [],
        latencyMs,
        errorMessage: err.message,
        diagnostics: `Erro de conexão: ${err.message}`
      };
    }
  }
}
