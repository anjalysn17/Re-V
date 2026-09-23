import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/database';
import { getDB, saveDB, resetDB, CURRENT_USER_KEY } from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  login: (identifier: string, password: string) => { success: boolean; user?: User; message?: string };
  quickLogin: (userId: string) => void;
  logout: () => void;
  register: (data: { nama: string; email: string; password: string; lokasi?: string }) => {
    success: boolean;
    user?: User;
    message?: string;
  };
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    // Pastikan database terinisialisasi
    getDB();
  }, []);

  const login = (identifier: string, password: string) => {
    const db = getDB();
    const cleanId = identifier.trim().toLowerCase();
    const user = db.users.find(
      u => u.email.toLowerCase() === cleanId || u.nama.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, message: 'Pengguna tidak ditemukan. Periksa email atau nama akun.' };
    }

    if (user.password !== password) {
      return { success: false, message: 'Password salah.' };
    }

    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    setIsAuthModalOpen(false);
    return { success: true, user };
  };

  const quickLogin = (userId: string) => {
    const db = getDB();
    const user = db.users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      setIsAuthModalOpen(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  const register = (data: { nama: string; email: string; password: string; lokasi?: string }) => {
    const db = getDB();
    const cleanEmail = data.email.trim().toLowerCase();

    if (db.users.some(u => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Email sudah terdaftar. Silakan masuk atau gunakan email lain.' };
    }

    const nextNumber = db.users.length + 1;
    const newId = `USR-${String(nextNumber).padStart(3, '0')}`;

    const newUser: User = {
      id: newId,
      nama: data.nama.trim(),
      email: data.email.trim(),
      password: data.password,
      foto_profil: '/assets/seed-images/avatar-placeholder.svg',
      lokasi: data.lokasi?.trim() || 'Sekaran, Gunungpati',
      rating: 5.0,
      role: 'user',
    };

    db.users.push(newUser);
    saveDB(db);

    setCurrentUser(newUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    setIsAuthModalOpen(false);
    return { success: true, user: newUser };
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const resetDemoData = () => {
    resetDB();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        quickLogin,
        logout,
        register,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        resetDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
