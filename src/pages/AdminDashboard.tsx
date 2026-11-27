import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { getOrders } from './OrdersPage';
import { APP_NAME } from '../constants/brand';

interface AdminDashboardProps {
  onNavigate?: (page: string, params?: any) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'items' | 'users' | 'orders' | 'flash'>('items');
  const [flashMinutesInput, setFlashMinutesInput] = useState<string>('120');
  const [flashActiveInput, setFlashActiveInput] = useState<boolean>(true);
  const [flashSavedToast, setFlashSavedToast] = useState<string>('');
  const [, setRefresh] = useState(0);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  useEffect(() => {
    const db = dbService.getDB() as any;
    if (db.flashBarterConfig) {
      setFlashActiveInput(Boolean(db.flashBarterConfig.active));
      const remainingMin = Math.max(
        1,
        Math.round((Number(db.flashBarterConfig.endsAt || Date.now()) - Date.now()) / 60000)
      );
      setFlashMinutesInput(String(remainingMin));
    }
  }, []);

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Akses Terbatas (Khusus Admin)</h2>
          <p className="text-xs text-gray-500 mb-6">
            Halaman ini hanya dapat diakses oleh administrator {APP_NAME} untuk moderasi listing, pengguna, dan jadwal Flash Barter.
          </p>
          <div className="flex flex-col gap-2">
            {!currentUser && (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="min-h-[42px] w-full py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Masuk sebagai Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => go('home')}
              className="min-h-[42px] w-full py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const db = dbService.getDB() as any;
  const items: any[] = db.items || [];
  const users: any[] = db.users || [];
  const orders = getOrders();

  const persistDB = (updatedDB: any) => {
    dbService.saveDB(updatedDB);
    setRefresh((prev) => prev + 1);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Hapus barang ini dari marketplace?')) return;
    const updatedItems = items.filter((item) => item.id !== itemId);
    persistDB({ ...db, items: updatedItems });
  };

  const handleToggleVerifyUser = (userId: string) => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, is_verified: !u.is_verified } : u
    );
    persistDB({ ...db, users: updatedUsers });
  };

  const handleSaveFlashBarter = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(10080, Number(flashMinutesInput) || 60));
    const endsAt = Date.now() + mins * 60 * 1000;
    persistDB({
      ...db,
      flashBarterConfig: {
        active: flashActiveInput,
        endsAt,
        updatedBy: currentUser.nama || currentUser.email,
      },
    });
    setFlashSavedToast(
      flashActiveInput
        ? `Flash Barter aktif selama ${mins} menit ke depan!`
        : 'Banner Flash Barter dinonaktifkan sementara.'
    );
    setTimeout(() => setFlashSavedToast(''), 3500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard {APP_NAME}</h1>
          <p className="text-xs text-gray-500">
            Moderasi barang, verifikasi pengguna, pantauan transaksi, dan pengaturan Flash Barter
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start">
          Admin: {currentUser.nama || currentUser.name || currentUser.email}
        </span>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Total Listing</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Total Pengguna</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500">Total Transaksi</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{orders.length}</p>
        </div>
      </div>

      {/* Navigasi Tab Moderasi */}
      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: 'items', label: `Barang (${items.length})` },
          { id: 'users', label: `Pengguna (${users.length})` },
          { id: 'orders', label: `Transaksi (${orders.length})` },
          { id: 'flash', label: '⚡ Timer Flash Barter' },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 touch-manipulation ${
              activeTab === tab.id
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={activeTab === tab.id ? { background: 'var(--color-primary, #567257)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Konten Tab Barang */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {items.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-500">Belum ada barang terdaftar.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.foto || item.image || '/assets/seed-images/placeholder.svg'}
                    alt={item.nama || item.title}
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.nama || item.title || item.nama_barang}
                    </p>
                    <p className="text-xs text-gray-500">
                      Kategori: {item.kategori || item.category || '-'} • Rp{' '}
                      {Number(item.harga ?? item.price ?? 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 shrink-0 touch-manipulation"
                >
                  Hapus
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Konten Tab Pengguna */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {users.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-500">Belum ada data pengguna.</p>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{user.nama || user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVerifyUser(user.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold touch-manipulation ${
                    user.is_verified
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {user.is_verified ? 'Terverifikasi ✓' : 'Verifikasi Akun'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Konten Tab Transaksi */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
          {orders.length === 0 ? (
            <p className="p-6 text-center text-xs text-gray-500">Belum ada transaksi berlangsung.</p>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">{order.itemTitle}</p>
                  <p className="text-xs text-gray-500">
                    Tipe: {order.type.toUpperCase()} • Mitra: {order.sellerName}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {order.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Konten Tab Pengaturan Flash Barter */}
      {activeTab === 'flash' && (
        <form
          onSubmit={handleSaveFlashBarter}
          className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 max-w-lg"
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">Pengaturan Hitung Mundur Flash Barter</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Atur durasi penghitung mundur real-time yang tampil di strip Flash Barter pada Beranda.
            </p>
          </div>

          {flashSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              ✓ {flashSavedToast}
            </div>
          )}

          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={flashActiveInput}
              onChange={(e) => setFlashActiveInput(e.target.checked)}
              className="accent-emerald-700 w-4 h-4"
            />
            <span className="text-xs font-bold text-gray-800">
              Aktifkan Sesi Flash Barter di Beranda
            </span>
          </label>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Durasi Sesi (dalam Menit)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={10080}
                value={flashMinutesInput}
                onChange={(e) => setFlashMinutesInput(e.target.value)}
                className="w-32 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:border-emerald-600"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[30, 60, 120, 360].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setFlashMinutesInput(String(preset))}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 touch-manipulation"
                  >
                    {preset >= 60 ? `${preset / 60} Jam` : `${preset} Mnt`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Simpan & Terapkan ke Beranda
          </button>
        </form>
      )}
    </div>
  );
}