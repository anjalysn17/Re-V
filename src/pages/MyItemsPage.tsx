import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';

interface MyItemsPageProps {
  onNavigate?: (page: string, params?: any) => void;
  onOpenAddItem?: () => void;
}

export default function MyItemsPage({ onNavigate, onOpenAddItem }: MyItemsPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [, setRefresh] = useState(0);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  // Proteksi jika pengguna belum login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Kelola Barang Saya</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masuk ke akunmu terlebih dahulu untuk melihat dan mengelola barang yang kamu pasang untuk dijual atau dibarter.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk / Daftar Sekarang
          </button>
        </div>
      </div>
    );
  }

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];
  const currentUserId = String(currentUser.id);

  // Normalisasi pencocokan ID pemilik barang (mendukung berbagai variasi properti schema)
  const myItems = allItems.filter((item: any) => {
    const ownerId = item.id_user ?? item.sellerId ?? item.ownerId ?? item.userId ?? '';
    return String(ownerId) === currentUserId;
  });

  const filteredItems = myItems.filter((item: any) => {
    const isSold = item.status === 'sold' || item.status === 'terjual' || item.status === 'dibarter';
    if (filterStatus === 'available') return !isSold;
    if (filterStatus === 'sold') return isSold;
    return true;
  });

  const persistDB = (updatedDB: any) => {
    if (typeof (dbService as any).saveDB === 'function') {
      (dbService as any).saveDB(updatedDB);
    } else {
      localStorage.setItem('rev_db', JSON.stringify(updatedDB));
    }
    setRefresh((prev) => prev + 1);
  };

  const handleToggleItemStatus = (itemId: string) => {
    const updatedItems = allItems.map((item: any) => {
      if (String(item.id) !== String(itemId)) return item;
      const isCurrentlySold =
        item.status === 'sold' || item.status === 'terjual' || item.status === 'dibarter';
      return {
        ...item,
        status: isCurrentlySold ? 'available' : 'sold',
      };
    });
    persistDB({ ...db, items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Yakin ingin menghapus barang ini dari daftar?')) return;
    const updatedItems = allItems.filter((item: any) => String(item.id) !== String(itemId));
    persistDB({ ...db, items: updatedItems });
  };

  const getTransactionLabel = (item: any) => {
    const mode = String(item.transactionType || item.jenis_transaksi || item.tipe || 'jual_barter').toLowerCase();
    if (mode.includes('barter') && (mode.includes('jual') || mode.includes('buy'))) {
      return { text: 'Dijual & Dibarter', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (mode.includes('barter')) {
      return { text: 'Bisa Dibarter', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { text: 'Dijual', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Barang Saya</h1>
          <p className="text-xs text-gray-500">
            Total {myItems.length} barang terdaftar pada akun {currentUser.nama || currentUser.name}
          </p>
        </div>

        <button
          onClick={() => onOpenAddItem && onOpenAddItem()}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 flex items-center justify-center gap-1.5 self-start sm:self-auto"
          style={{ background: 'var(--color-primary, #567257)' }}
        >
          <span>+</span> Tambah Barang Baru
        </button>
      </div>

      {/* Filter Status */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl self-start w-fit">
        {[
          { id: 'all', label: `Semua (${myItems.length})` },
          {
            id: 'available',
            label: `Tersedia (${myItems.filter((i) => !['sold', 'terjual', 'dibarter'].includes(i.status)).length})`,
          },
          {
            id: 'sold',
            label: `Selesai (${myItems.filter((i) => ['sold', 'terjual', 'dibarter'].includes(i.status)).length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Daftar Barang */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {myItems.length === 0 ? 'Belum Ada Barang Dipasang' : 'Tidak Ada Barang di Filter Ini'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            {myItems.length === 0
              ? 'Punya buku kuliah, peralatan kos, atau elektronik nganggur? Pasang sekarang agar bisa dibeli atau dibarter mahasiswa sekitar UNNES.'
              : 'Coba pilih tab filter status lainnya untuk melihat barangmu.'}
          </p>
          {myItems.length === 0 && (
            <button
              onClick={() => onOpenAddItem && onOpenAddItem()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              + Pasang Barang Pertamamu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map((item: any) => {
            const title = item.title || item.nama_barang || 'Tanpa Judul';
            const price = Number(item.price || item.harga || 0);
            const image = item.image || item.foto || '/assets/seed-images/placeholder.svg';
            const category = item.category || item.kategori || 'Umum';
            const location = item.location || item.lokasi || 'Sekitar Kampus UNNES';
            const isSold =
              item.status === 'sold' || item.status === 'terjual' || item.status === 'dibarter';
            const txBadge = getTransactionLabel(item);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col justify-between gap-4 transition-opacity ${
                  isSold ? 'border-gray-200 opacity-75' : 'border-gray-100'
                }`}
              >
                <div className="flex gap-3.5">
                  <img
                    src={image}
                    alt={title}
                    onClick={() => go('product', { productId: item.id })}
                    className="w-20 h-20 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${txBadge.badgeClass}`}
                      >
                        {txBadge.text}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSold
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-emerald-100/70 text-emerald-800'
                        }`}
                      >
                        {isSold ? 'Terjual / Selesai' : 'Tersedia'}
                      </span>
                    </div>

                    <h3
                      onClick={() => go('product', { productId: item.id })}
                      className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {title}
                    </h3>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : 'Khusus Barter'}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1 truncate">
                      {category} • 📍 {location}
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Barang */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => go('product', { productId: item.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Detail
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleItemStatus(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      {isSold ? 'Aktifkan Lagi' : 'Tandai Selesai'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}