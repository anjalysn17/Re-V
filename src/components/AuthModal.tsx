import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, APP_LOGO_LETTER } from '../constants/brand';

interface AuthModalProps {
  onLoginSuccess?: (role: 'user' | 'admin') => void;
}

export default function AuthModal({ onLoginSuccess }: AuthModalProps) {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regNama, setRegNama] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regLokasi, setRegLokasi] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!identifier.trim() || !password) {
      setErrorMsg('Harap isi email/nama dan password.');
      return;
    }

    const res = login(identifier, password);
    if (!res.success) {
      setErrorMsg(res.message || 'Gagal masuk.');
    } else {
      setIdentifier('');
      setPassword('');
      setErrorMsg('');
      if (res.user?.role === 'admin') {
        onLoginSuccess?.('admin');
      } else {
        onLoginSuccess?.('user');
      }
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!regNama.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Nama, email, dan password wajib diisi.');
      return;
    }

    const res = register({
      nama: regNama,
      email: regEmail,
      lokasi: regLokasi,
      password: regPassword,
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Gagal mendaftar.');
    } else {
      setRegNama('');
      setRegEmail('');
      setRegLokasi('');
      setRegPassword('');
      setErrorMsg('');
      onLoginSuccess?.('user');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={e => e.target === e.currentTarget && closeAuthModal()}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header Modal */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-primary)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}
            >
              {APP_LOGO_LETTER}
            </span>
            <h3 className="font-bold text-white text-base">
              {authModalMode === 'login' ? `Masuk ke ${APP_NAME}` : 'Daftar Akun Baru'}
            </h3>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b text-xs font-semibold" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={() => {
              openAuthModal('login');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              authModalMode === 'login'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Masuk
          </button>
          <button
            onClick={() => {
              openAuthModal('register');
              setErrorMsg('');
            }}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              authModalMode === 'register'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Konten Form */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {authModalMode === 'login' ? (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Kampus / Nama Akun
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    placeholder="Contoh: anjalysn@students.unnes.ac.id atau Anjaly"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                    style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password akun"
                    className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                    style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.99] mt-2"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Masuk Sekarang
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={regNama}
                  onChange={e => setRegNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Mahasiswa</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="budi@students.unnes.ac.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi Kos / Kampus</label>
                <input
                  type="text"
                  value={regLokasi}
                  onChange={e => setRegLokasi(e.target.value)}
                  placeholder="Contoh: Sekaran, Banaran, atau Patemon"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  placeholder="Buat password akun"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.99] mt-2"
                style={{ background: 'var(--color-primary)' }}
              >
                Daftar & Masuk
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
