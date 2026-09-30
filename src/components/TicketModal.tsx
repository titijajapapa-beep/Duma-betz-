import React, { useState } from 'react';
import { Ticket } from '../types/index';
import { X, Printer, Share2, Copy, Check, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';

interface TicketModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!ticket) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(ticket.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `⚽ *BILHETE DUMA BETS*\nCódigo: *${ticket.code}*\nJogos: ${ticket.items.length}\nCotação Total: *${ticket.totalOdds}*\nValor: *R$ ${ticket.stake.toFixed(2)}*\nPossível Retorno: *R$ ${ticket.potentialReturn.toFixed(2)}*\nStatus: ${ticket.status.toUpperCase()}\n\nConsulte em: ${window.location.origin}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusBadge = (status: Ticket['status']) => {
    switch (status) {
      case 'won':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-wide border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Premiado (Ganhou)
          </span>
        );
      case 'lost':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 font-bold text-xs uppercase tracking-wide border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Não Premiado (Perdeu)
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-500/20 text-slate-300 font-bold text-xs uppercase tracking-wide border border-slate-500/30">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold text-xs uppercase tracking-wide border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/80 no-print">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Comprovante de Aposta</span>
            <span className="text-xs text-slate-400">· {ticket.code}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Printable Ticket Area */}
        <div className="overflow-y-auto p-5 space-y-4">
          <div className="printable-ticket bg-white text-slate-900 p-5 rounded-xl border border-slate-200 shadow-md font-mono text-xs">
            {/* Ticket Header */}
            <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
              <h2 className="text-base font-black tracking-wider text-slate-950">DUMA BETS</h2>
              <p className="text-[10px] text-slate-600 uppercase">Gestão e Entretenimento Esportivo</p>
              <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded border border-slate-300">
                <span className="text-xs font-black tracking-widest text-slate-900">
                  BILHETE: {ticket.code}
                </span>
              </div>
            </div>

            {/* Meta details */}
            <div className="space-y-1 text-[11px] text-slate-700 border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="flex justify-between">
                <span>Data/Hora:</span>
                <span className="font-semibold text-slate-900">
                  {new Date(ticket.createdAt).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-semibold text-slate-900">{ticket.userName}</span>
              </div>
              {ticket.agentCode && (
                <div className="flex justify-between">
                  <span>Cambista:</span>
                  <span className="font-semibold text-slate-900">{ticket.agentCode}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1">
                <span>Situação:</span>
                <span className="font-bold uppercase text-slate-900">{ticket.status}</span>
              </div>
            </div>

            {/* Bet Items */}
            <div className="space-y-3 border-b border-dashed border-slate-300 pb-3 mb-3">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Jogos Selecionados ({ticket.items.length})
              </div>
              {ticket.items.map((item, idx) => (
                <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-0.5">
                  <div className="font-bold text-slate-950 flex items-center justify-between">
                    <span>{item.matchTitle}</span>
                    <span className="text-emerald-700 font-bold tabular-nums">@{item.odd.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-600">{item.league}</div>
                  <div className="text-[11px] text-slate-800 flex justify-between pt-0.5 border-t border-slate-200">
                    <span className="text-slate-600">{item.marketName}:</span>
                    <span className="font-bold text-slate-900">{item.selectionLabel}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="space-y-1.5 text-xs text-slate-800 pt-1">
              <div className="flex justify-between">
                <span>Valor Apostado:</span>
                <span className="font-bold text-slate-950 tabular-nums">R$ {ticket.stake.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cotação Total:</span>
                <span className="font-bold text-slate-950 tabular-nums">{ticket.totalOdds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-300">
                <span>Possível Retorno:</span>
                <span className="text-emerald-700 tabular-nums">R$ {ticket.potentialReturn.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer barcode visual simulation */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300 text-center">
              <div className="tracking-[6px] text-base font-black text-slate-800">
                ||| | |||| | ||| |||| | |||
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                Valide este comprovante pelo código no site dumabets.com
              </p>
            </div>
          </div>

          {/* Current Status on screen */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 no-print">
            <span className="text-xs text-slate-400">Status em Tempo Real:</span>
            {getStatusBadge(ticket.status)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2 no-print">
          <button
            onClick={handleCopyCode}
            className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
          </button>

          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            title="Imprimir comprovante"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
