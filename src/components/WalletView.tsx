import React, { useState, useEffect } from 'react';
import { Transaction } from '../types/index';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface WalletViewProps {
  initialTab?: 'deposit' | 'withdraw' | 'history';
}

export const WalletView: React.FC<WalletViewProps> = ({ initialTab = 'deposit' }) => {
  const { user, token, updateBalance } = useAuth();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>(initialTab);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [depositLoading, setDepositLoading] = useState(false);
  const [activeDepositData, setActiveDepositData] = useState<{
    transaction: Transaction;
    pixCopyPaste: string;
    qrCodeImage: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState<number>(50);
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'phone' | 'email' | 'random'>('cpf');
  const [pixKey, setPixKey] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // History state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchWalletData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        if (typeof data.balance === 'number') {
          updateBalance(data.balance);
        }
      }
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [token]);

  const handleGeneratePixDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || depositAmount < 5) return;

    setDepositLoading(true);
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: depositAmount })
      });
      const data = await res.json();
      setDepositLoading(false);
      if (res.ok) {
        setActiveDepositData(data);
        fetchWalletData();
      }
    } catch (err) {
      setDepositLoading(false);
      console.error('Error generating PIX deposit:', err);
    }
  };

  const handleCopyPix = () => {
    if (activeDepositData?.pixCopyPaste) {
      navigator.clipboard.writeText(activeDepositData.pixCopyPaste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  const handleSimulatePaymentApproval = async () => {
    if (!token || !activeDepositData?.transaction.id) return;
    setSimulatingPayment(true);
    try {
      const res = await fetch('/api/wallet/deposit/confirm-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId: activeDepositData.transaction.id })
      });
      const data = await res.json();
      setSimulatingPayment(false);
      if (res.ok) {
        updateBalance(data.newBalance);
        setActiveDepositData(null);
        fetchWalletData();
        setTab('history');
      }
    } catch (err) {
      setSimulatingPayment(false);
      console.error('Error simulating approval:', err);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setWithdrawError(null);
    setWithdrawSuccess(null);
    setWithdrawLoading(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: withdrawAmount, pixKey })
      });
      const data = await res.json();
      setWithdrawLoading(false);
      if (res.ok) {
        updateBalance(data.newBalance);
        setWithdrawSuccess(`Saque de R$ ${withdrawAmount.toFixed(2)} solicitado com sucesso!`);
        setPixKey('');
        fetchWalletData();
      } else {
        setWithdrawError(data.error || 'Erro ao solicitar saque.');
      }
    } catch (err: any) {
      setWithdrawLoading(false);
      setWithdrawError(err.message || 'Erro de conexão.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Balance Card Header */}
      <div className="bg-gradient-to-r from-[#0d1424] via-[#111c33] to-[#0d1424] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Saldo Disponível
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
              R$ {user?.balance.toFixed(2) || '0.00'}
            </span>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
              Instantâneo PIX
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Deposite via PIX e seu saldo é liberado em segundos para apostar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTab('deposit'); setActiveDepositData(null); }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              tab === 'deposit'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Depositar PIX</span>
          </button>

          <button
            onClick={() => setTab('withdraw')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              tab === 'withdraw'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Sacar Saldo</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-[#0d1424] p-1.5 rounded-xl">
        <button
          onClick={() => setTab('deposit')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            tab === 'deposit' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          <span>Depósito Instantâneo</span>
        </button>

        <button
          onClick={() => setTab('withdraw')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            tab === 'withdraw' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpCircle className="w-4 h-4" />
          <span>Solicitar Saque</span>
        </button>

        <button
          onClick={() => setTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            tab === 'history' ? 'bg-slate-900 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Extrato Financeiro</span>
        </button>
      </div>

      {/* Tab 1: Deposit */}
      {tab === 'deposit' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
          {!activeDepositData ? (
            <form onSubmit={handleGeneratePixDeposit} className="space-y-6 max-w-md mx-auto">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Quanto deseja depositar?</h3>
                <p className="text-xs text-slate-400">
                  Valores a partir de R$ 5,00. Compensação rápida via PIX Banco Central.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Valor em Reais (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-sm font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    required
                    value={depositAmount}
                    onChange={e => setDepositAmount(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100, 200].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDepositAmount(val)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      depositAmount === val
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    R$ {val}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={depositLoading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {depositLoading ? 'Gerando PIX...' : 'Gerar Código PIX'}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Ambiente Seguro com Criptografia de Ponta</span>
              </div>
            </form>
          ) : (
            <div className="max-w-md mx-auto space-y-6 text-center animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                  PIX Gerado com Sucesso
                </span>
                <h3 className="text-2xl font-black text-white tabular-nums">
                  R$ {activeDepositData.transaction.amount.toFixed(2)}
                </h3>
                <p className="text-xs text-slate-400">
                  Escaneie o QR Code abaixo no app do seu banco ou use a chave Copia e Cola.
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-lg border border-slate-300">
                {activeDepositData.qrCodeImage ? (
                  <img
                    src={activeDepositData.qrCodeImage}
                    alt="PIX QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                    <QrCode className="w-16 h-16" />
                  </div>
                )}
              </div>

              {/* Copy Paste Code */}
              <div className="space-y-2 text-left">
                <label className="text-xs font-semibold text-slate-300 block">
                  Código PIX (Copia e Cola)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeDepositData.pixCopyPaste}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300 font-mono truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1 transition-colors"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Simulation Testing Tool */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400 block font-medium">
                  🧪 Modo de Avaliação AI Studio (Sandbox):
                </span>
                <button
                  type="button"
                  onClick={handleSimulatePaymentApproval}
                  disabled={simulatingPayment}
                  className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs rounded-lg transition-colors"
                >
                  {simulatingPayment ? 'Processando...' : '✓ Simular Confirmação Imediata do PIX'}
                </button>
              </div>

              <div>
                <button
                  onClick={() => setActiveDepositData(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Gerar outro valor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Withdraw */}
      {tab === 'withdraw' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 max-w-md mx-auto">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Solicitar Saque PIX</h3>
            <p className="text-xs text-slate-400">
              Receba seus ganhos diretamente na sua conta bancária.
            </p>
          </div>

          {withdrawSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{withdrawSuccess}</span>
            </div>
          )}

          {withdrawError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{withdrawError}</span>
            </div>
          )}

          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Valor do Saque (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  min="20"
                  step="5"
                  required
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(Number(e.target.value))}
                  className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Valor mínimo para saque: R$ 20,00 · Saldo disponível: R$ {user?.balance.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tipo de Chave PIX
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['cpf', 'phone', 'email', 'random'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPixKeyType(type)}
                    className={`py-1.5 text-xs font-semibold rounded border uppercase transition-colors ${
                      pixKeyType === type
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {type === 'phone' ? 'Tel' : type === 'random' ? 'Aleatória' : type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Chave PIX
              </label>
              <input
                type="text"
                required
                value={pixKey}
                onChange={e => setPixKey(e.target.value)}
                placeholder={
                  pixKeyType === 'cpf'
                    ? '000.000.000-00'
                    : pixKeyType === 'email'
                    ? 'seu@email.com'
                    : pixKeyType === 'phone'
                    ? '(11) 99999-9999'
                    : 'Chave aleatória UUID'
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={withdrawLoading || (user?.balance || 0) < withdrawAmount}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {withdrawLoading ? 'Solicitando...' : 'Confirmar Solicitação de Saque'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: History */}
      {tab === 'history' && (
        <div className="bg-[#0d1424] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Extrato de Movimentações</h3>
            <span className="text-xs text-slate-400">{transactions.length} registros</span>
          </div>

          {historyLoading ? (
            <div className="p-8 text-center text-slate-400">Carregando extrato...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhuma transação financeira registrada até o momento.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {transactions.map(tx => {
                const isPositive = tx.amount > 0;
                const dateStr = new Date(tx.createdAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {isPositive ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{tx.description}</span>
                        <span className="text-[11px] text-slate-400">{dateStr}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-black tabular-nums block ${
                        isPositive ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {isPositive ? '+' : ''}R$ {Math.abs(tx.amount).toFixed(2)}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">
                        {tx.status === 'completed' ? 'Confirmado' : tx.status === 'pending' ? 'Pendente' : 'Rejeitado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
