import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import OsmMapEmbed from '../components/OsmMapEmbed';
import {
  DEFAULT_LOCATION_ID,
  UNNES_LOCATIONS,
  findLocation,
  getGroupedLocations,
} from '../constants/locations';

interface MyItemsPageProps {
  onNavigate?: (page: string, params?: any) => void;
  onOpenAddItem?: () => void;
}

// 5 Kategori wajib sesuai PAKEM.md
const PAKEM_CATEGORIES = [
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
] as const;

const ITEM_CONDITIONS = [
  'Grade A',
  'Grade B',
  'Grade C',
  'Baru',
  'Bekas - Seperti Baru',
  'Bekas - Baik',
  'Bekas - Layak Pakai',
] as const;

// Parsing harga aman agar format ribuan bertitik ("150.000") tidak terpotong menjadi 150
function parsePriceValue(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) {
    return Math.max(0, Math.round(val));
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return 0;
    if (/^\d+\.\d{1,2}$/.test(trimmed)) {
      return Math.max(0, Math.round(Number(trimmed)));
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  }
  return 0;
}

function formatThousands(val: number): string {
  return val > 0 ? val.toLocaleString('id-ID') : '';
}

function resolveTransactionType(item: any): 'jual' | 'barter' | 'keduanya' {
  const raw = String(
    item.transactionType ||
      (['jual', 'barter', 'keduanya'].includes(item.status) ? item.status : '') ||
      item.jenis_transaksi ||
      item.tipe ||
      'jual'
  ).toLowerCase();

  if (
    raw === 'keduanya' ||
    (raw.includes('barter') && (raw.includes('jual') || raw.includes('buy')))
  ) {
    return 'keduanya';
  }
  if (raw.includes('barter')) return 'barter';
  return 'jual';
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

// Kompresi gambar ke JPEG max 800px agar payload base64 ringan untuk database JSONB
function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak valid.'));
      img.onload = () => {
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function MyItemsPage({ onNavigate, onOpenAddItem }: MyItemsPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'sold'>('all');
  const [, setRefresh] = useState(0);

  const groupedLocations = getGroupedLocations();
  const defaultLocationObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

  // State Modal Edit Barang
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<string>(PAKEM_CATEGORIES[0]);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editTxType, setEditTxType] = useState<'jual' | 'barter' | 'keduanya'>('jual');
  const [editCondition, setEditCondition] = useState<string>('Grade A');
  const [editLocationSelect, setEditLocationSelect] = useState<string>(defaultLocationObj.name);
  const [editCustomLocation, setEditCustomLocation] = useState('');
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editError, setEditError] = useState('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);

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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
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

  // Normalisasi pencocokan ID pemilik barang (mendukung field utama & alias)
  const myItems = allItems.filter((item: any) => {
    const ownerId =
      item.id_pemilik ?? item.id_user ?? item.ownerId ?? item.sellerId ?? item.userId ?? '';
    return String(ownerId) === currentUserId;
  });

  const filteredItems = myItems.filter((item: any) => {
    const sold = isItemSold(item);
    if (filterStatus === 'available') return !sold;
    if (filterStatus === 'sold') return sold;
    return true;
  });

  const persistDB = (updatedDB: any) => {
    dbService.saveDB(updatedDB);
    setRefresh((prev) => prev + 1);
  };

  const handleToggleItemStatus = (itemId: string) => {
    const updatedItems = allItems.map((item: any) => {
      if (String(item.id) !== String(itemId)) return item;
      const currentlySold = isItemSold(item);
      const txType = resolveTransactionType(item);

      if (currentlySold) {
        return {
          ...item,
          terjual: false,
          isSold: false,
          transactionType: txType,
          status: txType,
          updated_at: new Date().toISOString(),
        };
      }

      return {
        ...item,
        terjual: true,
        isSold: true,
        transactionType: txType,
        status: 'sold',
        updated_at: new Date().toISOString(),
      };
    });
    persistDB({ ...db, items: updatedItems });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Yakin ingin menghapus barang ini dari daftar?')) return;
    const updatedItems = allItems.filter((item: any) => String(item.id) !== String(itemId));
    persistDB({ ...db, items: updatedItems });
  };

  const openEditModal = (item: any) => {
    const title = item.nama || item.title || item.nama_barang || '';
    const rawCat = item.kategori || item.category || '';
    const matchedCat =
      PAKEM_CATEGORIES.find((c) => c.toLowerCase() === String(rawCat).toLowerCase()) ||
      PAKEM_CATEGORIES[0];
    const price = parsePriceValue(item.harga ?? item.price);
    const txType = resolveTransactionType(item);
    const condition = item.kondisi || item.condition || 'Grade A';
    const rawLoc = item.lokasi || item.location || defaultLocationObj.name;
    const matchedPreset = findLocation(rawLoc);

    setEditingItem(item);
    setEditTitle(title);
    setEditCategory(matchedCat);
    setEditPriceInput(formatThousands(price));
    setEditTxType(txType);
    setEditCondition(condition);

    if (matchedPreset) {
      setEditLocationSelect(matchedPreset.name);
      setEditCustomLocation('');
      setEditCoords(
        item.koordinat && typeof item.koordinat.lat === 'number'
          ? item.koordinat
          : { lat: matchedPreset.lat, lng: matchedPreset.lng }
      );
    } else {
      setEditLocationSelect('Lokasi Lainnya...');
      setEditCustomLocation(rawLoc === 'Lokasi Lainnya...' ? '' : rawLoc);
      setEditCoords(
        item.koordinat && typeof item.koordinat.lat === 'number'
          ? item.koordinat
          : { lat: defaultLocationObj.lat, lng: defaultLocationObj.lng }
      );
    }

    setEditDescription(item.deskripsi || item.description || '');
    setEditImage(item.foto || item.image || '/assets/seed-images/placeholder.svg');
    setEditError('');
  };

  const handleLocationSelectChange = (value: string) => {
    setEditLocationSelect(value);
    if (value === 'Lokasi Lainnya...') {
      if (!editCoords) {
        setEditCoords({ lat: defaultLocationObj.lat, lng: defaultLocationObj.lng });
      }
      return;
    }
    const preset = findLocation(value);
    if (preset) {
      setEditCoords({ lat: preset.lat, lng: preset.lng });
    }
  };

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setEditError('Browser tidak mendukung deteksi lokasi GPS.');
      return;
    }
    setEditError('');
    setIsLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setEditCoords({ lat, lng });
        setEditLocationSelect('Lokasi Lainnya...');
        if (!editCustomLocation.trim()) {
          setEditCustomLocation('Titik GPS Terkini (Sekitar UNNES)');
        }
        setIsLocatingGps(false);
      },
      () => {
        setEditError('Gagal mengambil koordinat GPS. Pastikan izin lokasi browser aktif.');
        setIsLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handlePriceInputChange = (rawVal: string) => {
    const numeric = parsePriceValue(rawVal);
    setEditPriceInput(formatThousands(numeric));
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditError('');
    setIsCompressingImage(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setEditImage(compressed);
    } catch (err: any) {
      setEditError(err?.message || 'Gagal memproses gambar.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const cleanTitle = editTitle.trim();
    if (!cleanTitle) {
      setEditError('Nama barang wajib diisi.');
      return;
    }

    const numericPrice = editTxType === 'barter' ? 0 : parsePriceValue(editPriceInput);
    if (editTxType !== 'barter' && numericPrice <= 0) {
      setEditError('Masukkan nominal harga yang valid untuk barang yang dijual.');
      return;
    }

    const finalLocation =
      editLocationSelect === 'Lokasi Lainnya...'
        ? editCustomLocation.trim() || 'Sekitar Kampus UNNES'
        : editLocationSelect;

    const presetMatch = findLocation(finalLocation);
    const finalCoords =
      editCoords ||
      (presetMatch
        ? { lat: presetMatch.lat, lng: presetMatch.lng }
        : { lat: defaultLocationObj.lat, lng: defaultLocationObj.lng });

    const currentlySold = isItemSold(editingItem);

    const updatedItems = allItems.map((item: any) => {
      if (String(item.id) !== String(editingItem.id)) return item;
      return {
        ...item,
        // Field utama sesuai PAKEM.md
        nama: cleanTitle,
        kategori: editCategory,
        harga: numericPrice,
        deskripsi: editDescription.trim(),
        kondisi: editCondition,
        lokasi: finalLocation,
        koordinat: finalCoords,
        foto: editImage || item.foto || item.image,
        status: currentlySold ? 'sold' : editTxType,
        terjual: currentlySold,
        updated_at: new Date().toISOString(),
        // Alias yang dipakai halaman lain (jangan dihapus)
        title: cleanTitle,
        nama_barang: cleanTitle,
        category: editCategory,
        price: numericPrice,
        description: editDescription.trim(),
        condition: editCondition,
        location: finalLocation,
        image: editImage || item.image || item.foto,
        transactionType: editTxType,
        isSold: currentlySold,
      };
    });

    persistDB({ ...db, items: updatedItems });
    setEditingItem(null);
  };

  const getTransactionLabel = (item: any) => {
    const txType = resolveTransactionType(item);
    if (txType === 'keduanya') {
      return {
        text: 'Dijual & Dibarter',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (txType === 'barter') {
      return {
        text: 'Bisa Dibarter',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return { text: 'Dijual', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  const hasCustomCondition =
    Boolean(editCondition) && !(ITEM_CONDITIONS as readonly string[]).includes(editCondition);

  const previewLocationLabel =
    editLocationSelect === 'Lokasi Lainnya...'
      ? editCustomLocation.trim() || 'Sekitar Kampus UNNES'
      : editLocationSelect;

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
            label: `Tersedia (${myItems.filter((i) => !isItemSold(i)).length})`,
          },
          {
            id: 'sold',
            label: `Selesai (${myItems.filter((i) => isItemSold(i)).length})`,
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 4v16m8-8H4"
              />
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
            const title = item.nama || item.title || item.nama_barang || 'Tanpa Judul';
            const price = parsePriceValue(item.harga ?? item.price);
            const image = item.foto || item.image || '/assets/seed-images/placeholder.svg';
            const category = item.kategori || item.category || 'Perlengkapan';
            const location = item.lokasi || item.location || 'Sekitar Kampus UNNES';
            const sold = isItemSold(item);
            const txBadge = getTransactionLabel(item);

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border shadow-sm flex flex-col justify-between gap-4 transition-opacity ${
                  sold ? 'border-gray-200 opacity-80' : 'border-gray-100'
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
                          sold
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-emerald-100/70 text-emerald-800'
                        }`}
                      >
                        {sold ? 'Terjual / Selesai' : 'Tersedia'}
                      </span>
                    </div>

                    <h3
                      onClick={() => go('product', { productId: item.id })}
                      className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {title}
                    </h3>
                    <p className="text-sm font-bold text-gray-800 mt-0.5 whitespace-nowrap">
                      {price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : 'Khusus Barter'}
                    </p>
                    <p
                      className="text-[11px] text-gray-500 mt-1 truncate"
                      title={`${category} • ${location}`}
                    >
                      {category} • 📍 {location}
                    </p>
                  </div>
                </div>

                {/* Tombol Aksi Barang */}
                <div className="flex items-center justify-between gap-1.5 pt-3 border-t border-gray-100 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => go('product', { productId: item.id })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleItemStatus(item.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      {sold ? 'Aktifkan Lagi' : 'Tandai Selesai'}
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100"
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

      {/* Modal Edit Barang */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setEditingItem(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Edit Barang</h2>
                <p className="text-[11px] text-gray-500">ID: {editingItem.id}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-sm font-bold"
                aria-label="Tutup modal edit"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {editError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                  {editError}
                </div>
              )}

              {/* Foto Barang */}
              <div className="flex items-center gap-4">
                <img
                  src={editImage || '/assets/seed-images/placeholder.svg'}
                  alt="Preview"
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 bg-gray-50 shrink-0"
                />
                <div className="flex-1 space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">Foto Barang</label>
                  <label className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                    {isCompressingImage ? 'Memproses gambar...' : 'Ganti Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      disabled={isCompressingImage}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-gray-400">
                    Otomatis dikompresi agar cepat dimuat.
                  </p>
                </div>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nama Barang *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Contoh: Kalkulus Purcell Edisi 9"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  required
                />
              </div>

              {/* Kategori & Kondisi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {PAKEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Kondisi Barang
                  </label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {hasCustomCondition && (
                      <option value={editCondition}>{editCondition}</option>
                    )}
                    {ITEM_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jenis Penawaran */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Jenis Penawaran *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'jual', label: 'Dijual' },
                    { id: 'barter', label: 'Barter' },
                    { id: 'keduanya', label: 'Jual & Barter' },
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setEditTxType(opt.id as any)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-colors ${
                        editTxType === opt.id
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Harga (Bebas Terpotong) */}
              {editTxType !== 'barter' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Harga (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPriceInput}
                      onChange={(e) => handlePriceInputChange(e.target.value)}
                      placeholder="150.000"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Tersimpan utuh: Rp {parsePriceValue(editPriceInput).toLocaleString('id-ID')}
                  </p>
                </div>
              )}

              {/* Lokasi COD Kampus + Pratinjau Peta OSM */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Titik Lokasi COD / Area Barang *
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentGps}
                    disabled={isLocatingGps}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline disabled:opacity-50"
                  >
                    {isLocatingGps ? 'Mendeteksi GPS...' : '🎯 Gunakan Lokasi GPS'}
                  </button>
                </div>

                <select
                  value={editLocationSelect}
                  onChange={(e) => handleLocationSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-emerald-600"
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
                  <option value="Lokasi Lainnya...">Lokasi Lainnya...</option>
                </select>

                {editLocationSelect === 'Lokasi Lainnya...' && (
                  <input
                    type="text"
                    value={editCustomLocation}
                    onChange={(e) => setEditCustomLocation(e.target.value)}
                    placeholder="Tulis detail lokasi COD (mis. Kos Wisma Melati Sekaran)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                  />
                )}

                <OsmMapEmbed
                  locationName={previewLocationLabel}
                  coordinates={editCoords}
                  height={160}
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Deskripsi Barang
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Jelaskan kondisi barang, kelengkapan, atau barang incaran jika barter..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Tombol Simpan / Batal */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCompressingImage}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}