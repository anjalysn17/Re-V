import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/database';
import { getDB, saveDB, resetDB, CURRENT_USER_KEY } from '../services/db';
import {
  API_ENABLED,
  ApiError,
  apiLogin,
  apiRegister,
  apiMe,
  getToken,
  setToken,
  clearToken,
  pullAll,
  flushNow,
} from '../services/api';

interface AuthResult {
  success: boolean;
  user?: User;
  message?: string;
}

interface AuthContextType {
  currentUser: User | null;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  quickLogin: (userId: string) => void;
  logout: () => void;
  register: (data: { nama: string; email: string; password: string; lokasi?: string }) => Promise<AuthResult>;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  resetDemoData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NETWORK_ERROR = 'Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.';

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

    if (!API_ENABLED) return;

    // Mode API: sesi sah hanya jika ada token. Verifikasi token ke server.
    if (!getToken()) {
      setCurrentUser(null);
      localStorage.removeItem(CURRENT_USER_KEY);
      return;
    }
    apiMe()
      .then(({ user }) => {
        const u = user as unknown as User;
        setCurrentUser(u);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(u));
      })
      .catch(() => {
        // 401 sudah ditangani lewat event 'rev-auth-expired'; error jaringan -> pertahankan sesi
      });

    const onExpired = () => setCurrentUser(null);
    window.addEventListener('rev-auth-expired', onExpired);
    return () => window.removeEventListener('rev-auth-expired', onExpired);
  }, []);

  const finishApiAuth = async (token: string, rawUser: Record<string, unknown>): Promise<AuthResult> => {
    const user = rawUser as unknown as User;
    setToken(token);
    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    setIsAuthModalOpen(false);
    try {
      await pullAll(); // ambil data pribadi (chat, keranjang, transaksi) milik akun ini
    } catch {
      /* cache lama tetap dipakai; polling akan menyusul */
    }
    return { success: true, user };
  };

  const login = async (identifier: string, password: string): Promise<AuthResult> => {
    if (API_ENABLED) {
      try {
        const { token, user } = await apiLogin(identifier.trim(), password);
        return await finishApiAuth(token, user);
      } catch (err) {
        return { success: false, message: err instanceof ApiError ? err.message : NETWORK_ERROR };
      }
    }

    // ---- Mode lokal (perilaku lama, tidak diubah) ----
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
    if (API_ENABLED) return; // di mode API login wajib lewat server
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
    if (API_ENABLED) {
      // kirim perubahan yang tertunda dulu (masih pakai token), baru hapus token & muat tampilan tamu
      flushNow()
        .catch(() => undefined)
        .finally(() => {
          clearToken();
          pullAll().catch(() => undefined);
        });
    }
  };

  const register = async (data: {
    nama: string;
    email: string;
    password: string;
    lokasi?: string;
  }): Promise<AuthResult> => {
    if (API_ENABLED) {
      try {
        const { token, user } = await apiRegister({
          nama: data.nama.trim(),
          email: data.email.trim(),
          password: data.password,
          lokasi: data.lokasi?.trim(),
        });
        return await finishApiAuth(token, user);
      } catch (err) {
        return { success: false, message: err instanceof ApiError ? err.message : NETWORK_ERROR };
      }
    }

    // ---- Mode lokal (perilaku lama, tidak diubah) ----
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
