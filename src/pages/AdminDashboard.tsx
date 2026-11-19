import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { getOrders } from './OrdersPage';

interface AdminDashboardProps {
  onNavigate?: (page: string, params?: any) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [activeTab, setActiveTab] = useState<'items' | 'users' | 'orders'>('items');
  const [, setRefresh] = useState(0);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  // Proteksi Rute: Tolak jika belum login atau bukan role 'admin'
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-red-100">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Akses Terbatas (Khusus Admin)</h2>
          <p className="text-xs text-gray-500 mb-6">
            Halaman ini hanya dapat diakses oleh administrator Re:V untuk moderasi listing dan pengguna.
          </p>
          <div className="flex flex-col gap-2">
            {!currentUser && (
              <button
                onClick={() => openAuthModal('login')}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Masuk sebagai Admin
              </button>
            )}
            <button
              onClick={() => go('home')}
              className="w-full py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
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
    if (typeof (dbService as any).saveDB === 'function') {
      (dbService as any).saveDB(updatedDB);
    } else {
      localStorage.setItem('rev_db', JSON.stringify(updatedDB));
    }
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard Re:V</h1>
          <p className="text-xs text-gray-500">Moderasi barang, verifikasi mahasiswa, dan pantauan transaksi</p>
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
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'items', label: `Barang (${items.length})` },
          { id: 'users', label: `Pengguna (${users.length})` },
          { id: 'orders', label: `Transaksi (${orders.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
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
                    src={item.image || item.foto || '/assets/seed-images/placeholder.svg'}
                    alt={item.title || item.nama_barang}
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.title || item.nama_barang}
                    </p>
                    <p className="text-xs text-gray-500">
                      Kategori: {item.category || item.kategori || '-'} • Rp{' '}
                      {Number(item.price || item.harga || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 shrink-0"
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
                  onClick={() => handleToggleVerifyUser(user.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
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
    </div>
  );
}