import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDB,
  saveDB,
  getCatalogItems,
  getFlashBarterConfig,
  saveFlashBarterConfig,
  isItemSold,
  parseSafePrice,
} from '../services/db';
import { getOrders } from './OrdersPage';
import { APP_NAME } from '../constants/brand';

interface AdminDashboardProps {
  onNavigate?: (page: string, params?: any) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { currentUser, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<'items' | 'users' | 'orders' | 'flash'>('flash');
  const [flashMinutesInput, setFlashMinutesInput] = useState<string>('120');
  const [flashActiveInput, setFlashActiveInput] = useState<boolean>(true);
  const [selectedFlashItemIds, setSelectedFlashItemIds] = useState<string[]>([]);
  const [flashSearchFilter, setFlashSearchFilter] = useState<string>('');
  const [flashSavedToast, setFlashSavedToast] = useState<string>('');
  const [, setRefresh] = useState(0);

  // Cegah polling menimpa pilihan admin yang sedang diedit
  const isDirtyRef = useRef(false);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  useEffect(() => {
    const syncFlashForm = () => {
      if (isDirtyRef.current) return;
      const config = getFlashBarterConfig();
      setFlashActiveInput(Boolean(config.is_active));
      setSelectedFlashItemIds(Array.isArray(config.item_ids) ? config.item_ids : []);
      const endMs = Date.parse(config.end_time);
      if (Number.isFinite(endMs) && endMs > Date.now()) {
        const remainingMin = Math.max(1, Math.round((endMs - Date.now()) / 60000));
        setFlashMinutesInput(String(remainingMin));
      }
    };

    syncFlashForm();
    window.addEventListener('rev-db-updated', syncFlashForm);
    return () => window.removeEventListener('rev-db-updated', syncFlashForm);
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
                className="min-h-[44px] w-full py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Masuk sebagai Admin
              </button>
            )}
            <button
              type="button"
              onClick={() => go('home')}
              className="min-h-[44px] w-full py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  const db = getDB();
  const items = getCatalogItems(db);
  const users = db.users || [];
  const orders: any[] =
    Array.isArray(db.orders) && db.orders.length > 0 ? db.orders : getOrders();
  const currentConfig = getFlashBarterConfig();

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Hapus barang ini dari marketplace?')) return;
    const latestDb = getDB();
    const updatedItems = (latestDb.items || []).filter((item) => item.id !== itemId);
    saveDB({ ...latestDb, items: updatedItems });
    setSelectedFlashItemIds((prev) => prev.filter((id) => id !== itemId));
    setRefresh((prev) => prev + 1);
  };

  const handleToggleVerifyUser = (userId: string) => {
    const latestDb = getDB();
    const updatedUsers = (latestDb.users || []).map((u) =>
      u.id === userId ? { ...u, is_verified: !u.is_verified } : u
    );
    saveDB({ ...latestDb, users: updatedUsers });
    setRefresh((prev) => prev + 1);
  };

  const toggleItemInFlashBarter = (itemId: string) => {
    isDirtyRef.current = true;
    setSelectedFlashItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSaveFlashBarter = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(10080, Number(flashMinutesInput) || 60));
    const endTimeIso = new Date(Date.now() + mins * 60 * 1000).toISOString();

    saveFlashBarterConfig({
      is_active: flashActiveInput,
      end_time: endTimeIso,
      item_ids: selectedFlashItemIds,
    });

    isDirtyRef.current = false;
    setFlashSavedToast(
      flashActiveInput
        ? `Flash Barter aktif selama ${mins} menit dengan ${selectedFlashItemIds.length} barang pilihan & tersinkron ke semua akun!`
        : 'Sesi Flash Barter dinonaktifkan.'
    );
    setRefresh((prev) => prev + 1);
    setTimeout(() => setFlashSavedToast(''), 4000);
  };

  const availableItemsForFlash = items.filter((item) => {
    if (isItemSold(item)) return false;
    if (!flashSearchFilter.trim()) return true;
    const q = flashSearchFilter.toLowerCase();
    const name = String(item.nama || item.title || '').toLowerCase();
    const cat = String(item.kategori || '').toLowerCase();
    return name.includes(q) || cat.includes(q);
  });

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
          Admin: {currentUser.nama || currentUser.email}
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
          { id: 'flash', label: `⚡ Flash Barter (${selectedFlashItemIds.length})` },
          { id: 'items', label: `Barang (${items.length})` },
          { id: 'users', label: `Pengguna (${users.length})` },
          { id: 'orders', label: `Transaksi (${orders.length})` },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 touch-manipulation ${
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

      {/* Konten Tab Pengaturan Flash Barter */}
      {activeTab === 'flash' && (
        <form
          onSubmit={handleSaveFlashBarter}
          className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pengaturan Sesi & Barang Flash Barter</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pengaturan disimpan ke server sehingga berlaku untuk semua akun dan tidak hilang saat refresh.
              </p>
            </div>
            {currentConfig?.end_time && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 self-start">
                Berakhir:{' '}
                {new Date(currentConfig.end_time).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          {flashSavedToast && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              ✓ {flashSavedToast}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer touch-manipulation">
              <input
                type="checkbox"
                checked={flashActiveInput}
                onChange={(e) => {
                  isDirtyRef.current = true;
                  setFlashActiveInput(e.target.checked);
                }}
                className="accent-emerald-700 w-4 h-4 shrink-0"
              />
              <div>
                <span className="text-xs font-bold text-gray-800 block">
                  Aktifkan Sesi Flash Barter di Beranda
                </span>
                <span className="text-[11px] text-gray-500">
                  Menampilkan strip hitung mundur & etalase pilihan di beranda semua pengguna
                </span>
              </div>
            </label>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Durasi Hitung Mundur (Menit)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={10080}
                  value={flashMinutesInput}
                  onChange={(e) => {
                    isDirtyRef.current = true;
                    setFlashMinutesInput(e.target.value);
                  }}
                  className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:border-emerald-600"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[30, 60, 120, 360].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => {
                        isDirtyRef.current = true;
                        setFlashMinutesInput(String(preset));
                      }}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 touch-manipulation"
                    >
                      {preset >= 60 ? `${preset / 60} Jam` : `${preset} Mnt`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pemilih Barang untuk dimasukkan ke Flash Barter */}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-gray-800">
                  Pilih Barang untuk Masuk Etalase Flash Barter ({selectedFlashItemIds.length} terpilih)
                </h3>
                <p className="text-[11px] text-gray-500">
                  Klik tombol di samping barang untuk memasukkan atau mengeluarkannya dari Flash Barter.
                </p>
              </div>
              <input
                type="text"
                value={flashSearchFilter}
                onChange={(e) => setFlashSearchFilter(e.target.value)}
                placeholder="Cari nama barang..."
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs w-full sm:w-56 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {availableItemsForFlash.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
                Tidak ada barang aktif yang cocok dengan pencarian.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                {availableItemsForFlash.map((item) => {
                  const isSelected = selectedFlashItemIds.includes(item.id);
                  const txType = String(item.transactionType || item.status || 'jual').toLowerCase();
                  const supportsBarter = txType === 'barter' || txType === 'keduanya';
                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? 'bg-emerald-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.foto || '/assets/seed-images/placeholder.svg'}
                          alt={item.nama}
                          className="w-11 h-11 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {item.nama || item.title}
                            </p>
                            {supportsBarter && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                                Barter
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {item.kategori} • Rp {parseSafePrice(item.harga ?? item.price).toLocaleString('id-ID')} • {item.lokasi}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleItemInFlashBarter(item.id)}
                        className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all touch-manipulation ${
                          isSelected
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isSelected ? '✓ Terpilih' : '+ Masukkan'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 touch-manipulation"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Simpan & Terbitkan ke Semua Akun
            </button>
          </div>
        </form>
      )}

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
                    src={item.foto || '/assets/seed-images/placeholder.svg'}
                    alt={item.nama || item.title}
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {item.nama || item.title || item.nama_barang}
                    </p>
                    <p className="text-xs text-gray-500">
                      Kategori: {item.kategori || '-'} • Rp{' '}
                      {parseSafePrice(item.harga ?? item.price ?? 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 shrink-0 touch-manipulation"
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
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{user.nama}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email || user.lokasi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVerifyUser(user.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 touch-manipulation ${
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
            orders.map((order) => {
              const title =
                order.itemTitle || order.itemName || order.nama_item || 'Transaksi Barang';
              const sellerObj = users.find(
                (u) => String(u.id) === String(order.sellerId || order.id_penjual)
              );
              const partnerName = order.sellerName || sellerObj?.nama || 'Mahasiswa UNNES';
              const orderType = String(order.type || 'beli').toUpperCase();

              return (
                <div key={order.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{title}</p>
                    <p className="text-xs text-gray-500">
                      Tipe: {orderType} • Mitra: {partnerName}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 shrink-0">
                    {order.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}