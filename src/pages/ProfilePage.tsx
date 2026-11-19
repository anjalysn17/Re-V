import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB } from '../services/db';
import { getOrders } from './OrdersPage';

interface ProfilePageProps {
  onNavigate?: (page: string, params?: any) => void;
}

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { currentUser, logout, openAuthModal } = useAuth() as any;
  const [isEditing, setIsEditing] = useState(false);

  // State form edit profil menyesuaikan akun yang sedang login
  const [nama, setNama] = useState('');
  const [noHp, setNoHp] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  // Sinkronisasi state form setiap kali currentUser berubah (login/ganti akun)
  useEffect(() => {
    if (currentUser) {
      setNama(currentUser.nama || currentUser.name || '');
      setNoHp(currentUser.no_hp || currentUser.phone || '');
      setLokasi(currentUser.lokasi || currentUser.alamat || 'Sekitar Kampus UNNES, Gunungpati');
    }
  }, [currentUser]);

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

  // Hitung statistik dinamis milik akun yang sedang login
  const db = getDB();
  const userId = currentUser.id;
  const myItemsCount = (db.items || []).filter(
    (item: any) => item.id_user === userId || item.sellerId === userId || item.ownerId === userId
  ).length;
  const myOrdersCount = getOrders(userId).length;
  const myCartCount = (db.cart || []).filter((c: any) => c.id_user === userId).length;

  const displayName = currentUser.nama || currentUser.name || 'Pengguna Re:V';
  const displayEmail = currentUser.email || '-';
  const isUnnesStudent = displayEmail.toLowerCase().includes('unnes.ac.id') || currentUser.is_verified;
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      nama,
      name: nama,
      no_hp: noHp,
      phone: noHp,
      lokasi,
      alamat: lokasi,
    };

    // Simpan ke localStorage agar persisten saat refresh
    localStorage.setItem('rev_current_user', JSON.stringify(updatedUser));
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    setIsEditing(false);
    setSaveMessage('Profil berhasil diperbarui.');
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
            {currentUser.foto_profil || currentUser.avatar ? (
              <img
                src={currentUser.foto_profil || currentUser.avatar}
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
              {currentUser.nim && (
                <p className="text-xs text-gray-500 mt-0.5">NIM: {currentUser.nim}</p>
              )}
              <p className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
                <span>📍</span> {lokasi}
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
              <label className="block text-xs font-semibold text-gray-700 mb-1">Area Kos / Lokasi COD</label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Contoh: Sekaran / Patemon, Gunungpati"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
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
            <p className="text-xs text-gray-500">Lihat atau hapus barang yang kamu pasang untuk jual/barter</p>
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

        {currentUser.role === 'admin' && (
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