import React, { useState, useEffect } from 'react';
import { Match, MatchMarket, PlatformSettings } from '../types/index';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Trophy,
  Filter,
  Gift,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface SportsbookProps {
  onOpenDeposit: () => void;
  onOpenRegister?: () => void;
}

export const Sportsbook: React.FC<SportsbookProps> = ({ onOpenDeposit: _onOpenDeposit, onOpenRegister }) => {
  const { user } = useAuth();
  const { items, addSelection } = useBetSlip();

  const [matches, setMatches] = useState<Match[]>([]);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiConfigured, setApiConfigured] = useState<boolean>(true);
  const [apiStatus, setApiStatus] = useState<string>('connected');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Error fetching platform settings:', e);
    }
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // Exclui partidas encerradas por padrão da lista de próximos jogos
      const res = await fetch('/api/matches?excludeFinished=true');
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setLeagues(data.leagues || []);
        setApiConfigured(Boolean(data.apiConfigured));
        setApiStatus(data.apiStatus || 'connected');
      } else {
        setApiStatus('error');
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setApiStatus('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchMatches();
  }, []);

  // Helper para formatar data e hora convertendo para o fuso horário oficial (Horário de Brasília)
  const formatDateTimeBR = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { date: '--/--', time: '--:--' };

    const dateFormatted = d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit'
    });

    const timeFormatted = d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    });

    return { date: dateFormatted, time: timeFormatted };
  };

  // Helper para comparar dias no fuso horário do Brasil
  const getDayStringBR = (d: Date) => {
    return d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const nowBR = new Date();
  const todayBRStr = getDayStringBR(nowBR);
  const tomorrowBR = new Date(nowBR.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowBRStr = getDayStringBR(tomorrowBR);

  // Filtragem estrita: NÃO mostrar partidas já encerradas dentro da lista de próximos jogos
  const filteredMatches = matches.filter(match => {
    // Exclui sempre partidas já encerradas
    if (match.status === 'finished') {
      return false;
    }

    if (selectedLeague !== 'all' && match.league !== selectedLeague) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${match.homeTeam} ${match.awayTeam} ${match.league}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    const matchDate = new Date(match.startTime);
    const matchDayStr = getDayStringBR(matchDate);

    if (dateFilter === 'today') {
      return matchDayStr === todayBRStr;
    }

    if (dateFilter === 'tomorrow') {
      return matchDayStr === tomorrowBRStr;
    }

    if (dateFilter === 'upcoming') {
      // Próximas partidas (depois de amanhã ou início nas próximas 168 horas)
      return matchDate.getTime() > tomorrowBR.getTime();
    }

    return true;
  });

  const isOptionSelected = (matchId: string, marketId: string, selectionId: string) => {
    return items.some(
      i => i.matchId === matchId && i.marketId === marketId && i.selectionId === selectionId
    );
  };

  const handleSelectOdd = (
    match: Match,
    market: MatchMarket,
    selectionId: string,
    selectionLabel: string,
    odd: number
  ) => {
    if (!odd || odd <= 1.0) return; // Não permite apostar com odd inválida

    addSelection({
      matchId: match.id,
      matchTitle: `${match.homeTeam} x ${match.awayTeam}`,
      league: match.league,
      marketId: market.id,
      marketName: market.name,
      selectionId,
      selectionLabel,
      odd,
      status: 'pending'
    });
  };

  const bonusAmount = settings?.welcomeBonusAmount || 10;
  const isBonusActive = settings?.welcomeBonusEnabled ?? true;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* NOVO BANNER PARA NOVOS USUÁRIOS (Item 2 do requisito) */}
      {/* ---------------------------------------------------------------- */}
      {isBonusActive && (
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0c1a16] via-[#091512] to-[#090d16] p-6 sm:p-8 shadow-2xl transition-all">
          {/* Efeitos visuais de iluminação sutis */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              {/* Tag com ícone */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider shadow-sm">
                <Gift className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>🎁 BÔNUS DE BOAS-VINDAS</span>
              </div>

              {/* Título Principal Conforme Requisito */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                CADASTRE-SE E GANHE{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                  R$ {bonusAmount.toFixed(0)} DE BÔNUS
                </span>
              </h1>

              {/* Texto Secundário Conforme Requisito */}
              <p className="text-sm sm:text-base text-slate-300 font-medium">
                Crie sua conta e aproveite seu bônus de boas-vindas.
              </p>

              {/* Termos e requisitos legais */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-amber-400/90 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <AlertTriangle className="w-3 h-3" />
                  +18 anos obrigatório
                </span>
                <span className="flex items-center gap-1 text-emerald-400/90 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <ShieldCheck className="w-3 h-3" />
                  1 bônus por CPF/usuário
                </span>
              </div>
            </div>

            {/* Ação: Botão ou Status do Bônus */}
            <div className="shrink-0 w-full sm:w-auto">
              {!user ? (
                <button
                  onClick={() => onOpenRegister?.()}
                  className="w-full sm:w-auto px-7 py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>CADASTRE-SE AGORA</span>
                  <ArrowRight className="w-4 h-4 font-bold" />
                </button>
              ) : (
                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 text-center sm:text-right space-y-1">
                  <div className="flex items-center justify-center sm:justify-end gap-1.5 text-xs font-bold text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Conta Ativa</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Olá, <strong className="text-white">{user.name}</strong>!
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Saldo disponível:{' '}
                    <strong className="text-emerald-400 font-bold tabular-nums">
                      R$ {user.balance.toFixed(2)}
                    </strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar time, partida ou campeonato real..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Date Filter Tabs Conforme Requisito: TODOS, HOJE, AMANHÃ, PRÓXIMOS */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            TODOS
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'today'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            HOJE
          </button>
          <button
            onClick={() => setDateFilter('tomorrow')}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'tomorrow'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AMANHÃ
          </button>
          <button
            onClick={() => setDateFilter('upcoming')}
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-md transition-colors whitespace-nowrap ${
              dateFilter === 'upcoming'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            PRÓXIMOS
          </button>
        </div>
      </div>

      {/* League Filter Pills */}
      {leagues.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedLeague('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedLeague === 'all'
                ? 'bg-emerald-600 text-slate-950 shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Todas as Ligas</span>
          </button>

          {leagues.map(league => (
            <button
              key={league}
              onClick={() => setSelectedLeague(league)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedLeague === league
                  ? 'bg-emerald-600 text-slate-950 shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              {league}
            </button>
          ))}
        </div>
      )}

      {/* Matches List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Carregando jogos reais da API esportiva...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        /* Empty States Conforme Requisitos 4 e 5: NUNCA mostrar jogos fictícios */
        <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />

          {apiStatus === 'error' ? (
            <>
              <h3 className="text-base font-bold text-white">
                Não foi possível atualizar os jogos. Tente novamente em alguns instantes.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                A conexão com a API esportiva externa está temporariamente indisponível.
              </p>
              <button
                onClick={fetchMatches}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
            </>
          ) : !apiConfigured || matches.length === 0 ? (
            <>
              <h3 className="text-base font-bold text-white">
                Nenhum jogo disponível no momento.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aguardando atualização das partidas oficiais através da API esportiva configurada.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-white">
                Nenhum jogo disponível no momento.
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Não há partidas agendadas para o filtro selecionado. Tente alterar o período ou liga.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map(match => {
            const isExpanded = expandedMatchId === match.id;
            const main1x2Market = match.markets.find(m => m.type === '1x2');
            const otherMarkets = match.markets.filter(m => m.type !== '1x2');

            // Conversão de data e horário conforme fuso horário oficial (Item 6)
            const { date: dateFormatted, time: timeFormatted } = formatDateTimeBR(match.startTime);

            // Verificação de odds válidas do mercado 1X2 (Item 8)
            const opt1 = main1x2Market?.options.find(o => o.id === '1');
            const optX = main1x2Market?.options.find(o => o.id === 'X');
            const opt2 = main1x2Market?.options.find(o => o.id === '2');

            const hasValidOdds =
              main1x2Market &&
              main1x2Market.active &&
              opt1 && opt1.odd > 1.0 &&
              optX && optX.odd > 1.0 &&
              opt2 && opt2.odd > 1.0;

            return (
              <div
                key={match.id}
                className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden transition-all shadow-sm"
              >
                {/* Match Card Header */}
                <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">{match.league}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {dateFormatted} às {timeFormatted}
                    </span>
                    {match.status === 'live' && (
                      <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/30 uppercase animate-pulse">
                        Ao Vivo
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Main Body: Teams and 1X2 Odds */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Teams info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                      <span className="text-sm font-bold text-white tracking-wide">
                        {match.homeTeam}
                      </span>
                      {typeof match.homeScore === 'number' && (
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">
                          {match.homeScore}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4">
                      <span className="text-sm font-bold text-white tracking-wide">
                        {match.awayTeam}
                      </span>
                      {typeof match.awayScore === 'number' && (
                        <span className="text-sm font-bold text-emerald-400 tabular-nums">
                          {match.awayScore}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1X2 Market Buttons or "Odds indisponíveis" (Item 8) */}
                  <div className="w-full md:w-80">
                    {hasValidOdds && main1x2Market ? (
                      <div className="grid grid-cols-3 gap-2">
                        {main1x2Market.options.map(opt => {
                          const selected = isOptionSelected(match.id, main1x2Market.id, opt.id);
                          return (
                            <button
                              key={opt.id}
                              disabled={match.status === 'finished'}
                              onClick={() =>
                                handleSelectOdd(match, main1x2Market, opt.id, opt.label, opt.odd)
                              }
                              className={`py-2 px-2 rounded-lg border text-center transition-all ${
                                selected
                                  ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/20'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-500/60'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              <span className="text-[10px] block opacity-80 leading-none mb-1">
                                {opt.id === '1' ? 'Casa (1)' : opt.id === 'X' ? 'Empate (X)' : 'Fora (2)'}
                              </span>
                              <span className="text-xs font-black tabular-nums">
                                {opt.odd.toFixed(2)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 bg-slate-900 border border-slate-800/90 rounded-lg text-center text-slate-400 text-xs font-semibold italic">
                        Odds indisponíveis
                      </div>
                    )}
                  </div>

                  {/* Toggle More Markets */}
                  {otherMarkets.length > 0 && (
                    <button
                      onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors whitespace-nowrap"
                    >
                      <span>+{otherMarkets.length} mercados</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Expanded Markets Drawer */}
                {isExpanded && otherMarkets.length > 0 && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-800/80 bg-slate-950/40 space-y-3 animate-in fade-in duration-150">
                    {otherMarkets.map(market => (
                      <div key={market.id} className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          {market.name}
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {market.options.map(opt => {
                            const selected = isOptionSelected(match.id, market.id, opt.id);
                            const hasOdd = opt.odd > 1.0;

                            return (
                              <button
                                key={opt.id}
                                disabled={!hasOdd || match.status === 'finished'}
                                onClick={() =>
                                  hasOdd &&
                                  handleSelectOdd(match, market, opt.id, opt.label, opt.odd)
                                }
                                className={`py-1.5 px-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                                  selected
                                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700/80 hover:border-emerald-500/60'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                              >
                                <span className="text-xs truncate mr-2">{opt.label}</span>
                                <span className="text-xs font-black tabular-nums">
                                  {hasOdd ? opt.odd.toFixed(2) : 'Indisponível'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
