import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/database';
// Import authService yang baru kita buat di db.ts
import { authService } from '../services/db';

export const CURRENT_USER_KEY = 'currentUser';

// PERHATIAN: login dan register sekarang mengembalikan Promise (async)
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
  // Ambil user dari localStorage hanya untuk menyimpan sesi sementara
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

  // getDB() dihapus karena database Railway tidak perlu diinisialisasi dari frontend

  // Fungsi Login sekarang memanggil server MySQL Railway via fetch
  const login = async (identifier: string, password: string) => {
    try {
      // Identifier bisa berupa email
      const cleanId = identifier.trim().toLowerCase();
      
      // Panggil backend API
      const response = await authService.login(cleanId, password);

      if (!response.success) {
        return { success: false, message: response.message || 'Login gagal.' };
      }

      // Jika berhasil, simpan user ke state dan localStorage
      const user = response.data; // asumsikan backend mengembalikan data user di properti 'data'
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      setIsAuthModalOpen(false);
      
      return { success: true, user };
    } catch (error) {
      console.error('Error saat login:', error);
      return { success: false, message: 'Terjadi kesalahan jaringan atau server.' };
    }
  };

  // Quick Login biasanya dipakai untuk mode demo. 
  // Jika ingin dihapus boleh, namun ini disisakan agar tidak memecah komponen yang masih memakainya.
  const quickLogin = (userId: string) => {
    console.warn('quickLogin hanya disimulasikan. Sebaiknya gunakan login normal dengan password.');
    // Simulasi jika dibutuhkan
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  };

  // Fungsi Register sekarang mengirim data ke server MySQL Railway via fetch
  const register = async (data: { nama: string; email: string; password: string; lokasi?: string }) => {
    try {
      const payload = {
        nama: data.nama.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
        lokasi: data.lokasi?.trim() || 'Sekaran, Gunungpati'
      };

      // Panggil backend API
      const response = await authService.register(payload);

      if (!response.success) {
        return { success: false, message: response.message || 'Gagal mendaftar.' };
      }

      // Jika berhasil mendaftar, langsung set state user (auto-login)
      const newUser = response.data;
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
    console.warn('resetDemoData tidak lagi berfungsi karena data ada di database Railway.');
    // resetDB() dihapus
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