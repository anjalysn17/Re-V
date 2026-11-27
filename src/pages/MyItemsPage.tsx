import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import {
  UNNES_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getGroupedLocations,
} from '../constants/locations';

interface MyItemsPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAddItem: () => void;
}

const CATEGORIES = [
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
];

const CONDITIONS = [
  'Grade A (Seperti Baru)',
  'Grade B (Baik)',
  'Grade C (Layak Pakai)',
];

function parseCleanPrice(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  if (typeof raw === 'string') {
    const digits = raw.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
}

function isItemSold(item: any): boolean {
  const status = String(item?.status || '').toLowerCase();
  return (
    item?.terjual === true ||
    item?.isSold === true ||
    status === 'sold' ||
    status === 'terjual' ||
    status === 'dibarter'
  );
}

export default function MyItemsPage({ onNavigate, onOpenAddItem }: MyItemsPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'sold'>('all');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [, setRefresh] = useState(0);

  // State form edit
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editCondition, setEditCondition] = useState(CONDITIONS[0]);
  const [editTxType, setEditTxType] = useState<'jual' | 'barter' | 'keduanya'>('keduanya');
  const [editLocation, setEditLocation] = useState(
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID)?.name || 'Gerbang Utama UNNES Sekaran'
  );
  const [editDescription, setEditDescription] = useState('');

  const groupedLocations = getGroupedLocations();

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];

  const myItems = useMemo(() => {
    if (!currentUser) return [];
    return allItems.filter((it) => {
      const ownerId = it.id_pemilik ?? it.id_user ?? it.sellerId ?? it.ownerId;
      return String(ownerId) === String(currentUser.id);
    });
  }, [allItems, currentUser]);

  const filteredItems = useMemo(() => {
    if (filterTab === 'active') return myItems.filter((it) => !isItemSold(it));
    if (filterTab === 'sold') return myItems.filter((it) => isItemSold(it));
    return myItems;
  }, [myItems, filterTab]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-4">
          <div
            className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white font-bold text-xl"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            📦
          </div>
          <h2 className="text-lg font-bold text-gray-900">Kelola Barang Kamu</h2>
          <p className="text-xs text-gray-500">
            Silakan masuk ke akun terlebih dahulu untuk melihat, mengedit, atau mengubah status barang yang kamu tawarkan.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="min-h-[44px] w-full py-3 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk Akun
          </button>
        </div>
      </div>
    );
  }

  const openEditModal = (item: any) => {
    const rawTx = String(item.transactionType || item.status || 'keduanya').toLowerCase();
    const resolvedTx: 'jual' | 'barter' | 'keduanya' =
      rawTx === 'jual' || rawTx === 'barter' || rawTx === 'keduanya' ? rawTx : 'keduanya';

    setEditingItem(item);
    setEditTitle(item.nama || item.title || item.nama_barang || '');
    setEditPrice(String(parseCleanPrice(item.harga ?? item.price ?? 0)));
    setEditCategory(item.kategori || item.category || CATEGORIES[0]);
    setEditCondition(item.kondisi || CONDITIONS[0]);
    setEditTxType(resolvedTx);
    setEditLocation(item.lokasi || item.location || 'Gerbang Utama UNNES Sekaran');
    setEditDescription(item.deskripsi || item.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editTitle.trim()) return;

    const numericPrice = editTxType === 'barter' ? 0 : Math.max(0, Number(editPrice) || 0);
    const latestDB = dbService.getDB() as any;

    const updatedItems = (latestDB.items || []).map((it: any) => {
      if (String(it.id) !== String(editingItem.id)) return it;
      const keepSold = isItemSold(it);
      return {
        ...it,
        nama: editTitle.trim(),
        title: editTitle.trim(),
        nama_barang: editTitle.trim(),
        harga: numericPrice,
        price: numericPrice,
        kategori: editCategory,
        category: editCategory,
        kondisi: editCondition,
        transactionType: editTxType,
        status: keepSold ? 'sold' : editTxType,
        lokasi: editLocation,
        location: editLocation,
        deskripsi: editDescription.trim(),
        description: editDescription.trim(),
      };
    });

    dbService.saveDB({ ...latestDB, items: updatedItems });
    setEditingItem(null);
    setRefresh((prev) => prev + 1);
    showToast('Perubahan barang berhasil disimpan.');
  };

  const handleToggleSoldStatus = (item: any) => {
    const currentlySold = isItemSold(item);
    const latestDB = dbService.getDB() as any;
    const fallbackType = item.transactionType || 'keduanya';

    const updatedItems = (latestDB.items || []).map((it: any) => {
      if (String(it.id) !== String(item.id)) return it;
      return {
        ...it,
        terjual: !currentlySold,
        isSold: !currentlySold,
        status: !currentlySold ? 'sold' : fallbackType,
      };
    });

    dbService.saveDB({ ...latestDB, items: updatedItems });
    setRefresh((prev) => prev + 1);
    showToast(
      !currentlySold
        ? 'Barang ditandai sebagai Terjual / Selesai.'
        : 'Barang diaktifkan kembali ke katalog.'
    );
  };

  const handleDeleteItem = (item: any) => {
    const title = item.nama || item.title || 'barang ini';
    if (!window.confirm(`Yakin ingin menghapus "${title}" secara permanen?`)) return;

    const latestDB = dbService.getDB() as any;
    const updatedItems = (latestDB.items || []).filter(
      (it: any) => String(it.id) !== String(item.id)
    );
    dbService.saveDB({ ...latestDB, items: updatedItems });
    setRefresh((prev) => prev + 1);
    showToast('Barang berhasil dihapus.');
  };

  const activeCount = myItems.filter((it) => !isItemSold(it)).length;
  const soldCount = myItems.filter((it) => isItemSold(it)).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 mb-1 inline-flex items-center gap-1 touch-manipulation"
          >
            <span>←</span> Kembali ke Profil
          </button>
          <h1 className="text-xl font-bold text-gray-900">Barang Saya ({myItems.length})</h1>
          <p className="text-xs text-gray-500">
            Kelola listing jual & barter milikmu di sekitar kampus
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddItem}
          className="min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm self-start sm:self-auto touch-manipulation"
          style={{ background: 'var(--color-accent, #D97706)' }}
        >
          + Tambah Barang Baru
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          ✓ {toastMsg}
        </div>
      )}

      {/* Filter Tab */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `Semua (${myItems.length})` },
          { id: 'active', label: `Aktif (${activeCount})` },
          { id: 'sold', label: `Terjual / Selesai (${soldCount})` },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 touch-manipulation ${
              filterTab === tab.id
                ? 'text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
            style={
              filterTab === tab.id ? { background: 'var(--color-primary, #567257)' } : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Daftar Barang */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm space-y-3">
          <p className="text-sm font-bold text-gray-800">
            {myItems.length === 0
              ? 'Kamu belum punya barang yang diposting'
              : 'Tidak ada barang di kategori filter ini'}
          </p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {myItems.length === 0
              ? 'Upload barang kos atau perlengkapan kuliah yang jarang dipakai untuk dijual atau dibarter.'
              : 'Coba pilih tab filter lain untuk melihat daftar barangmu.'}
          </p>
          {myItems.length === 0 && (
            <button
              type="button"
              onClick={onOpenAddItem}
              className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Upload Barang Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const sold = isItemSold(item);
            const price = parseCleanPrice(item.harga ?? item.price ?? 0);
            const title = item.nama || item.title || item.nama_barang || 'Tanpa Nama';
            const rawTx = String(item.transactionType || item.status || 'jual').toLowerCase();

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <img
                    src={item.foto || item.image || '/assets/seed-images/placeholder.svg'}
                    alt={title}
                    onClick={() => onNavigate('product', { productId: String(item.id) })}
                    className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0 cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
                    }}
                  />

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sold
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {sold ? 'Terjual / Selesai' : 'Aktif'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 capitalize">
                        {rawTx === 'sold' ? item.transactionType || 'Jual/Barter' : rawTx}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {item.kategori || 'Umum'}
                      </span>
                    </div>

                    <h3
                      onClick={() => onNavigate('product', { productId: String(item.id) })}
                      className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {title}
                    </h3>

                    <p
                      className="text-sm font-extrabold"
                      style={{ color: 'var(--color-accent, #D97706)' }}
                    >
                      {price === 0 && rawTx === 'barter'
                        ? 'Khusus Barter'
                        : `Rp ${price.toLocaleString('id-ID')}`}
                    </p>

                    <p className="text-[11px] text-gray-500 truncate">
                      Area COD: {item.lokasi || 'Kampus UNNES'}
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Item */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="min-h-[38px] flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleSoldStatus(item)}
                    className={`min-h-[38px] flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold touch-manipulation ${
                      sold
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {sold ? 'Aktifkan Lagi' : 'Tandai Terjual'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    className="min-h-[38px] px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 touch-manipulation"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edit Barang */}
      {editingItem && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditingItem(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 space-y-4 max-h-[90dvh] overflow-y-auto shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Detail Barang</h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 font-bold flex items-center justify-center touch-manipulation"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Penawaran</label>
                <select
                  value={editTxType}
                  onChange={(e) => setEditTxType(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                >
                  <option value="keduanya">Jual & Barter</option>
                  <option value="jual">Hanya Jual</option>
                  <option value="barter">Hanya Barter</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {editTxType === 'barter' ? 'Estimasi Nilai (Opsional)' : 'Harga (Rp)'}
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={editTxType === 'barter'}
                  value={editTxType === 'barter' ? 0 : editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs disabled:bg-gray-100 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kondisi Barang</label>
                <select
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Area COD Kampus</label>
              <select
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
              >
                {groupedLocations.map((group) => (
                  <optgroup key={group.zone} label={group.zone}>
                    {group.locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi</label>
              <textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Jelaskan kelengkapan, lama pemakaian, atau barang barter yang diinginkan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="min-h-[44px] flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 touch-manipulation"
              >
                Batal
              </button>
              <button
                type="submit"
                className="min-h-[44px] flex-1 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}