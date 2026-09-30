import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBetSlip } from '../context/BetSlipContext';
import {
  Trophy,
  Wallet,
  Receipt,
  Search,
  UserCheck,
  ShieldCheck,
  LogOut,
  LogIn,
  Menu,
  X,
  PlusCircle,
  Share2
} from 'lucide-react';

interface HeaderProps {
  currentView: 'sportsbook' | 'my-tickets' | 'wallet' | 'cambista' | 'admin' | 'lookup';
  onNavigate: (view: 'sportsbook' | 'my-tickets' | 'wallet' | 'cambista' | 'admin' | 'lookup') => void;
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
  onOpenLookup: () => void;
  onOpenDeposit: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenLookup,
  onOpenDeposit
}) => {
  const { user, logout, referralCode } = useAuth();
  const { items, setIsSlipOpenMobile } = useBetSlip();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/95 backdrop-blur border-b border-slate-800">
      {/* Top micro banner if referred by Cambista */}
      {referralCode && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/40 px-4 py-1 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              Acessando via link do Cambista oficial: <strong className="font-semibold text-emerald-200">{referralCode}</strong>
            </span>
          </div>
          <span className="text-[11px] text-emerald-400/80 hidden sm:inline">Comissão e suporte garantidos</span>
        </div>
      )}

      {/* Main Top Bar (One-row, 3-zone contract) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element Brand wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('sportsbook')}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-5 h-5 text-slate-950" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                DUMA<span className="text-emerald-400">BETS</span>
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <button
            onClick={() => onNavigate('sportsbook')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentView === 'sportsbook'
                ? 'bg-slate-800/80 text-emerald-400 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            Jogos & Apostas
          </button>

          {user && (
            <button
              onClick={() => onNavigate('my-tickets')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                currentView === 'my-tickets'
                  ? 'bg-slate-800/80 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              Meus Bilhetes
            </button>
          )}

          {user && (
            <button
              onClick={() => onNavigate('wallet')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                currentView === 'wallet'
                  ? 'bg-slate-800/80 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Carteira PIX</span>
            </button>
          )}

          <button
            onClick={onOpenLookup}
            className="px-3 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/40 transition-colors flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Consultar Bilhete</span>
          </button>

          {/* Cambista Area link */}
          {user?.role === 'agent' && (
            <button
              onClick={() => onNavigate('cambista')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                currentView === 'cambista'
                  ? 'bg-emerald-600 text-slate-950 font-bold'
                  : 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Área do Cambista</span>
            </button>
          )}

          {/* Admin link */}
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                currentView === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-amber-950/50 border border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Painel Admin</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Actions & User Info */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Balance Card */}
              <div className="bg-slate-900/90 border border-slate-700/70 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Saldo</span>
                  <span className="text-sm font-bold text-emerald-400 tabular-nums">
                    R$ {user.balance.toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={onOpenDeposit}
                  title="Fazer Depósito via PIX"
                  className="p-1 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              {/* User Dropdown / Profile Button */}
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-800 pl-3">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight truncate max-w-[110px]">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 capitalize">
                    {user.role === 'admin' ? 'Administrador' : user.role === 'agent' ? 'Cambista' : 'Jogador'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Sair da conta"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-400" />
                <span>Entrar</span>
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02]"
              >
                Criar Conta
              </button>
            </div>
          )}

          {/* Mobile Bet Slip Trigger */}
          <button
            onClick={() => setIsSlipOpenMobile(true)}
            className="md:hidden relative p-2 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900"
          >
            <Receipt className="w-5 h-5" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {items.length}
              </span>
            )}
          </button>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-2">
          <button
            onClick={() => { onNavigate('sportsbook'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            Jogos & Apostas
          </button>

          {user && (
            <button
              onClick={() => { onNavigate('my-tickets'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-900"
            >
              Meus Bilhetes
            </button>
          )}

          {user && (
            <button
              onClick={() => { onNavigate('wallet'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-900 flex items-center justify-between"
            >
              <span>Carteira & PIX</span>
              <span className="text-emerald-400 font-bold tabular-nums">R$ {user.balance.toFixed(2)}</span>
            </button>
          )}

          <button
            onClick={() => { onOpenLookup(); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:bg-slate-900"
          >
            Consultar Bilhete
          </button>

          {user?.role === 'agent' && (
            <button
              onClick={() => { onNavigate('cambista'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40"
            >
              Área do Cambista
            </button>
          )}

          {user?.role === 'admin' && (
            <button
              onClick={() => { onNavigate('admin'); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-md text-sm font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40"
            >
              Painel Administrativo
            </button>
          )}

          {user && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">{user.email}</span>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Sair da Conta
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
