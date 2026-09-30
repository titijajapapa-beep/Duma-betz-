import React, { useState } from 'react';
import { Ticket } from '../types/index';
import { X, Search, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface TicketLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewFullTicket: (ticket: Ticket) => void;
}

export const TicketLookupModal: React.FC<TicketLookupModalProps> = ({ isOpen, onClose, onViewFullTicket }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundTicket, setFoundTicket] = useState<Ticket | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setError(null);
    setFoundTicket(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/bets/verify/${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setFoundTicket(data.ticket);
      } else {
        setError(data.error || 'Bilhete não encontrado.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erro ao consultar bilhete.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <span className="text-base font-bold text-white">Consultar Bilhete</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Código do Bilhete
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: DM-71932"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-emerald-400 font-bold uppercase tracking-wider placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Consultar'}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {foundTicket && (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs text-slate-400 block">Bilhete</span>
                  <span className="text-sm font-black text-white">{foundTicket.code}</span>
                </div>
                <div>
                  {foundTicket.status === 'won' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Premiado
                    </span>
                  )}
                  {foundTicket.status === 'lost' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                      <XCircle className="w-3.5 h-3.5" /> Não Premiado
                    </span>
                  )}
                  {foundTicket.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      <Clock className="w-3.5 h-3.5" /> Pendente
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Cliente</span>
                  <span className="font-semibold text-slate-200">{foundTicket.userName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Cotação</span>
                  <span className="font-semibold text-emerald-400 tabular-nums">@{foundTicket.totalOdds}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Valor Apostado</span>
                  <span className="font-semibold text-slate-200 tabular-nums">R$ {foundTicket.stake.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Possível Retorno</span>
                  <span className="font-bold text-emerald-400 tabular-nums">R$ {foundTicket.potentialReturn.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onViewFullTicket(foundTicket);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition-colors"
                >
                  Abrir Comprovante Completo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
