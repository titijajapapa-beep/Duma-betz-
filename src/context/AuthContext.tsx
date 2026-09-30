import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; username: string; email: string; password: string; phone?: string; referralCode?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  referralCode: string | null;
  setReferralCode: (code: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('duma_token'));
  const [referralCode, setReferralCode] = useState<string | null>(() => localStorage.getItem('duma_ref'));

  // Check URL parameters for referral code e.g. ?ref=CARLOS10 or /c/CARLOS10
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        const cleanRef = ref.trim().toUpperCase();
        setReferralCode(cleanRef);
        localStorage.setItem('duma_ref', cleanRef);
      } else {
        const path = window.location.pathname;
        if (path.startsWith('/c/')) {
          const code = path.replace('/c/', '').split('/')[0].trim().toUpperCase();
          if (code) {
            setReferralCode(code);
            localStorage.setItem('duma_ref', code);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing referral code:', e);
    }
  }, []);

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else if (res.status === 401 || res.status === 403) {
        logout();
      }
    } catch (err) {
      console.error('Error refreshing user session:', err);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setUser(null);
    }
  }, [token]);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha no login' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('duma_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const register = async (userData: { name: string; username: string; email: string; password: string; phone?: string; referralCode?: string }) => {
    try {
      const codeToSend = userData.referralCode || referralCode || undefined;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, referralCode: codeToSend })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Falha no cadastro' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('duma_token', data.token);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('duma_token');
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        refreshUser,
        updateBalance,
        referralCode,
        setReferralCode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
