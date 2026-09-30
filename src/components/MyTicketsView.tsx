import React, { useState, useEffect } from 'react';
import { Ticket } from '../types/index';
import { useAuth } from '../context/AuthContext';
import { Receipt, CheckCircle2, Clock, XCircle, AlertCircle, ArrowUpRight, Search } from 'lucide-react';

interface MyTicketsViewProps {
  onViewTicket: (ticket: Ticket) => void;
  onGoToSportsbook: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ onViewTicket, onGoToSportsbook }) => {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchTickets = async () => {
      try {
        const res = await fetch('/api/bets/my-tickets', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
        }
      } catch (err) {
        console.error('Error fetching my tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [token]);

  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d1424] p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Meus Bilhetes de Aposta</span>
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhe o status e a apuração em tempo real dos seus palpites.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({tickets.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setStatusFilter('won')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'won'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ganhos
          </button>
          <button
            onClick={() => setStatusFilter('lost')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'lost'
                ? 'bg-rose-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Perdidos
          </button>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Carregando bilhetes...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Receipt className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />
          <h3 className="text-base font-bold text-white">Nenhum bilhete encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {statusFilter === 'all'
              ? 'Você ainda não registrou nenhum bilhete. Escolha seus palpites nos jogos disponíveis.'
              : `Nenhum bilhete com status "${statusFilter}".`}
          </p>
          <button
            onClick={onGoToSportsbook}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
          >
            Apostar Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTickets.map(ticket => {
            const dateStr = new Date(ticket.createdAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={ticket.id}
                onClick={() => onViewTicket(ticket)}
                className="bg-[#0d1424] border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 cursor-pointer group transition-all space-y-3 shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                      {ticket.code}
                    </span>
                    <span className="text-[11px] text-slate-400">· {dateStr}</span>
                  </div>

                  <div>
                    {ticket.status === 'won' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ganhou
                      </span>
                    )}
                    {ticket.status === 'lost' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                        <XCircle className="w-3.5 h-3.5" /> Perdeu
                      </span>
                    )}
                    {ticket.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                        <Clock className="w-3.5 h-3.5" /> Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-1">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-300">
                      <span className="truncate max-w-[220px]">
                        {item.matchTitle} ({item.selectionLabel})
                      </span>
                      <span className="font-bold text-emerald-400 tabular-nums">@{item.odd.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Apostado:</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      R$ {ticket.stake.toFixed(2)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Cotação:</span>
                    <span className="font-bold text-slate-200 tabular-nums">
                      @{ticket.totalOdds.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Retorno:</span>
                    <span className="font-black text-emerald-400 tabular-nums text-sm">
                      R$ {ticket.potentialReturn.toFixed(2)}
                    </span>
                  </div>

                  <div className="text-slate-500 group-hover:text-emerald-400 transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
