import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon, Phone, AlertCircle, CheckCircle2, Shield, UserCheck, Play } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [tab, setTab] = useState<'login' | 'register' | 'recover'>(initialTab);
  const { login, register, referralCode } = useAuth();

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [customRefCode, setCustomRefCode] = useState(referralCode || '');

  // Recover form
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverMessage, setRecoverMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await login(loginIdentifier, loginPassword);
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Erro no login');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await register({
      name: regName,
      username: regUsername,
      email: regEmail,
      password: regPassword,
      phone: regPhone,
      referralCode: customRefCode
    });
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Erro no cadastro');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmail })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setRecoverMessage(data.message);
      } else {
        setError(data.error || 'Falha ao recuperar');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Erro de conexão');
    }
  };

  const quickDemoLogin = (ident: string, pass: string) => {
    setLoginIdentifier(ident);
    setLoginPassword(pass);
    login(ident, pass).then(res => {
      if (res.success) onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-white">
              DUMA<span className="text-emerald-400">BETS</span>
            </span>
            <span className="text-xs text-slate-400">· Acesso à Conta</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === 'login' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === 'register' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Criar Conta
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Usuário ou E-mail</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    placeholder="Seu usuário ou e-mail"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Senha</label>
                  <button
                    type="button"
                    onClick={() => setTab('recover')}
                    className="text-[11px] text-emerald-400 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar na Plataforma'}
              </button>

              {/* Quick Demo Logins for Easy AI Studio Verification */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <span className="block text-[11px] text-slate-400 font-medium mb-2 text-center uppercase tracking-wider">
                  Acesso Rápido de Testes (Perfis)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => quickDemoLogin('admin', 'admin123')}
                    className="p-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Shield className="w-3 h-3" />
                      <span>Admin</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">admin / admin123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => quickDemoLogin('cambista', 'cambista123')}
                    className="p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <UserCheck className="w-3 h-3" />
                      <span>Cambista</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">cambista123</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => quickDemoLogin('jogador', 'jogador123')}
                    className="p-2 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/40 text-left transition-colors"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-blue-400">
                      <Play className="w-3 h-3" />
                      <span>Jogador</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">jogador123</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nome de Usuário</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    placeholder="usuario123"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Senha</label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Código do Cambista (Opcional)
                </label>
                <input
                  type="text"
                  value={customRefCode}
                  onChange={e => setCustomRefCode(e.target.value.toUpperCase())}
                  placeholder="Ex: CARLOS10"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-emerald-400 font-bold uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {customRefCode && (
                  <span className="text-[11px] text-emerald-400 mt-1 block">
                    ✓ Vinculado ao Cambista: {customRefCode}
                  </span>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cadastrando...' : 'Criar Conta e Ganhar Bônus'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Ao cadastrar, você concorda com nossos termos e confirma ter mais de 18 anos.
              </p>
            </form>
          )}

          {tab === 'recover' && (
            <form onSubmit={handleRecover} className="space-y-4">
              <p className="text-xs text-slate-300">
                Digite o e-mail associado à sua conta para receber as instruções de recuperação de senha.
              </p>

              {recoverMessage && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{recoverMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">E-mail Cadastrado</label>
                <input
                  type="email"
                  required
                  value={recoverEmail}
                  onChange={e => setRecoverEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Recuperar Senha'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setTab('login')}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ← Voltar para o Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
