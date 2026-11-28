import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_ENABLED, ApiError, apiSendOtp } from '../services/api';
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
  const [regOtp, setRegOtp] = useState('');

  // State pengiriman OTP Gmail
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpCooldown]);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async () => {
    setErrorMsg('');
    setInfoMsg('');
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Masukkan alamat email yang valid terlebih dahulu.');
      return;
    }

    if (!API_ENABLED) {
      setOtpSent(true);
      setOtpCooldown(30);
      setInfoMsg('Mode lokal aktif: masukkan 6 digit angka apa saja (misal 123456) sebagai simulasi OTP.');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await apiSendOtp(cleanEmail, 'register');
      setOtpSent(true);
      setOtpCooldown(60);
      setInfoMsg(res.message || `Kode OTP telah dikirim ke ${cleanEmail}.`);
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError
          ? err.message
          : 'Gagal mengirim kode OTP. Periksa koneksi atau alamat email kamu.'
      );
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!identifier.trim() || !password) {
      setErrorMsg('Harap isi email/nama dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await login(identifier, password);
      if (!res.success) {
        setErrorMsg(res.message || 'Gagal masuk.');
      } else {
        setIdentifier('');
        setPassword('');
        setErrorMsg('');
        onLoginSuccess?.(res.user?.role === 'admin' ? 'admin' : 'user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!regNama.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg('Nama, email, dan password wajib diisi.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg('Password minimal 8 karakter.');
      return;
    }
    if (!/^\d{6}$/.test(regOtp.trim())) {
      setErrorMsg('Klik "Kirim OTP" lalu masukkan 6 digit kode verifikasi dari email kamu.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        nama: regNama,
        email: regEmail,
        lokasi: regLokasi,
        password: regPassword,
        otp: regOtp.trim(),
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Gagal mendaftar.');
      } else {
        setRegNama('');
        setRegEmail('');
        setRegLokasi('');
        setRegPassword('');
        setRegOtp('');
        setOtpSent(false);
        setErrorMsg('');
        onLoginSuccess?.('user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={authModalMode === 'login' ? 'Masuk Akun' : 'Daftar Akun Baru'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && closeAuthModal()}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden my-0 sm:my-6"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header Modal */}
        <div
          className="px-6 py-3.5 flex items-center justify-between border-b"
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
              {authModalMode === 'login' ? `Masuk ke ${APP_NAME}` : 'Daftar & Verifikasi Email'}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Tutup modal"
            onClick={closeAuthModal}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 touch-manipulation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b text-xs font-semibold" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => {
              openAuthModal('login');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`min-h-[44px] flex-1 py-3 text-center transition-colors border-b-2 touch-manipulation ${
              authModalMode === 'login'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              openAuthModal('register');
              setErrorMsg('');
              setInfoMsg('');
            }}
            className={`min-h-[44px] flex-1 py-3 text-center transition-colors border-b-2 touch-manipulation ${
              authModalMode === 'register'
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Konten Form */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[82dvh] overflow-y-auto overscroll-contain pb-24 sm:pb-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              {infoMsg}
            </div>
          )}

          {authModalMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email / Nama Akun
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Contoh: budi@gmail.com atau Budi"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password akun"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.99] mt-2 disabled:opacity-50 touch-manipulation"
                style={{ background: 'var(--color-accent)' }}
              >
                {isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alamat Email Aktif</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (otpSent) setOtpSent(false);
                    }}
                    placeholder="nama@email.com"
                    className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                    style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp || otpCooldown > 0 || !regEmail.trim()}
                    className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0 transition-opacity hover:opacity-90 disabled:opacity-50 touch-manipulation"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {isSendingOtp
                      ? 'Mengirim...'
                      : otpCooldown > 0
                      ? `${otpCooldown}d`
                      : otpSent
                      ? 'Kirim Ulang'
                      : 'Kirim OTP'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kode OTP Email (6 Digit)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={regOtp}
                  onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Masukkan 6 digit kode OTP"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono tracking-widest outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi Kos / Area COD</label>
                <input
                  type="text"
                  value={regLokasi}
                  onChange={(e) => setRegLokasi(e.target.value)}
                  placeholder="Contoh: Sekaran, Banaran, atau Patemon"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password (Minimal 8 Karakter)
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] w-full py-2.5 rounded-xl text-white font-bold text-sm shadow-sm transition-all hover:opacity-90 active:scale-[0.99] mt-2 disabled:opacity-50 touch-manipulation"
                style={{ background: 'var(--color-primary)' }}
              >
                {isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Daftar'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}