import React, { createContext, useContext, useState } from 'react';
import { User } from '../types/database';
import { authService } from '../services/db';

export const CURRENT_USER_KEY = 'currentUser';

interface AuthContextType {
  currentUser: User | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  quickLogin: (userId: string) => void;
  logout: () => void;
  register: (data: { nama: string; email: string; password: string; lokasi?: string }) => Promise<{
    success: boolean;
    user?: User;
    message?: string;
  }>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Ambil sesi user dari localStorage saat pertama kali dimuat
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

  // Fungsi Login async terhubung ke backend Railway API (/api/auth/login)
  const login = async (identifier: string, password: string) => {
    try {
      const cleanId = identifier.trim().toLowerCase();
      const response = await authService.login(cleanId, password);
      
      if (!response.success) {
        return { success: false, message: response.message || 'Login gagal.' };
      }

      // Mengambil properti .user sesuai struktur balasan dari authRoutes.js
      const user = response.user;
      if (!user) {
        return { success: false, message: 'Data pengguna tidak valid dari server.' };
      }

      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      setIsAuthModalOpen(false);

      return { success: true, user };
    } catch (error) {
      console.error('Error saat login:', error);
      return { success: false, message: 'Terjadi kesalahan jaringan atau server.' };
    }
  };

  const quickLogin = (userId: string) => {
    console.warn('quickLogin dipanggil untuk ID:', userId);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  // Fungsi Register async terhubung ke backend Railway API (/api/auth/register)
  const register = async (data: { nama: string; email: string; password: string; lokasi?: string }) => {
    try {
      const payload = {
        nama: data.nama.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        lokasi: data.lokasi?.trim() || 'Sekaran, Gunungpati'
      };

      const response = await authService.register(payload);
      if (!response.success) {
        return { success: false, message: response.message || 'Gagal mendaftar.' };
      }

      // Mengambil properti .user sesuai struktur balasan dari authRoutes.js
      const newUser = response.user;
      if (!newUser) {
        return { success: false, message: 'Gagal mendapatkan data registrasi pengguna.' };
      }

      setCurrentUser(newUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
      setIsAuthModalOpen(false);

      return { success: true, user: newUser };
    } catch (error) {
      console.error('Error saat register:', error);
      return { success: false, message: 'Terjadi kesalahan jaringan atau server.' };
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const resetDemoData = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
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