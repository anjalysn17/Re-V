import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB } from '../services/db';
import { getOrders } from './OrdersPage';

interface ProfilePageProps {
  onNavigate?: (page: string, params?: any) => void;
}

const LOKASI_COD_PRESETS = [
  'Kampus UNNES Sekaran (Gerbang Utama / Gedung)',
  'Sekaran, Gunungpati',
  'Patemon, Gunungpati',
  'Banaran, Gunungpati',
  'Mangunsari, Gunungpati',
  'Ngijo, Gunungpati',
  'Pakintelan, Gunungpati',
  'Sampangan / Gajahmungkur',
  'Tembalang / Banyumanik',
];

const DEFAULT_LOKASI = 'Sekaran, Gunungpati';

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { currentUser, logout, openAuthModal, updateCurrentUser, setCurrentUser } = useAuth() as any;
  const [isEditing, setIsEditing] = useState(false);

  // State form edit profil menyesuaikan akun yang sedang login
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [lokasiPreset, setLokasiPreset] = useState(DEFAULT_LOKASI);
  const [lokasiCustom, setLokasiCustom] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  // Tampilan jika pengguna belum login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Belum Masuk ke Akun</h2>
          <p className="text-sm text-gray-500 mb-6">
            Silakan masuk atau daftar menggunakan akun mahasiswa UNNES untuk melihat profil, barang, dan riwayat transaksimu.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk / Daftar Sekarang
          </button>
        </div>
      </div>
    );
  }

  // Ambil data terbaru dari db.users (tersinkron dengan server saat polling)
  const db = getDB();
  const userId = currentUser.id;
  const freshUser = (db.users || []).find((u: any) => u.id === userId);
  const activeUser = freshUser ? { ...currentUser, ...freshUser } : currentUser;

  // Sinkronisasi state form saat user berubah atau selesai polling (kecuali sedang mengedit)
  useEffect(() => {
    if (activeUser && !isEditing) {
      setNama(activeUser.nama || activeUser.name || '');
      setNoHp(activeUser.no_hp || activeUser.phone || '');

      const savedLokasi = activeUser.lokasi || activeUser.alamat || DEFAULT_LOKASI;
      if (LOKASI_COD_PRESETS.includes(savedLokasi)) {
        setLokasiPreset(savedLokasi);
        setLokasiCustom('');
      } else {
        setLokasiPreset('LAINNYA');
        setLokasiCustom(savedLokasi);
      }
    }
  }, [activeUser.id, activeUser.nama, activeUser.no_hp, activeUser.lokasi, isEditing]);

  // Hitung statistik dinamis milik akun yang sedang login (cek id_pemilik sesuai kontrak PAKEM)
  const myItemsCount = (db.items || []).filter(
    (item: any) =>
      item.id_pemilik === userId ||
      item.id_user === userId ||
      item.sellerId === userId ||
      item.ownerId === userId
  ).length;
  const myOrdersCount = getOrders(userId).length;
  const myCartCount = (db.cart || []).filter(
    (c: any) => c.id_user === userId || c.userId === userId || c.id_pembeli === userId
  ).length;

  const displayName = activeUser.nama || activeUser.name || 'Pengguna Re:V';
  const displayEmail = activeUser.email || '-';
  const displayLokasi = activeUser.lokasi || activeUser.alamat || DEFAULT_LOKASI;
  const isUnnesStudent = displayEmail.toLowerCase().includes('unnes.ac.id') || Boolean(activeUser.is_verified);
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNama = nama.trim();
    const trimmedNoHp = noHp.trim();
    const finalLokasi =
      lokasiPreset === 'LAINNYA'
        ? lokasiCustom.trim() || DEFAULT_LOKASI
        : lokasiPreset;

    const updatedUser = {
      ...activeUser,
      nama: trimmedNama,
      name: trimmedNama,
      no_hp: trimmedNoHp,
      phone: trimmedNoHp,
      lokasi: finalLokasi,
      alamat: finalLokasi,
    };

    // 1. Simpan ke koleksi users di DB utama agar otomatis tersinkron ke backend via saveDB()
    const currentDb = getDB();
    const usersList = currentDb.users || [];
    const existsInDb = usersList.some((u: any) => u.id === userId);
    const updatedUsers = existsInDb
      ? usersList.map((u: any) =>
          u.id === userId
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

    // 2. Perbarui cache sesi aktif di localStorage & AuthContext
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    if (typeof updateCurrentUser === 'function') {
      updateCurrentUser(updatedUser);
    } else if (typeof setCurrentUser === 'function') {
      setCurrentUser(updatedUser);
    }

    // 3. Beri sinyal pembaruan ke komponen lain (Header, dsb.)
    window.dispatchEvent(new Event('rev-db-updated'));

    setIsEditing(false);
    setSaveMessage('Profil dan lokasi COD berhasil diperbarui.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {saveMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          {saveMessage}
        </div>
      )}

      {/* Kartu Identitas Akun */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {activeUser.foto_profil || activeUser.avatar ? (
              <img
                src={activeUser.foto_profil || activeUser.avatar}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                {initials}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{displayName}</h1>
                {isUnnesStudent && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Mahasiswa Terverifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
              {activeUser.nim && (
                <p className="text-xs text-gray-500 mt-0.5">NIM: {activeUser.nim}</p>
              )}
              <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                <span>📍</span> {displayLokasi}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 shrink-0"
          >
            {isEditing ? 'Batal' : 'Edit Profil'}
          </button>
        </div>

        {/* Form Edit Profil */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-5 pt-5 border-t border-gray-100 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor WhatsApp / HP</label>
              <input
                type="text"
                value={noHp}
                onChange={(e) => setNoHp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Area Kos / Titik Lokasi COD Utama
              </label>
              <select
                value={lokasiPreset}
                onChange={(e) => setLokasiPreset(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                {LOKASI_COD_PRESETS.map((area) => (
                  <option key={area} value={area}>
                    {area}
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
                  className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                Lokasi ini akan ditampilkan sebagai area COD default saat kamu mengunggah barang.
              </p>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
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
          onClick={() => go('my-items')}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 transition-colors"
        >
          <p className="text-xl font-bold text-gray-900">{myItemsCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Barang Saya</p>
        </button>

        <button
          onClick={() => go('orders')}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 transition-colors"
        >
          <p className="text-xl font-bold text-gray-900">{myOrdersCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Transaksi</p>
        </button>

        <button
          onClick={() => go('cart')}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center hover:border-gray-300 transition-colors"
        >
          <p className="text-xl font-bold text-gray-900">{myCartCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Keranjang</p>
        </button>
      </div>

      {/* Menu Navigasi Akun */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
        <button
          onClick={() => go('my-items')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Kelola Barang Saya</p>
            <p className="text-xs text-gray-500">Edit, tandai terjual, atau hapus barang jual/barter</p>
          </div>
          <span className="text-gray-400">›</span>
        </button>

        <button
          onClick={() => go('orders')}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">Riwayat Pesanan & Barter</p>
            <p className="text-xs text-gray-500">Pantau status transaksi pembelian maupun pertukaran barang</p>
          </div>
          <span className="text-gray-400">›</span>
        </button>

        {activeUser.role === 'admin' && (
          <button
            onClick={() => go('admin')}
            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <div>
              <p className="text-sm font-semibold text-indigo-700">Dashboard Admin</p>
              <p className="text-xs text-gray-500">Moderasi pengguna dan listing marketplace</p>
            </div>
            <span className="text-gray-400">›</span>
          </button>
        )}

        <button
          onClick={() => {
            logout();
            go('home');
          }}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-red-50 text-red-600"
        >
          <span className="text-sm font-semibold">Keluar dari Akun</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}