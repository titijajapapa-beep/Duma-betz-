import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Match, User, Ticket, ApiProviderConfig, AuditLog, PlatformSettings, CacheStats } from '../../types/index';
import {
  ShieldCheck,
  TrendingUp,
  Users,
  UserCheck,
  Receipt,
  Trophy,
  Sliders,
  Database,
  FileText,
  DollarSign,
  Plus,
  RefreshCw,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Edit,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  DownloadCloud,
  Layers,
  Search,
  Gift
} from 'lucide-react';

interface AdminDashboardProps {
  onViewTicket: (ticket: Ticket) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onViewTicket }) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'matches' | 'import' | 'agents' | 'users' | 'tickets' | 'financial' | 'api-manager' | 'settings' | 'logs'
  >('overview');

  // Stats state
  const [period, setPeriod] = useState<string>('7days');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Matches state
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchSearch, setMatchSearch] = useState('');

  // Import candidate state
  const [importFilter, setImportFilter] = useState<'today' | 'tomorrow' | 'upcoming' | 'five' | 'ten'>('today');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Manual Match Modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [manualLeague, setManualLeague] = useState('Brasileirão Série A');
  const [manualHomeTeam, setManualHomeTeam] = useState('');
  const [manualAwayTeam, setManualAwayTeam] = useState('');
  const [manualStartTime, setManualStartTime] = useState('');
  const [manualOddsHome, setManualOddsHome] = useState('2.10');
  const [manualOddsDraw, setManualOddsDraw] = useState('3.20');
  const [manualOddsAway, setManualOddsAway] = useState('3.40');

  // Finish match with scores Modal
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [finishHomeScore, setFinishHomeScore] = useState<number>(0);
  const [finishAwayScore, setFinishAwayScore] = useState<number>(0);

  // Agents state
  const [agents, setAgents] = useState<any[]>([]);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentUsername, setNewAgentUsername] = useState('');
  const [newAgentPassword, setNewAgentPassword] = useState('');
  const [newAgentPhone, setNewAgentPhone] = useState('');
  const [newAgentCommission, setNewAgentCommission] = useState('12');
  const [newAgentCode, setNewAgentCode] = useState('');

  // Users state
  const [usersList, setUsersList] = useState<User[]>([]);

  // Tickets state
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);

  // Financial state
  const [financialData, setFinancialData] = useState<{ transactions: any[]; commissions: any[] }>({
    transactions: [],
    commissions: []
  });

  // API Manager state
  const [apiProviders, setApiProviders] = useState<ApiProviderConfig[]>([]);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [testingApiId, setTestingApiId] = useState<string | null>(null);
  const [apiTestResult, setApiTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [syncingApi, setSyncingApi] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Settle now state
  const [settling, setSettling] = useState(false);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchMatches = async () => {
    if (!token) return;
    setMatchesLoading(true);
    try {
      const res = await fetch('/api/admin/matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchImportCandidates = async (f = importFilter) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/import/candidates?filter=${f}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        // default select all candidates returned
        setSelectedCandidateIds((data.candidates || []).map((c: any) => c.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgents = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTickets = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAllTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinancial = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/financial', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFinancialData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApiManager = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/api-manager', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiProviders(data.providers || []);
        setSyncLogs(data.syncLogs || []);
        setCacheStats(data.cacheStats || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period, token]);

  useEffect(() => {
    if (activeTab === 'matches') {
      fetchMatches();
      fetchApiManager();
    }
    if (activeTab === 'import') fetchImportCandidates();
    if (activeTab === 'agents') fetchAgents();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'tickets') fetchTickets();
    if (activeTab === 'financial') fetchFinancial();
    if (activeTab === 'api-manager') fetchApiManager();
    if (activeTab === 'settings') fetchSettings();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, token]);

  // Handle batch import
  const handleBatchImport = async (ids: string[]) => {
    if (ids.length === 0) return;
    setImporting(true);
    setImportSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/import/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ candidateIds: ids })
      });
      const data = await res.json();
      setImporting(false);
      if (res.ok) {
        setImportSuccessMsg(`${data.importedCount} jogos cadastrados e publicados com sucesso!`);
        fetchImportCandidates();
        fetchMatches();
      }
    } catch (err) {
      setImporting(false);
      console.error(err);
    }
  };

  // Handle Settle Now / Update Results
  const handleSettleNow = async () => {
    setSettling(true);
    setSettleMsg(null);
    try {
      const res = await fetch('/api/admin/matches/settle-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSettling(false);
      if (res.ok) {
        setSettleMsg(data.message);
        fetchStats();
        fetchMatches();
        fetchTickets();
      }
    } catch (err) {
      setSettling(false);
      console.error(err);
    }
  };

  // Handle manual match creation
  const handleCreateManualMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          league: manualLeague,
          homeTeam: manualHomeTeam,
          awayTeam: manualAwayTeam,
          startTime: manualStartTime || undefined,
          oddsHome: manualOddsHome,
          oddsDraw: manualOddsDraw,
          oddsAway: manualOddsAway
        })
      });
      if (res.ok) {
        setShowMatchModal(false);
        setManualHomeTeam('');
        setManualAwayTeam('');
        fetchMatches();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Finish match with score
  const handleFinishMatch = async () => {
    if (!editingMatch) return;
    try {
      const res = await fetch(`/api/admin/matches/${editingMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'finished',
          homeScore: finishHomeScore,
          awayScore: finishAwayScore
        })
      });
      if (res.ok) {
        setEditingMatch(null);
        fetchMatches();
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete match
  const handleDeleteMatch = async (id: string) => {
    if (!confirm('Deseja realmente remover esta partida do sistema?')) return;
    try {
      const res = await fetch(`/api/admin/matches/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMatches();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new Cambista
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAgentName,
          username: newAgentUsername,
          password: newAgentPassword,
          phone: newAgentPhone,
          commissionRate: newAgentCommission,
          customCode: newAgentCode || undefined
        })
      });
      if (res.ok) {
        setShowAgentModal(false);
        setNewAgentName('');
        setNewAgentUsername('');
        setNewAgentPassword('');
        setNewAgentPhone('');
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle User / Agent active status
  const handleToggleUserStatus = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchUsers();
        fetchAgents();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Test API connection
  const handleTestApi = async (providerId: string) => {
    setTestingApiId(providerId);
    setApiTestResult(null);
    try {
      const res = await fetch(`/api/admin/api-manager/${providerId}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTestingApiId(null);
      setApiTestResult({ id: providerId, success: data.success, message: data.message });
      fetchApiManager();
    } catch (err: any) {
      setTestingApiId(null);
      setApiTestResult({ id: providerId, success: false, message: err.message || 'Erro' });
    }
  };

  // Sync matches with API
  const handleSyncApi = async () => {
    setSyncingApi(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/matches/sync-now', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSyncingApi(false);
      setSyncFeedback(data.message || 'Sincronização de jogos concluída com sucesso!');
      fetchMatches();
      fetchApiManager();
    } catch (err: any) {
      setSyncingApi(false);
      setSyncFeedback(err.message || 'Erro ao sincronizar jogos com a API esportiva.');
      console.error(err);
    }
  };

  // Clear API Cache
  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      const res = await fetch('/api/admin/api-manager/clear-cache', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setClearingCache(false);
      if (res.ok) {
        setCacheStats(data.cacheStats || null);
        alert(data.message || 'Cache limpo com sucesso!');
        fetchApiManager();
      }
    } catch (err) {
      setClearingCache(false);
      console.error(err);
    }
  };

  // Save platform settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation Bar */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Painel Administrativo DUMA BETS</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Master Admin
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Gerenciamento integral de bancas, partidas, odds, cambistas e apuração de resultados.
            </p>
          </div>
        </div>

        {/* Global Fast Action: Update Results Now */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSettleNow}
            disabled={settling}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${settling ? 'animate-spin' : ''}`} />
            <span>{settling ? 'Apurando...' : 'ATUALIZAR RESULTADOS AGORA'}</span>
          </button>
        </div>
      </div>

      {settleMsg && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{settleMsg}</span>
        </div>
      )}

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {[
          { id: 'overview', label: 'Dashboard', icon: TrendingUp },
          { id: 'matches', label: 'Jogos Cadastrados', icon: Trophy },
          { id: 'import', label: 'Importar Jogos', icon: DownloadCloud },
          { id: 'agents', label: 'Cambistas', icon: UserCheck },
          { id: 'users', label: 'Usuários', icon: Users },
          { id: 'tickets', label: 'Bilhetes', icon: Receipt },
          { id: 'financial', label: 'Financeiro & PIX', icon: DollarSign },
          { id: 'api-manager', label: 'Gerenciador de APIs', icon: Database },
          { id: 'settings', label: 'Configurações', icon: Sliders },
          { id: 'logs', label: 'Logs do Sistema', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW DASHBOARD */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Period selector */}
          <div className="flex items-center justify-between bg-[#0d1424] p-3 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-300">Filtrar período estatístico:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: '7days', label: 'Últimos 7 dias' },
                { id: '30days', label: 'Últimos 30 dias' },
                { id: 'all', label: 'Geral' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    period === p.id ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loadingStats ? (
            <div className="p-12 text-center text-slate-400">Carregando métricas...</div>
          ) : (
            <>
              {/* Stat Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {/* Total Apostado */}
                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Total Apostado</span>
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums block">
                    R$ {(stats?.totalBetAmount || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {stats?.totalTickets || 0} bilhetes emitidos
                  </span>
                </div>

                {/* Total Pago aos Ganhadores */}
                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Total em Prêmios Pagos</span>
                  <span className="text-xl sm:text-2xl font-black text-rose-400 tabular-nums block">
                    R$ {(stats?.totalWonPayout || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {stats?.wonTickets || 0} bilhetes premiados
                  </span>
                </div>

                {/* Comissões de Cambistas */}
                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Comissões dos Cambistas</span>
                  <span className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums block">
                    R$ {(stats?.totalCommissions || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {stats?.totalAgents || 0} cambistas na rede
                  </span>
                </div>

                {/* Lucro Líquido */}
                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">Resultado Líquido da Banca</span>
                  <span className={`text-xl sm:text-2xl font-black tabular-nums block ${
                    (stats?.netProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    R$ {(stats?.netProfit || 0).toFixed(2)}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Lucro bruto menos comissões
                  </span>
                </div>
              </div>

              {/* Secondary Stats: Tickets Breakdown & Games */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Bilhetes Pendentes</span>
                    <span className="text-lg font-bold text-amber-300 tabular-nums">{stats?.pendingTickets || 0}</span>
                  </div>
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>

                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Bilhetes Perdidos</span>
                    <span className="text-lg font-bold text-rose-400 tabular-nums">{stats?.lostTickets || 0}</span>
                  </div>
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>

                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Jogos Ativos no Site</span>
                    <span className="text-lg font-bold text-emerald-400 tabular-nums">{stats?.activeMatches || 0}</span>
                  </div>
                  <Trophy className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Total de Usuários</span>
                    <span className="text-lg font-bold text-white tabular-nums">{stats?.totalUsers || 0}</span>
                  </div>
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
              </div>

              {/* Visual Daily Trends Chart */}
              <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Movimento Diário da Plataforma (Volume vs Prêmios Pagos)</span>
                  </h3>
                  <span className="text-xs text-slate-400">Últimos 7 dias</span>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-4 items-end h-48">
                  {stats?.chartData?.map((item: any, idx: number) => {
                    const maxVal = Math.max(...stats.chartData.map((d: any) => Math.max(d.volume, d.payout, 50)));
                    const volHeight = Math.max(8, Math.round((item.volume / maxVal) * 100));
                    const payHeight = Math.max(8, Math.round((item.payout / maxVal) * 100));

                    return (
                      <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1.5 h-36">
                          {/* Volume Bar */}
                          <div
                            style={{ height: `${volHeight}%` }}
                            title={`Volume Apostado: R$ ${item.volume.toFixed(2)}`}
                            className="w-4 sm:w-6 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                          />
                          {/* Payout Bar */}
                          <div
                            style={{ height: `${payHeight}%` }}
                            title={`Prêmios Pagos: R$ ${item.payout.toFixed(2)}`}
                            className="w-4 sm:w-6 bg-rose-500/80 rounded-t transition-all hover:bg-rose-400"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span className="text-slate-300">Volume Apostado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500/80 rounded-sm" />
                    <span className="text-slate-300">Prêmios Pagos</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 2: MATCHES MANAGEMENT */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {/* AREA OBRIGATÓRIA: JOGOS -> SINCRONIZAR JOGOS (Item 10) */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                  <span>JOGOS → SINCRONIZAR JOGOS</span>
                </div>
                <h3 className="text-base font-bold text-white">Sincronização de Partidas Oficiais</h3>
                <p className="text-xs text-slate-400">
                  Carrega os jogos oficiais diretamente das APIs esportivas configuradas (The Odds API / Football-Data).
                </p>
              </div>

              <button
                onClick={handleSyncApi}
                disabled={syncingApi}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${syncingApi ? 'animate-spin' : ''}`} />
                <span>{syncingApi ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}</span>
              </button>
            </div>

            {syncFeedback && (
              <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}

            {/* 4 Métricas Obrigatórias: Última sincronização, Quantidade de jogos encontrados, Quantidade de jogos ativos, Status da API */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Última sincronização */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-medium">Última Sincronização</span>
                <span className="text-xs sm:text-sm font-bold text-white block mt-1">
                  {syncLogs && syncLogs.length > 0
                    ? new Date(syncLogs[0].timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Ainda não sincronizado'}
                </span>
              </div>

              {/* 2. Quantidade de jogos encontrados */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-medium">Jogos Encontrados</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 tabular-nums block mt-0.5">
                  {syncLogs && syncLogs.length > 0 ? syncLogs[0].itemsImported || matches.length : matches.length}
                </span>
              </div>

              {/* 3. Quantidade de jogos ativos */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-medium">Jogos Ativos no Sistema</span>
                <span className="text-base sm:text-lg font-black text-cyan-400 tabular-nums block mt-0.5">
                  {matches.filter(m => m.status !== 'finished').length}
                </span>
              </div>

              {/* 4. Status da API */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-400 block font-medium">Status da API</span>
                <div className="mt-1 flex items-center gap-1.5">
                  {(() => {
                    const activeProvider = apiProviders.find(p => p.configured);
                    if (activeProvider?.status === 'connected') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Conectada ({activeProvider.name})
                        </span>
                      );
                    } else if (activeProvider?.status === 'error') {
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950 text-rose-400 border border-rose-800/50">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Erro ({activeProvider.name})
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-400">
                        Não Configurada
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1424] p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={matchSearch}
                onChange={e => setMatchSearch(e.target.value)}
                placeholder="Buscar partidas cadastradas..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('import')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Importar da API</span>
              </button>
              <button
                onClick={() => setShowMatchModal(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Jogo Manual</span>
              </button>
            </div>
          </div>

          {matchesLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">Carregando jogos...</div>
          ) : (
            <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Campeonato</th>
                      <th className="py-3 px-4">Confronto</th>
                      <th className="py-3 px-4">Data/Hora</th>
                      <th className="py-3 px-4 text-center">Odds 1X2</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Placar</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {matches
                      .filter(m =>
                        `${m.homeTeam} ${m.awayTeam} ${m.league}`
                          .toLowerCase()
                          .includes(matchSearch.toLowerCase())
                      )
                      .map(match => {
                        const m1x2 = match.markets.find(m => m.type === '1x2');
                        const hOdd = m1x2?.options.find(o => o.id === '1')?.odd || 0;
                        const dOdd = m1x2?.options.find(o => o.id === 'X')?.odd || 0;
                        const aOdd = m1x2?.options.find(o => o.id === '2')?.odd || 0;

                        return (
                          <tr key={match.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-300">{match.league}</td>
                            <td className="py-3 px-4 font-bold text-white">
                              {match.homeTeam} x {match.awayTeam}
                            </td>
                            <td className="py-3 px-4 text-slate-400">
                              {new Date(match.startTime).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-emerald-400 tabular-nums">
                                {hOdd.toFixed(2)} | {dOdd.toFixed(2)} | {aOdd.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                match.status === 'finished'
                                  ? 'bg-slate-800 text-slate-300'
                                  : match.status === 'live'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              }`}>
                                {match.status === 'finished' ? 'Encerrado' : match.status === 'live' ? 'Ao Vivo' : 'Agendado'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-white tabular-nums">
                              {typeof match.homeScore === 'number'
                                ? `${match.homeScore} x ${match.awayScore}`
                                : '- x -'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingMatch(match);
                                    setFinishHomeScore(match.homeScore || 0);
                                    setFinishAwayScore(match.awayScore || 0);
                                  }}
                                  className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Encerrar com placar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMatch(match.id)}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 3: IMPORTAR JOGOS (MANDATORY PROMPT SECTION) */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DownloadCloud className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Importação Automática e em Lote</h3>
              </div>
              <p className="text-xs text-slate-400">
                Consulte as partidas disponíveis no radar esportivo, selecione múltiplos jogos e publique de uma só vez na plataforma.
              </p>
            </div>

            {/* Quick Action Filter Buttons requested in prompt */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => { setImportFilter('today'); fetchImportCandidates('today'); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  importFilter === 'today'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                IMPORTAR JOGOS DE HOJE
              </button>

              <button
                onClick={() => { setImportFilter('tomorrow'); fetchImportCandidates('tomorrow'); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  importFilter === 'tomorrow'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                IMPORTAR JOGOS DE AMANHÃ
              </button>

              <button
                onClick={() => { setImportFilter('upcoming'); fetchImportCandidates('upcoming'); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  importFilter === 'upcoming'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                IMPORTAR PRÓXIMOS JOGOS
              </button>

              <button
                onClick={() => { setImportFilter('five'); fetchImportCandidates('five'); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  importFilter === 'five'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                IMPORTAR 5 JOGOS
              </button>

              <button
                onClick={() => { setImportFilter('ten'); fetchImportCandidates('ten'); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                  importFilter === 'ten'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                IMPORTAR 10 JOGOS
              </button>
            </div>
          </div>

          {importSuccessMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {/* Candidates Interactive Selection Table */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Partidas Disponíveis para Cadastro ({candidates.length})
                </span>
                <span className="text-xs text-slate-400">
                  · {selectedCandidateIds.length} selecionadas
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCandidateIds.length === candidates.length) {
                      setSelectedCandidateIds([]);
                    } else {
                      setSelectedCandidateIds(candidates.map(c => c.id));
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                >
                  {selectedCandidateIds.length === candidates.length ? 'Desmarcar Todos' : 'SELECIONAR VÁRIOS'}
                </button>

                <button
                  type="button"
                  disabled={selectedCandidateIds.length === 0 || importing}
                  onClick={() => handleBatchImport(selectedCandidateIds)}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-lg shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {importing ? 'Adicionando...' : 'ADICIONAR SELECIONADOS / PUBLICAR'}
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Todas as partidas deste filtro já foram importadas para o banco de dados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCandidateIds.length === candidates.length && candidates.length > 0}
                          onChange={e => {
                            if (e.target.checked) setSelectedCandidateIds(candidates.map(c => c.id));
                            else setSelectedCandidateIds([]);
                          }}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                        />
                      </th>
                      <th className="py-3 px-4">Campeonato</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Horário</th>
                      <th className="py-3 px-4">Mandante</th>
                      <th className="py-3 px-4">Visitante</th>
                      <th className="py-3 px-4 text-center">Odds Pré-Jogo</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {candidates.map(cand => {
                      const isSelected = selectedCandidateIds.includes(cand.id);
                      const d = new Date(cand.startTime);
                      const dateStr = d.toLocaleDateString('pt-BR');
                      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr
                          key={cand.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== cand.id));
                            } else {
                              setSelectedCandidateIds([...selectedCandidateIds, cand.id]);
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-950/20' : 'hover:bg-slate-900/40'
                          }`}
                        >
                          <td className="py-3 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedCandidateIds([...selectedCandidateIds, cand.id]);
                                } else {
                                  setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== cand.id));
                                }
                              }}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-300">{cand.league}</td>
                          <td className="py-3 px-4 text-slate-400">{dateStr}</td>
                          <td className="py-3 px-4 text-slate-400">{timeStr}</td>
                          <td className="py-3 px-4 font-bold text-white">{cand.homeTeam}</td>
                          <td className="py-3 px-4 font-bold text-white">{cand.awayTeam}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-400 tabular-nums">
                            {cand.odds.home.toFixed(2)} | {cand.odds.draw.toFixed(2)} | {cand.odds.away.toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                              Pronto para Importar
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 4: GERENCIAR CAMBISTAS */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'agents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1424] p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <span>Gerenciador de Cambistas</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre e configure cambistas, taxas de comissão individuais e acompanhe movimentações.
              </p>
            </div>

            <button
              onClick={() => setShowAgentModal(true)}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cambista</span>
            </button>
          </div>

          <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nome / Usuário</th>
                    <th className="py-3 px-4">Código & Link</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4 text-center">Taxa (%)</th>
                    <th className="py-3 px-4 text-right">Bilhetes</th>
                    <th className="py-3 px-4 text-right">Total Movimentado</th>
                    <th className="py-3 px-4 text-right">Comissão Gerada</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {agents.map(ag => (
                    <tr key={ag.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-white block">{ag.name}</span>
                        <span className="text-[11px] text-slate-400">@{ag.username}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                          {ag.agentCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{ag.phone || '-'}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-300">
                        {ag.commissionRate || 10}%
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">
                        {ag.totalTickets}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white tabular-nums">
                        R$ {ag.totalVolume.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-400 tabular-nums">
                        R$ {ag.totalCommission.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ag.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-rose-950 text-rose-400 border border-rose-800/50'
                        }`}>
                          {ag.status === 'active' ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleUserStatus(ag.id)}
                          className={`p-1.5 rounded transition-colors ${
                            ag.status === 'active'
                              ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                          }`}
                          title={ag.status === 'active' ? 'Bloquear cambista' : 'Ativar cambista'}
                        >
                          {ag.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 5: USUARIOS GERAIS */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Todos os Usuários ({usersList.length})</h3>
            <span className="text-xs text-slate-400">Controle de acesso e bloqueios</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome</th>
                  <th className="py-3 px-4">Usuário / E-mail</th>
                  <th className="py-3 px-4">Nível (Role)</th>
                  <th className="py-3 px-4">Indicado por</th>
                  <th className="py-3 px-4 text-right">Saldo em Carteira</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className="block text-slate-200">@{u.username}</span>
                      <span className="block text-[11px] text-slate-500">{u.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                          : u.role === 'agent'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{u.referredByAgentCode || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      R$ {u.balance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleUserStatus(u.id)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors"
                        >
                          {u.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 6: TODOS OS BILHETES */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'tickets' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Todos os Bilhetes Emitidos ({allTickets.length})</h3>
            <span className="text-xs text-slate-400">Clique para abrir o comprovante térmico</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Cambista</th>
                  <th className="py-3 px-4">Data/Hora</th>
                  <th className="py-3 px-4 text-right">Valor Apostado</th>
                  <th className="py-3 px-4 text-right">Cotação</th>
                  <th className="py-3 px-4 text-right">Possível Retorno</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {allTickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-black text-white">{t.code}</td>
                    <td className="py-3 px-4">{t.userName}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{t.agentCode || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(t.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">
                      R$ {t.stake.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                      @{t.totalOdds.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white tabular-nums">
                      R$ {t.potentialReturn.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'won'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                          : t.status === 'lost'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onViewTicket(t)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 7: FINANCEIRO & PIX */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Transações Financeiras & Solicitações de Saque</h3>
              <span className="text-xs text-slate-400">{financialData.transactions.length} registros</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Usuário</th>
                    <th className="py-3 px-4">Descrição / Chave PIX</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ação Administrativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {financialData.transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-bold capitalize text-white">{tx.type}</td>
                      <td className="py-3 px-4">{tx.userName}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {tx.description} {tx.pixKey ? `(PIX: ${tx.pixKey})` : ''}
                      </td>
                      <td className={`py-3 px-4 text-right font-black tabular-nums ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        R$ {Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          tx.status === 'completed'
                            ? 'bg-emerald-950 text-emerald-400'
                            : tx.status === 'pending'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {tx.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={async () => {
                                await fetch(`/api/admin/financial/${tx.id}/status`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ status: 'completed' })
                                });
                                fetchFinancial();
                              }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-[11px] rounded"
                            >
                              Aprovar
                            </button>
                            <button
                              onClick={async () => {
                                await fetch(`/api/admin/financial/${tx.id}/status`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ status: 'rejected' })
                                });
                                fetchFinancial();
                              }}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 8: GERENCIADOR DE APIS (MANDATORY PROMPT REQUIREMENT) */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'api-manager' && (
        <div className="space-y-6">
          {/* Main Top Header */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-bold text-white">Gerenciador de Provedores de API & Economizador de Cache</h3>
                </div>
                <p className="text-xs text-slate-400 max-w-xl">
                  Camada de serviço para consumo de APIs esportivas com controle de limites, cache persistente e tolerância a falhas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                  title="Limpar itens em memória e disco para forçar novas requisições"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{clearingCache ? 'Limpando...' : 'Limpar Cache'}</span>
                </button>

                <button
                  onClick={handleSyncApi}
                  disabled={syncingApi}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncingApi ? 'animate-spin' : ''}`} />
                  <span>{syncingApi ? 'Sincronizando...' : 'SINCRONIZAR AGORA'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cache Layer & Performance Metrics Banner */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>Camada de Cache & Economia de Cotas da API</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Evita chamadas redundantes e protege os limites dos planos gratuitos
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Itens no Cache</span>
                <span className="text-xl font-black text-white tabular-nums">
                  {cacheStats?.size ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block">chaves armazenadas</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Taxa de Cache Hit</span>
                <span className="text-xl font-black text-emerald-400 tabular-nums">
                  {cacheStats?.hitRate ?? 0}%
                </span>
                <span className="text-[10px] text-slate-500 block">economia de requisições</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Chamadas Economizadas (Hits)</span>
                <span className="text-xl font-black text-blue-400 tabular-nums">
                  {cacheStats?.hits ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block">servidas direto do disco</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[11px] text-slate-400 block">Consultas Externas (Misses)</span>
                <span className="text-xl font-black text-amber-300 tabular-nums">
                  {cacheStats?.misses ?? 0}
                </span>
                <span className="text-[10px] text-slate-500 block">enviadas aos provedores</span>
              </div>
            </div>
          </div>

          {/* Providers Catalog Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {apiProviders.map(provider => {
              const isTesting = testingApiId === provider.id;
              const hasTestResult = apiTestResult?.id === provider.id;

              return (
                <div
                  key={provider.id}
                  className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{provider.name}</h4>
                        <span className="text-[11px] text-emerald-400 font-semibold">{provider.type}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        provider.status === 'connected'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : provider.status === 'error'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {provider.status === 'connected'
                          ? 'Conectado'
                          : provider.status === 'error'
                          ? 'Erro'
                          : 'API Não Configurada'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">{provider.description}</p>

                    <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-slate-400">Plano Gratuito: </span>
                        <span className="text-slate-200 font-semibold">{provider.freeTier}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Variável de Ambiente: </span>
                        <code className="text-emerald-400 font-mono font-bold">{provider.envVar}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Requisições Utilizadas: </span>
                        <span className="text-white font-bold tabular-nums">{provider.requestCount}</span>
                      </div>
                      {typeof provider.requestsRemaining === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Cota Restante no Mês: </span>
                          <span className="text-emerald-400 font-bold tabular-nums">{provider.requestsRemaining}</span>
                        </div>
                      )}
                      {provider.latencyMs && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tempo de Resposta: </span>
                          <span className={`font-bold tabular-nums ${
                            provider.latencyMs < 500 ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {provider.latencyMs} ms
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-400">Site Oficial: </span>
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 underline font-semibold inline-flex items-center gap-1"
                        >
                          {provider.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {provider.diagnostics && (
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                        <span className="font-bold text-slate-400 block mb-0.5">Diagnóstico:</span>
                        <span>{provider.diagnostics}</span>
                      </div>
                    )}

                    {hasTestResult && (
                      <div className={`p-2.5 rounded-lg text-xs flex items-start gap-1.5 ${
                        apiTestResult.success
                          ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                          : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                      }`}>
                        {apiTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{apiTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => handleTestApi(provider.id)}
                      disabled={isTesting}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Setup Guide for Environment Variables */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Como Obter e Configurar Chaves de APIs Gratuitas</span>
            </h4>
            <p className="text-xs text-slate-400">
              Todas as chaves devem ser armazenadas exclusivamente no backend (Secrets / Variáveis de Ambiente). Se nenhuma chave for informada, o sistema opera de forma autônoma e segura utilizando a base de dados interna sem gerar erros aos usuários.
            </p>

            <div className="overflow-x-auto pt-1">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Provedor</th>
                    <th className="py-2.5 px-3">Variável (.env)</th>
                    <th className="py-2.5 px-3">Plano Gratuito</th>
                    <th className="py-2.5 px-3">Onde Obter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">The Odds API</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">ODDS_API_KEY</td>
                    <td className="py-2.5 px-3 text-slate-400">500 req/mês (sem cartão)</td>
                    <td className="py-2.5 px-3">
                      <a href="https://the-odds-api.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
                        the-odds-api.com
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">Football-Data.org</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">FOOTBALL_API_KEY / FSAPI_KEY</td>
                    <td className="py-2.5 px-3 text-slate-400">10 chamadas/min (12 ligas)</td>
                    <td className="py-2.5 px-3">
                      <a href="https://football-data.org" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
                        football-data.org
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-white">API-Football</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">SPORTS_API_KEY</td>
                    <td className="py-2.5 px-3 text-slate-400">100 req/dia no plano Free</td>
                    <td className="py-2.5 px-3">
                      <a href="https://api-football.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline">
                        api-football.com
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync History Logs */}
          <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">Histórico de Sincronizações da API</h4>
              <span className="text-[11px] text-slate-400">Últimos eventos registrados</span>
            </div>
            <div className="divide-y divide-slate-800/80 text-xs">
              {syncLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-500">Nenhum log de sincronização registrado.</div>
              ) : (
                syncLogs.map(log => (
                  <div key={log.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{log.provider}</span>
                      <span className="text-slate-400 text-[11px]">{log.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 9: CONFIGURACOES GERAIS */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-2xl shadow-xl">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              <span>Configurações Gerais da Plataforma</span>
            </h3>
            <p className="text-xs text-slate-400">
              Personalize limites, comissões padrão e status operacional do sistema.
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Configurações atualizadas com sucesso!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Plataforma</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={e => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Comissão Padrão de Cambistas (%)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={settings.defaultCommissionRate}
                onChange={e => setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Aposta Mínima (R$)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={settings.minBet}
                onChange={e => setSettings({ ...settings, minBet: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Aposta Máxima (R$)</label>
              <input
                type="number"
                min="100"
                step="100"
                value={settings.maxBet}
                onChange={e => setSettings({ ...settings, maxBet: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Retorno Máximo por Bilhete (R$)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={settings.maxReturn}
                onChange={e => setSettings({ ...settings, maxReturn: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Status da Plataforma</label>
              <select
                value={settings.platformStatus}
                onChange={e => setSettings({ ...settings, platformStatus: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="active">Ativa (Recebendo Apostas)</option>
                <option value="maintenance">Manutenção (Apenas Visualização)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Aviso Regulatório / Termos de Responsabilidade</label>
            <textarea
              rows={3}
              value={settings.termsText}
              onChange={e => setSettings({ ...settings, termsText: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Configuração do Bônus de Boas-Vindas (Item 2) */}
          <div className="border-t border-slate-800 pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-400" />
                  <span>Bônus de Boas-Vindas para Novos Cadastros</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Defina o valor e as regras para concessão do bônus de cadastro.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={settings.welcomeBonusEnabled ?? true}
                  onChange={e =>
                    setSettings({ ...settings, welcomeBonusEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-2 text-xs font-bold text-slate-300">
                  {settings.welcomeBonusEnabled ? 'Ativado' : 'Desativado'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Valor do Bônus (R$) — Padrão: R$ 10,00
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.welcomeBonusAmount ?? 10}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      welcomeBonusAmount: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Requisitos e Regras do Bônus
                </label>
                <input
                  type="text"
                  value={settings.welcomeBonusRequirement ?? ''}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      welcomeBonusRequirement: e.target.value
                    })
                  }
                  placeholder="Ex: Exclusivo para maiores de 18 anos. 1 vez por usuário."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* TAB 10: LOGS DO SISTEMA */}
      {/* ---------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Trilha de Auditoria e Logs Administrativos</span>
            </h3>
            <span className="text-xs text-slate-400">{logs.length} eventos registrados</span>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs">
            {logs.map(log => (
              <div key={log.id} className="p-3.5 flex items-start justify-between gap-4 hover:bg-slate-900/40 transition-colors">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 font-mono text-[11px] bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      {log.action}
                    </span>
                    <span className="text-slate-400 text-[11px]">por {log.userName}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{log.details}</p>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: NOVO JOGO MANUAL */}
      {/* ---------------------------------------------------------------- */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Criar Partida Manualmente</h3>
            <form onSubmit={handleCreateManualMatch} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Campeonato</label>
                <input
                  type="text"
                  required
                  value={manualLeague}
                  onChange={e => setManualLeague(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Time Mandante</label>
                  <input
                    type="text"
                    required
                    value={manualHomeTeam}
                    onChange={e => setManualHomeTeam(e.target.value)}
                    placeholder="Ex: Flamengo"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Time Visitante</label>
                  <input
                    type="text"
                    required
                    value={manualAwayTeam}
                    onChange={e => setManualAwayTeam(e.target.value)}
                    placeholder="Ex: Vasco"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Data e Horário</label>
                <input
                  type="datetime-local"
                  value={manualStartTime}
                  onChange={e => setManualStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Odd Casa (1)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={manualOddsHome}
                    onChange={e => setManualOddsHome(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Odd Empate (X)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={manualOddsDraw}
                    onChange={e => setManualOddsDraw(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Odd Fora (2)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={manualOddsAway}
                    onChange={e => setManualOddsAway(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowMatchModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg"
                >
                  Salvar Jogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: ENCERRAR COM PLACAR */}
      {/* ---------------------------------------------------------------- */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-white">Finalizar Partida e Apurar Bilhetes</h3>
            <p className="text-xs text-slate-300">
              {editingMatch.homeTeam} x {editingMatch.awayTeam}
            </p>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs text-slate-400 mb-1 truncate">{editingMatch.homeTeam}</label>
                <input
                  type="number"
                  min="0"
                  value={finishHomeScore}
                  onChange={e => setFinishHomeScore(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-center text-lg font-bold text-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 truncate">{editingMatch.awayTeam}</label>
                <input
                  type="number"
                  min="0"
                  value={finishAwayScore}
                  onChange={e => setFinishAwayScore(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-lg text-center text-lg font-bold text-white tabular-nums"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMatch(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinishMatch}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
              >
                Salvar & Apurar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* MODAL: NOVO CAMBISTA */}
      {/* ---------------------------------------------------------------- */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white">Cadastrar Novo Cambista</h3>
            <form onSubmit={handleCreateAgent} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={newAgentName}
                  onChange={e => setNewAgentName(e.target.value)}
                  placeholder="Nome do Cambista"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Usuário de Login</label>
                  <input
                    type="text"
                    required
                    value={newAgentUsername}
                    onChange={e => setNewAgentUsername(e.target.value)}
                    placeholder="usuario"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Senha</label>
                  <input
                    type="password"
                    required
                    value={newAgentPassword}
                    onChange={e => setNewAgentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={newAgentPhone}
                    onChange={e => setNewAgentPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Comissão (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newAgentCommission}
                    onChange={e => setNewAgentCommission(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Código Identificador Exclusivo (Opcional)</label>
                <input
                  type="text"
                  value={newAgentCode}
                  onChange={e => setNewAgentCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CARLOS10 (deixe em branco para auto)"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-400 font-mono font-bold uppercase"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAgentModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Criar Cambista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
