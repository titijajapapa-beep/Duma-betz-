/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { BetSlipProvider, useBetSlip } from './context/BetSlipContext';
import { Header } from './components/Header';
import { Sportsbook } from './components/Sportsbook';
import { BetSlip } from './components/BetSlip';
import { MyTicketsView } from './components/MyTicketsView';
import { WalletView } from './components/WalletView';
import { CambistaDashboard } from './components/CambistaDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { TicketModal } from './components/TicketModal';
import { TicketLookupModal } from './components/TicketLookupModal';
import { Ticket } from './types/index';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = useState<
    'sportsbook' | 'my-tickets' | 'wallet' | 'cambista' | 'admin' | 'lookup'
  >('sportsbook');

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [lookupModalOpen, setLookupModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const { lastPlacedTicket, setLastPlacedTicket } = useBetSlip();

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setActiveTicket(ticket);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Responsive Header */}
      <Header
        currentView={currentView}
        onNavigate={view => setCurrentView(view)}
        onOpenAuth={handleOpenAuth}
        onOpenLookup={() => setLookupModalOpen(true)}
        onOpenDeposit={() => setCurrentView('wallet')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {currentView === 'sportsbook' && (
          <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="flex-1 w-full min-w-0">
              <Sportsbook
                onOpenDeposit={() => setCurrentView('wallet')}
                onOpenRegister={() => handleOpenAuth('register')}
              />
            </div>
            {/* Desktop persistent Betting Coupon / Slip */}
            <BetSlip
              onOpenAuth={() => handleOpenAuth('login')}
              onOpenDeposit={() => setCurrentView('wallet')}
            />
          </div>
        )}

        {currentView === 'my-tickets' && (
          <MyTicketsView
            onViewTicket={handleViewTicket}
            onGoToSportsbook={() => setCurrentView('sportsbook')}
          />
        )}

        {currentView === 'wallet' && <WalletView />}

        {currentView === 'cambista' && (
          <CambistaDashboard onViewTicket={handleViewTicket} />
        )}

        {currentView === 'admin' && (
          <AdminDashboard onViewTicket={handleViewTicket} />
        )}
      </main>

      {/* Footer & Compliance */}
      <footer className="bg-[#0b0f19] border-t border-slate-800/80 py-8 px-4 text-xs text-slate-400 no-print mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <span className="text-sm font-black text-white tracking-wider flex items-center justify-center md:justify-start gap-1">
              DUMA<span className="text-emerald-400">BETS</span>
            </span>
            <p className="text-[11px] text-slate-500 max-w-md">
              Plataforma profissional de gestão esportiva e entretenimento de palpites. Sistema compatível com a legislação brasileira de apostas de quota fixa.
            </p>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-1 text-amber-400/90 font-semibold bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800/40">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Proibido para menores de 18 anos</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-400/90 font-semibold bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Jogo Responsável</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
      />

      {/* Ticket Printable Thermal Modal for newly placed ticket */}
      {lastPlacedTicket && (
        <TicketModal
          ticket={lastPlacedTicket}
          onClose={() => setLastPlacedTicket(null)}
        />
      )}

      {/* Ticket Modal for browsing any ticket */}
      {activeTicket && (
        <TicketModal
          ticket={activeTicket}
          onClose={() => setActiveTicket(null)}
        />
      )}

      {/* Ticket Lookup Modal by short code */}
      <TicketLookupModal
        isOpen={lookupModalOpen}
        onClose={() => setLookupModalOpen(false)}
        onViewFullTicket={handleViewTicket}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BetSlipProvider>
        <AppContent />
      </BetSlipProvider>
    </AuthProvider>
  );
}
