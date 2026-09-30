import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket } from '../types/index';
import {
  Share2,
  Copy,
  Check,
  QrCode,
  Users,
  Receipt,
  TrendingUp,
  Percent,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import QRCode from 'qrcode';

interface CambistaDashboardProps {
  onViewTicket: (ticket: Ticket) => void;
}

export const CambistaDashboard: React.FC<CambistaDashboardProps> = ({ onViewTicket }) => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'tickets' | 'clients'>('tickets');

  const agentCode = user?.agentCode || 'CAMBISTA';
  const referralLink = `${window.location.origin}/?ref=${agentCode}`;

  const fetchAgentData = async () => {
    if (!token) return;
    try {
      const [statsRes, ticketsRes] = await Promise.all([
        fetch('/api/agent/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/agent/tickets', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData.tickets || []);
      }
    } catch (err) {
      console.error('Error fetching cambista data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [token]);

  useEffect(() => {
    if (referralLink) {
      QRCode.toDataURL(referralLink, { width: 260, margin: 2 }).then(url => {
        setQrCodeDataUrl(url);
      }).catch(err => console.error(err));
    }
  }, [referralLink]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `🔥 *APOSTE NA DUMA BETS COM O MEU LINK EXCLUSIVO!*\nFaça seu cadastro, ganhe bônus de boas-vindas e aposte com as melhores cotações:\n${referralLink}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Carregando painel do cambista...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Exclusive Referral Link Hero Card */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-[#0d1424] to-[#0d1424] border border-emerald-800/50 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Área Exclusiva do Cambista Oficial
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded border border-emerald-500/30">
                {agentCode}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Olá, {user?.name || 'Cambista'}!
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Divulgue seu link exclusivo. Todos os clientes que se cadastrarem ou apostarem através dele renderão sua comissão de <strong>{stats?.commissionRate || 10}%</strong> automaticamente!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>COMPARTILHAR NO WHATSAPP</span>
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors"
              title="Ver QR Code do seu link"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Link Bar */}
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold sm:pl-2 shrink-0">Seu Link:</span>
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 w-full bg-transparent text-xs text-emerald-300 font-mono focus:outline-none truncate"
          />
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Copiado!' : 'COPIAR MEU LINK'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Turnover */}
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Movimentado</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
            R$ {(stats?.totalTurnover || 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            {stats?.totalTickets || 0} bilhetes apostados
          </span>
        </div>

        {/* Commission Acumulada */}
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Comissão Total</span>
            <Percent className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 tabular-nums">
            R$ {(stats?.totalCommissions || 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Taxa de {stats?.commissionRate || 10}% sobre volume
          </span>
        </div>

        {/* Pending vs Paid Commissions */}
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Comissão Pendente</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums">
            R$ {(stats?.pendingCommissions || 0).toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Pago: R$ {(stats?.paidCommissions || 0).toFixed(2)}
          </span>
        </div>

        {/* Clients Count */}
        <div className="bg-[#0d1424] border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Clientes Cadastrados</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white tabular-nums">
            {stats?.totalClients || 0}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Usuários ativos vinculados
          </span>
        </div>
      </div>

      {/* Tabs: Seus Bilhetes & Seus Clientes */}
      <div className="bg-[#0d1424] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'tickets'
                ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Bilhetes dos Clientes ({tickets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'clients'
                ? 'bg-slate-900 text-emerald-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Seus Clientes ({stats?.clients?.length || 0})</span>
          </button>
        </div>

        {activeTab === 'tickets' ? (
          tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Nenhum bilhete registrado pelos seus clientes ainda. Compartilhe seu link para começar a receber apostas!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4 text-right">Valor Apostado</th>
                    <th className="py-3 px-4 text-right">Cotação</th>
                    <th className="py-3 px-4 text-right">Possível Retorno</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{ticket.code}</td>
                      <td className="py-3 px-4">{ticket.userName}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">
                        R$ {ticket.stake.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400 tabular-nums">
                        @{ticket.totalOdds.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-200 tabular-nums">
                        R$ {ticket.potentialReturn.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ticket.status === 'won' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
                            Ganhou
                          </span>
                        )}
                        {ticket.status === 'lost' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800/60 uppercase">
                            Perdeu
                          </span>
                        )}
                        {ticket.status === 'pending' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800/60 uppercase">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onViewTicket(ticket)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold rounded transition-colors"
                        >
                          Ver Bilhete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome do Cliente</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Data de Cadastro</th>
                  <th className="py-3 px-4">Último Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {stats?.clients?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-4 text-slate-400">{c.username}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleString('pt-BR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="text-base font-bold text-white">QR Code do Seu Link</h3>
            <p className="text-xs text-slate-400">
              Apresente na tela do celular para seus clientes escanearem e abrirem seu link diretamente.
            </p>
            <div className="p-4 bg-white rounded-xl inline-block border border-slate-300">
              <img src={qrCodeDataUrl} alt="QR Code Cambista" className="w-48 h-48 mx-auto" />
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold truncate">
              {referralLink}
            </div>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
