import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB, CURRENT_USER_KEY } from '../services/db';
import { getOrders } from './OrdersPage';
import { UNNES_LOCATIONS, DEFAULT_LOCATION_ID, findLocation } from '../constants/locations';

interface ProfilePageProps {
  onNavigate?: (page: string, params?: any) => void;
}

const DEFAULT_LOC_OBJ =
  UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];
const DEFAULT_LOKASI = DEFAULT_LOC_OBJ.name;
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { currentUser, logout, openAuthModal, updateCurrentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);

  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [lokasiPreset, setLokasiPreset] = useState(DEFAULT_LOKASI);
  const [lokasiCustom, setLokasiCustom] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // State verifikasi OTP email
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpFeedback, setOtpFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Seluruh hooks ditempatkan sebelum early return agar jumlah hook konsisten saat login/logout
  const db = getDB();
  const userId = currentUser?.id;
  const freshUser = userId
    ? (db.users || []).find((u: any) => String(u.id) === String(userId))
    : null;
  const activeUser: any = currentUser
    ? freshUser
      ? { ...currentUser, ...freshUser }
      : currentUser
    : null;

  useEffect(() => {
    if (activeUser && !isEditing) {
      setNama(activeUser.nama || activeUser.name || '');
      setNoHp(activeUser.no_hp || activeUser.phone || '');

      const savedLokasi = activeUser.lokasi || activeUser.alamat || DEFAULT_LOKASI;
      const matched = findLocation(savedLokasi);
      if (matched) {
        setLokasiPreset(matched.name);
        setLokasiCustom('');
      } else {
        setLokasiPreset('LAINNYA');
        setLokasiCustom(savedLokasi);
      }
    }
  }, [activeUser?.id, activeUser?.nama, activeUser?.no_hp, activeUser?.lokasi, isEditing]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  if (!currentUser || !activeUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-14 pb-24 text-center">
        <div className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Belum Masuk ke Akun</h2>
          <p className="text-sm text-gray-500 mb-6">
            Silakan masuk atau daftar menggunakan email aktifmu untuk melihat profil, barang, dan riwayat transaksimu.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full min-h-[46px] py-3 rounded-xl text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.99] hover:opacity-90 touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk / Daftar Sekarang
          </button>
        </div>
      </div>
    );
  }

  const myItemsCount = (db.items || []).filter(
    (item: any) =>
      String(item.id_pemilik ?? item.id_user ?? item.sellerId ?? item.ownerId) === String(userId)
  ).length;
  const myOrdersCount = getOrders(String(userId)).length;
  const myCartCount = (db.cart || []).filter(
    (c: any) => String(c.id_user ?? c.userId ?? c.id_pembeli) === String(userId)
  ).length;

  const displayName = activeUser.nama || activeUser.name || 'Pengguna Re:V';
  const displayEmail = activeUser.email || '-';
  const displayLokasi = activeUser.lokasi || activeUser.alamat || DEFAULT_LOKASI;
  const isAccountVerified = Boolean(activeUser.is_verified);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const applyVerifiedState = (serverUser?: any) => {
    const updatedUser = {
      ...activeUser,
      ...(serverUser || {}),
      is_verified: true,
    };
    const currentDb = getDB();
    const updatedUsers = (currentDb.users || []).map((u: any) =>
      String(u.id) === String(userId) ? { ...u, is_verified: true } : u
    );
    saveDB({ ...currentDb, users: updatedUsers });
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    updateCurrentUser(updatedUser);
    window.dispatchEvent(new Event('rev-db-updated'));
  };

  const handleSendOtp = async () => {
    if (!displayEmail || displayEmail === '-' || otpLoading || otpCooldown > 0) return;
    setOtpLoading(true);
    setOtpFeedback(null);

    try {
      if (!API_BASE_URL) {
        // Mode lokal/offline tanpa server
        setOtpSent(true);
        setOtpCooldown(60);
        setOtpFeedback({
          type: 'success',
          text: 'Mode demo lokal: masukkan 6 digit angka apa saja untuk memverifikasi email.',
        });
        return;
      }

      const token = localStorage.getItem('rev_token');
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: displayEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setOtpFeedback({
          type: 'error',
          text: data.message || 'Gagal mengirim kode OTP. Coba beberapa saat lagi.',
        });
        return;
      }

      setOtpSent(true);
      setOtpCooldown(60);
      setOtpFeedback({
        type: 'success',
        text: data.message || `Kode OTP 6 digit telah dikirim ke ${displayEmail}.`,
      });
    } catch {
      setOtpFeedback({
        type: 'error',
        text: 'Tidak dapat terhubung ke server untuk mengirim OTP.',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6 || otpLoading) return;

    setOtpLoading(true);
    setOtpFeedback(null);

    try {
      if (!API_BASE_URL) {
        applyVerifiedState();
        setOtpCode('');
        setOtpSent(false);
        setSaveMessage('Email berhasil diverifikasi!');
        setTimeout(() => setSaveMessage(''), 3500);
        return;
      }

      const token = localStorage.getItem('rev_token');
      const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: displayEmail, code: cleanCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.verified) {
        setOtpFeedback({
          type: 'error',
          text: data.message || 'Kode OTP salah atau sudah kedaluwarsa.',
        });
        return;
      }

      applyVerifiedState(data.user);
      setOtpCode('');
      setOtpSent(false);
      setSaveMessage('Email berhasil diverifikasi! Badge terverifikasi kini aktif.');
      setTimeout(() => setSaveMessage(''), 3500);
    } catch {
      setOtpFeedback({
        type: 'error',
        text: 'Terjadi gangguan jaringan saat memverifikasi OTP.',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNama = nama.trim();
    const trimmedNoHp = noHp.trim();
    const finalLokasi =
      lokasiPreset === 'LAINNYA' ? lokasiCustom.trim() || DEFAULT_LOKASI : lokasiPreset;

    const updatedUser = {
      ...activeUser,
      nama: trimmedNama,
      name: trimmedNama,
      no_hp: trimmedNoHp,
      phone: trimmedNoHp,
      lokasi: finalLokasi,
      alamat: finalLokasi,
    };

    const currentDb = getDB();
    const usersList = currentDb.users || [];
    const existsInDb = usersList.some((u: any) => String(u.id) === String(userId));
    const updatedUsers = existsInDb
      ? usersList.map((u: any) =>
          String(u.id) === String(userId)
            ? {
                ...u,
                nama: trimmedNama,
                no_hp: trimmedNoHp,
                lokasi: finalLokasi,
              }
            : u
        )
      : [...usersList, updatedUser];

    saveDB({
      ...currentDb,
      users: updatedUsers,
    });

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    updateCurrentUser(updatedUser);
    window.dispatchEvent(new Event('rev-db-updated'));

    setIsEditing(false);
    setSaveMessage('Profil dan lokasi COD berhasil diperbarui.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-5">
      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          {saveMessage}
        </div>
      )}

      {/* Kartu Identitas Akun */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {activeUser.foto_profil || activeUser.avatar ? (
              <img
                src={activeUser.foto_profil || activeUser.avatar}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border border-gray-200 shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900 truncate">{displayName}</h1>
                {isAccountVerified ? (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Akun Terverifikasi
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Belum Verifikasi OTP
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{displayEmail}</p>
              {activeUser.nim && <p className="text-xs text-gray-500 mt-0.5">NIM: {activeUser.nim}</p>}
              <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                <span>📍</span> <span className="truncate">{displayLokasi}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-[0.98] shrink-0 touch-manipulation"
          >
            {isEditing ? 'Batal' : 'Edit Profil'}
          </button>
        </div>

        {/* Banner Verifikasi OTP Email jika belum terverifikasi */}
        {!isAccountVerified && displayEmail !== '-' && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-amber-900">Verifikasi Email Akunmu</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  Dapatkan lencana terverifikasi dengan memvalidasi kode OTP 6 digit ke{' '}
                  <span className="font-semibold">{displayEmail}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || otpCooldown > 0}
                className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50 shrink-0 touch-manipulation active:scale-[0.99]"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                {otpLoading && !otpSent
                  ? 'Mengirim...'
                  : otpCooldown > 0
                  ? `Kirim Ulang (${otpCooldown}d)`
                  : otpSent
                  ? 'Kirim Ulang OTP'
                  : 'Kirim Kode OTP'}
              </button>
            </div>

            {otpSent && (
              <form onSubmit={handleVerifyOtp} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digit OTP"
                  className="flex-1 min-h-[44px] px-3.5 py-2 text-sm tracking-widest font-semibold text-center rounded-xl border border-amber-300 bg-white focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={otpCode.length !== 6 || otpLoading}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 touch-manipulation active:scale-[0.99]"
                >
                  {otpLoading ? 'Memeriksa...' : 'Verifikasi'}
                </button>
              </form>
            )}

            {otpFeedback && (
              <p
                className={`text-[11px] font-medium ${
                  otpFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
                }`}
              >
                {otpFeedback.text}
              </p>
            )}
          </div>
        )}

        {/* Form Edit Profil */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-5 pt-5 border-t border-gray-100 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="tel"
                inputMode="tel"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Area Kos / Titik Lokasi COD Utama
              </label>
              <select
                value={lokasiPreset}
                onChange={(e) => setLokasiPreset(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                {UNNES_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
                <option value="LAINNYA">Lainnya (Tulis lokasi manual)</option>
              </select>

              {lokasiPreset === 'LAINNYA' && (
                <input
                  type="text"
                  value={lokasiCustom}
                  onChange={(e) => setLokasiCustom(e.target.value)}
                  placeholder="Contoh: Kos Melati, Gang Kelinci Sekaran"
                  required
                  className="mt-2 w-full min-h-[44px] px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Lokasi ini akan ditampilkan sebagai area COD default saat kamu mengunggah barang.
              </p>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation active:scale-[0.99]"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Simpan Perubahan
            </button>
          </form>
        )}
      </div>

      {/* Ringkasan Aktivitas Akun */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => go('my-items')}
          className="min-h-[76px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 active:scale-[0.98] transition-all touch-manipulation"
        >
          <p className="text-xl font-bold text-gray-900">{myItemsCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Barang Saya</p>
        </button>

        <button
          type="button"
          onClick={() => go('orders')}
          className="min-h-[76px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 active:scale-[0.98] transition-all touch-manipulation"
        >
          <p className="text-xl font-bold text-gray-900">{myOrdersCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Transaksi</p>
        </button>

        <button
          type="button"
          onClick={() => go('cart')}
          className="min-h-[76px] bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 active:scale-[0.98] transition-all touch-manipulation"
        >
          <p className="text-xl font-bold text-gray-900">{myCartCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Keranjang</p>
        </button>
      </div>

      {/* Menu Navigasi Akun */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        <button
          type="button"
          onClick={() => go('my-items')}
          className="w-full min-h-[60px] px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Kelola Barang Saya</p>
            <p className="text-xs text-gray-500">Edit, tandai terjual, atau hapus barang jual/barter</p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </button>

        <button
          type="button"
          onClick={() => go('orders')}
          className="w-full min-h-[60px] px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Riwayat Pesanan & Barter</p>
            <p className="text-xs text-gray-500">Pantau status transaksi pembelian maupun pertukaran barang</p>
          </div>
          <span className="text-gray-400 text-lg">›</span>
        </button>

        {activeUser.role === 'admin' && (
          <button
            type="button"
            onClick={() => go('admin')}
            className="w-full min-h-[60px] px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 active:bg-gray-100 touch-manipulation"
          >
            <div>
              <p className="text-sm font-semibold text-indigo-700">Dashboard Admin</p>
              <p className="text-xs text-gray-500">
                Moderasi pengguna, listing marketplace, dan jadwal Flash Barter
              </p>
            </div>
            <span className="text-gray-400 text-lg">›</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            logout();
            go('home');
          }}
          className="w-full min-h-[56px] px-5 py-4 flex items-center justify-between text-left hover:bg-red-50 active:bg-red-100 text-red-600 touch-manipulation"
        >
          <span className="text-sm font-semibold">Keluar dari Akun</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}