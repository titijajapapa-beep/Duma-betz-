import React, { createContext, useContext, useState, useMemo } from 'react';
import { BetItem, Ticket } from '../types/index';
import { useAuth } from './AuthContext';

interface BetSlipContextType {
  items: BetItem[];
  stake: number;
  setStake: (val: number) => void;
  addSelection: (item: BetItem) => void;
  removeSelection: (matchId: string, marketId: string, selectionId: string) => void;
  clearSlip: () => void;
  totalOdds: number;
  potentialReturn: number;
  isSlipOpenMobile: boolean;
  setIsSlipOpenMobile: (open: boolean) => void;
  placeBet: () => Promise<{ success: boolean; ticket?: Ticket; error?: string }>;
  lastPlacedTicket: Ticket | null;
  setLastPlacedTicket: (ticket: Ticket | null) => void;
  isPlacing: boolean;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export const BetSlipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<BetItem[]>([]);
  const [stake, setStake] = useState<number>(10);
  const [isSlipOpenMobile, setIsSlipOpenMobile] = useState<boolean>(false);
  const [lastPlacedTicket, setLastPlacedTicket] = useState<Ticket | null>(null);
  const [isPlacing, setIsPlacing] = useState<boolean>(false);
  const { token, updateBalance } = useAuth();

  const addSelection = (newItem: BetItem) => {
    setItems(prev => {
      // Check if user already picked a market in this match
      const existsIndex = prev.findIndex(i => i.matchId === newItem.matchId && i.marketId === newItem.marketId);
      if (existsIndex >= 0) {
        // If clicking the same option again, remove it (toggle behavior)
        if (prev[existsIndex].selectionId === newItem.selectionId) {
          return prev.filter((_, idx) => idx !== existsIndex);
        }
        // Otherwise replace selection for this market
        const updated = [...prev];
        updated[existsIndex] = newItem;
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const removeSelection = (matchId: string, marketId: string, selectionId: string) => {
    setItems(prev => prev.filter(i => !(i.matchId === matchId && i.marketId === marketId && i.selectionId === selectionId)));
  };

  const clearSlip = () => {
    setItems([]);
  };

  const totalOdds = useMemo(() => {
    if (items.length === 0) return 0;
    const prod = items.reduce((acc, item) => acc * item.odd, 1);
    return Number(prod.toFixed(2));
  }, [items]);

  const potentialReturn = useMemo(() => {
    return Number((stake * totalOdds).toFixed(2));
  }, [stake, totalOdds]);

  const placeBet = async () => {
    if (!token) {
      return { success: false, error: 'Faça login para registrar seu bilhete.' };
    }
    if (items.length === 0) {
      return { success: false, error: 'Selecione ao menos um jogo.' };
    }
    if (stake <= 0) {
      return { success: false, error: 'Informe um valor de aposta válido.' };
    }

    setIsPlacing(true);
    try {
      const res = await fetch('/api/bets/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items, stake })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao registrar bilhete.' };
      }

      setLastPlacedTicket(data.ticket);
      updateBalance(data.newBalance);
      clearSlip();
      setIsSlipOpenMobile(false);
      return { success: true, ticket: data.ticket };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão.' };
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <BetSlipContext.Provider
      value={{
        items,
        stake,
        setStake,
        addSelection,
        removeSelection,
        clearSlip,
        totalOdds,
        potentialReturn,
        isSlipOpenMobile,
        setIsSlipOpenMobile,
        placeBet,
        lastPlacedTicket,
        setLastPlacedTicket,
        isPlacing
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
};

export const useBetSlip = () => {
  const context = useContext(BetSlipContext);
  if (!context) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
};
