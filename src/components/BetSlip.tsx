import React from 'react';
import { useBetSlip } from '../context/BetSlipContext';
import { useAuth } from '../context/AuthContext';
import { Receipt, Trash2, X, AlertCircle, ArrowRight } from 'lucide-react';

interface BetSlipProps {
  onOpenAuth: () => void;
  onOpenDeposit: () => void;
}

export const BetSlip: React.FC<BetSlipProps> = ({ onOpenAuth, onOpenDeposit }) => {
  const {
    items,
    stake,
    setStake,
    removeSelection,
    clearSlip,
    totalOdds,
    potentialReturn,
    isSlipOpenMobile,
    setIsSlipOpenMobile,
    placeBet,
    isPlacing
  } = useBetSlip();

  const { user } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handlePlaceBet = async () => {
    setErrorMsg(null);
    if (!user) {
      onOpenAuth();
      return;
    }

    if (user.balance < stake) {
      setErrorMsg('Saldo insuficiente. Faça um depósito via PIX.');
      return;
    }

    const res = await placeBet();
    if (!res.success) {
      setErrorMsg(res.error || 'Erro ao registrar aposta.');
    }
  };

  const quickAmounts = [5, 10, 20, 50, 100];

  const slipContent = (
    <div className="flex flex-col h-full bg-[#0d1424] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">Cupom de Apostas</span>
            <span className="text-[11px] text-slate-400">
              {items.length === 0 ? 'Vazio' : `${items.length} ${items.length === 1 ? 'seleção' : 'seleções'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              onClick={clearSlip}
              title="Limpar cupom"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          {isSlipOpenMobile && (
            <button
              onClick={() => setIsSlipOpenMobile(false)}
              className="p-1.5 text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body: Selections List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <Receipt className="w-10 h-10 text-slate-600 mb-2 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-300">Nenhuma aposta selecionada</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
              Clique nas cotações de qualquer partida para montar seu bilhete simples ou múltiplo.
            </p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.matchId}-${item.marketId}-${item.selectionId}-${idx}`}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 relative group transition-all"
            >
              <button
                onClick={() => removeSelection(item.matchId, item.marketId, item.selectionId)}
                className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 transition-colors"
                title="Remover"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="pr-4">
                <span className="text-[10px] text-slate-400 block truncate">{item.league}</span>
                <span className="text-xs font-bold text-white block truncate">{item.matchTitle}</span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block">{item.marketName}</span>
                  <span className="text-xs font-bold text-emerald-400">{item.selectionLabel}</span>
                </div>
                <div className="bg-emerald-950/80 border border-emerald-700/50 rounded px-2 py-0.5 text-xs font-black text-emerald-300 tabular-nums">
                  @{item.odd.toFixed(2)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: Calculation & Action */}
      {items.length > 0 && (
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <div className="flex-1">
                <span>{errorMsg}</span>
                {errorMsg.includes('depósito') && (
                  <button
                    onClick={onOpenDeposit}
                    className="ml-2 underline font-bold text-rose-200"
                  >
                    Depositar agora
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Stake Buttons */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>Valor da aposta:</span>
              {user && (
                <span className="text-slate-300">
                  Saldo: <strong className="text-emerald-400 font-bold tabular-nums">R$ {user.balance.toFixed(2)}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
              <input
                type="number"
                min="2"
                step="1"
                value={stake || ''}
                onChange={e => setStake(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white font-bold tabular-nums placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-1.5 mt-2">
              {quickAmounts.map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStake(val)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded border transition-colors ${
                    stake === val
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Odds & Return calculation */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Cotação Total:</span>
              <span className="font-bold text-white tabular-nums">@{totalOdds}</span>
            </div>
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-slate-200">Possível Retorno:</span>
              <span className="text-base font-black text-emerald-400 tabular-nums">
                R$ {potentialReturn.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handlePlaceBet}
            disabled={isPlacing || items.length === 0}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPlacing ? (
              <span>Registrando Bilhete...</span>
            ) : !user ? (
              <>
                <span>Entrar para Apostar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>FINALIZAR APOSTA</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)]">
        {slipContent}
      </aside>

      {/* Mobile Drawer */}
      {isSlipOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-2 animate-in slide-in-from-bottom duration-200">
          <div className="h-[85vh] w-full max-w-lg mx-auto">
            {slipContent}
          </div>
        </div>
      )}
    </>
  );
};
