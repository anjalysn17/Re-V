import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB } from '../services/db';
import { Item } from '../types/database';
import OsmMapEmbed, {
  MapCoordinates,
  resolveLocationCoordinates,
} from './OsmMapEmbed';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
  editItem?: Item | null;
  onItemUpdated?: () => void;
}

const CATEGORIES = [
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
];

const CONDITIONS = [
  'Baru',
  'Grade A (Seperti Baru)',
  'Grade B (Bekas Layak Pakai)',
  'Grade C (Bekas dengan Cacat Minor)',
];

export const CAMPUS_LOCATIONS = [
  'Sekaran - Gerbang Utama UNNES',
  'Perpustakaan Pusat / Rektorat UNNES',
  'Fakultas Teknik (FT)',
  'Fakultas MIPA (FMIPA)',
  'Fakultas Ilmu Pendidikan (FIP)',
  'Fakultas Bahasa & Seni (FBS)',
  'Fakultas Ilmu Sosial (FIS)',
  'Fakultas Ekonomi & Bisnis (FEB)',
  'Fakultas Ilmu Keolahragaan (FIK)',
  'Fakultas Hukum (FH)',
  'Patemon, Gunungpati',
  'Banaran, Gunungpati',
  'Kalisegoro, Gunungpati',
  'Ngijo, Gunungpati',
];

const PHOTO_PRESETS = [
  { label: 'Placeholder Netral', url: '/assets/seed-images/placeholder.svg' },
  { label: 'Elektronik', url: '/elektronik.jpg' },
  { label: 'Buku', url: '/bukk.jpg' },
  { label: 'Fashion', url: '/bajuu.jpg' },
  { label: 'Perlengkapan', url: '/perlengkapan.jpg' },
];

const DEFAULT_PLACEHOLDER = '/assets/seed-images/placeholder.svg';

/**
 * Mengambil hanya digit angka agar nilai harga tidak pernah terpotong oleh titik/koma.
 */
function parseHarga(val: string | number | undefined): number {
  const digits = String(val ?? '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

/**
 * Memformat angka ke format ribuan Indonesia (contoh: 350000 -> "350.000").
 */
function formatRibuan(val: string | number | undefined): string {
  const num = parseHarga(val);
  if (!num) return '';
  return num.toLocaleString('id-ID');
}

/**
 * Kompres dan resize gambar ke lebar maksimal (default 800px) menggunakan Canvas,
 * lalu kembalikan string base64 data URL untuk disimpan secara hemat di localStorage.
 */
function compressImage(file: File, maxWidth = 800, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar. Harap pilih file gambar (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('Gagal membaca data file gambar.'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => reject(new Error('File gambar tidak valid atau rusak.'));
      img.src = result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file dari perangkat.'));
    reader.readAsDataURL(file);
  });
}

export default function AddItemModal({
  isOpen,
  onClose,
  onItemAdded,
  editItem = null,
  onItemUpdated,
}: AddItemModalProps) {
  const { currentUser } = useAuth();
  const isEditMode = Boolean(editItem);

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState(CATEGORIES[0]);
  const [hargaDisplay, setHargaDisplay] = useState('');
  const [kondisi, setKondisi] = useState(CONDITIONS[1]);
  const [foto, setFoto] = useState(DEFAULT_PLACEHOLDER);
  const [photoSource, setPhotoSource] = useState<'upload' | 'preset' | 'url'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<'jual' | 'barter' | 'keduanya'>('keduanya');
  const [selectedPresetLocation, setSelectedPresetLocation] = useState<string>(CAMPUS_LOCATIONS[0]);
  const [customLocation, setCustomLocation] = useState('');
  const [gpsCoords, setGpsCoords] = useState<MapCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [deskripsi, setDeskripsi] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg('');
    setShowToast(false);
    setUploadedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (editItem) {
      const extendedItem = editItem as Item & Record<string, unknown>;
      const initialName = String(
        editItem.nama || extendedItem.title || extendedItem.nama_barang || ''
      );
      const initialPrice = parseHarga(editItem.harga ?? (extendedItem.price as number | undefined));
      const initialFoto = editItem.foto || DEFAULT_PLACEHOLDER;

      const rawOffer = String(extendedItem.transactionType || editItem.status || 'keduanya');
      const validOffer: 'jual' | 'barter' | 'keduanya' =
        rawOffer === 'jual' || rawOffer === 'barter' || rawOffer === 'keduanya'
          ? rawOffer
          : 'keduanya';

      const initialLoc = (editItem.lokasi || currentUser?.lokasi || CAMPUS_LOCATIONS[0]).trim();
      const isKnownLocation = CAMPUS_LOCATIONS.includes(initialLoc);
      const existingCoords = (extendedItem.koordinat as MapCoordinates | undefined) || null;

      setNama(initialName);
      setKategori(CATEGORIES.includes(editItem.kategori) ? editItem.kategori : CATEGORIES[0]);
      setHargaDisplay(formatRibuan(initialPrice));
      setKondisi(CONDITIONS.includes(editItem.kondisi) ? editItem.kondisi : CONDITIONS[1]);
      setFoto(initialFoto);
      setStatus(validOffer);
      setDeskripsi(editItem.deskripsi || '');
      setGpsCoords(existingCoords);

      if (isKnownLocation) {
        setSelectedPresetLocation(initialLoc);
        setCustomLocation('');
      } else {
        setSelectedPresetLocation('CUSTOM');
        setCustomLocation(initialLoc);
      }

      if (initialFoto.startsWith('data:')) {
        setPhotoSource('upload');
        setUploadedFileName('Foto tersimpan');
      } else if (PHOTO_PRESETS.some(p => p.url === initialFoto)) {
        setPhotoSource('preset');
      } else {
        setPhotoSource('url');
      }
    } else {
      const defaultLoc = (currentUser?.lokasi || CAMPUS_LOCATIONS[0]).trim();
      const isKnownDefault = CAMPUS_LOCATIONS.includes(defaultLoc);

      setNama('');
      setKategori(CATEGORIES[0]);
      setHargaDisplay('');
      setKondisi(CONDITIONS[1]);
      setFoto(DEFAULT_PLACEHOLDER);
      setPhotoSource('upload');
      setStatus('keduanya');
      setDeskripsi('');
      setGpsCoords(null);

      if (isKnownDefault) {
        setSelectedPresetLocation(defaultLoc);
        setCustomLocation('');
      } else {
        setSelectedPresetLocation('CUSTOM');
        setCustomLocation(defaultLoc);
      }
    }
  }, [isOpen, editItem, currentUser]);

  if (!isOpen) return null;

  const activeLocationLabel =
    selectedPresetLocation === 'CUSTOM'
      ? customLocation.trim() || currentUser?.lokasi || CAMPUS_LOCATIONS[0]
      : selectedPresetLocation;

  const previewCoords = resolveLocationCoordinates(
    activeLocationLabel,
    gpsCoords
  );

  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const trimmedDigits = rawDigits.slice(0, 12);
    setHargaDisplay(formatRibuan(trimmedDigits));
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Browser Anda tidak mendukung deteksi lokasi GPS.');
      return;
    }

    setErrorMsg('');
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = Number(pos.coords.latitude.toFixed(5));
        const lng = Number(pos.coords.longitude.toFixed(5));
        setGpsCoords({ lat, lng });
        setSelectedPresetLocation('CUSTOM');
        setCustomLocation(`Area Kampus UNNES (${lat}, ${lng})`);
        setIsLocating(false);
      },
      () => {
        setErrorMsg('Gagal mengakses lokasi GPS. Pastikan izin lokasi browser aktif atau pilih titik COD dari daftar.');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File yang dipilih bukan gambar. Harap pilih file bertipe JPG, PNG, atau WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg('Ukuran file foto melebihi 2 MB. Harap pilih gambar yang lebih kecil.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsCompressing(true);
    try {
      const compressedBase64 = await compressImage(file, 800, 0.8);
      setFoto(compressedBase64);
      setUploadedFileName(file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memproses foto.';
      setErrorMsg(message);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentUser) {
      setErrorMsg('Anda harus login terlebih dahulu.');
      return;
    }

    const cleanNama = nama.trim();
    if (!cleanNama) {
      setErrorMsg('Nama barang wajib diisi.');
      return;
    }

    const numericHarga = parseHarga(hargaDisplay);
    if (!numericHarga || numericHarga <= 0) {
      setErrorMsg('Harga harus berupa angka lebih dari 0.');
      return;
    }

    const resolvedLocation = activeLocationLabel;
    const cleanFoto = foto.trim() || DEFAULT_PLACEHOLDER;
    const cleanDeskripsi = deskripsi.trim() || 'Tidak ada deskripsi.';
    const db = getDB();

    if (isEditMode && editItem) {
      if (editItem.id_pemilik !== currentUser.id && currentUser.role !== 'admin') {
        setErrorMsg('Anda tidak memiliki izin untuk mengubah barang ini.');
        return;
      }

      const idx = db.items.findIndex(item => item.id === editItem.id);
      if (idx === -1) {
        setErrorMsg('Data barang tidak ditemukan. Silakan muat ulang halaman.');
        return;
      }

      const existing = db.items[idx] as Item & Record<string, unknown>;
      const preservedStatus =
        (existing.status as string) === 'sold' ? ('sold' as Item['status']) : status;

      const updatedItem: Item & Record<string, unknown> = {
        ...existing,
        id: editItem.id,
        id_pemilik: editItem.id_pemilik,
        id_user: editItem.id_pemilik,
        ownerId: editItem.id_pemilik,
        nama: cleanNama,
        title: cleanNama,
        nama_barang: cleanNama,
        kategori: String(kategori).trim(),
        harga: numericHarga,
        price: numericHarga,
        kondisi,
        foto: cleanFoto,
        status: preservedStatus,
        transactionType: status,
        lokasi: resolvedLocation,
        koordinat: previewCoords,
        deskripsi: cleanDeskripsi,
      };

      db.items[idx] = updatedItem as Item;
      saveDB(db);

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onItemUpdated?.();
        onClose();
      }, 750);
      return;
    }

    const existingNums = db.items
      .map(i => parseInt(i.id.replace('ITM-', ''), 10))
      .filter(n => !isNaN(n));
    const nextNumber = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newId = `ITM-${String(nextNumber).padStart(3, '0')}`;

    const newItem: Item & Record<string, unknown> = {
      id: newId,
      nama: cleanNama,
      title: cleanNama,
      nama_barang: cleanNama,
      kategori: String(kategori).trim(),
      harga: numericHarga,
      price: numericHarga,
      kondisi,
      foto: cleanFoto,
      status,
      transactionType: status,
      id_pemilik: currentUser.id,
      id_user: currentUser.id,
      ownerId: currentUser.id,
      lokasi: resolvedLocation,
      koordinat: previewCoords,
      deskripsi: cleanDeskripsi,
    };

    db.items.unshift(newItem as Item);
    saveDB(db);

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onItemAdded?.();
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: 'var(--color-card, #fffdf8)',
          borderColor: 'var(--color-border, #d4c8b5)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Header Modal */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-primary)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm"
              style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}
            >
              {isEditMode ? '✎' : '+'}
            </span>
            <h3 className="font-bold text-white text-base">
              {isEditMode ? 'Edit Barang' : 'Tambah Barang Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toast Notifikasi Sukses */}
        {showToast && (
          <div
            className="m-4 p-3 rounded-xl text-xs font-bold text-white text-center shadow animate-in fade-in"
            style={{ background: 'var(--color-success, #4a8c5c)' }}
          >
            {isEditMode
              ? '✓ Perubahan barang berhasil disimpan!'
              : '✓ Barang baru berhasil ditambahkan ke listing!'}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Contoh: Laptop Lenovo ThinkPad E14 Gen 3"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              required
            />
          </div>

          {/* Kategori & Kondisi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={e => setKategori(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kondisi / Grade</label>
              <select
                value={kondisi}
                onChange={e => setKondisi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              >
                {CONDITIONS.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Harga (Rupiah) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Harga Estimasi / Jual (Rp) <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs font-bold text-gray-500">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={hargaDisplay}
                onChange={handleHargaChange}
                placeholder="350.000"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                required
              />
            </div>
            {hargaDisplay && (
              <p className="text-[11px] text-gray-500 mt-1">
                Nilai tersimpan: <span className="font-bold text-gray-700">Rp {hargaDisplay}</span>
              </p>
            )}
          </div>

          {/* Lokasi Titik COD Kampus / Kos + OpenStreetMap Embed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">Titik COD Kampus / Kos</label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isLocating}
                className="text-[11px] font-bold text-[var(--color-primary)] hover:underline cursor-pointer disabled:opacity-50"
              >
                {isLocating ? 'Mendeteksi GPS...' : '📍 Gunakan Lokasi Saat Ini'}
              </button>
            </div>
            <select
              value={selectedPresetLocation}
              onChange={e => {
                setSelectedPresetLocation(e.target.value);
                setGpsCoords(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
            >
              {CAMPUS_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
              <option value="CUSTOM">Lokasi Lainnya (Ketik Manual...)</option>
            </select>

            {selectedPresetLocation === 'CUSTOM' && (
              <input
                type="text"
                value={customLocation}
                onChange={e => {
                  setCustomLocation(e.target.value);
                  setGpsCoords(null);
                }}
                placeholder="Masukkan nama kos, gedung, atau titik COD..."
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
            )}

            {/* Pratinjau OpenStreetMap Embed */}
            <OsmMapEmbed
              locationName={activeLocationLabel}
              coordinates={gpsCoords}
              height={150}
            />
          </div>

          {/* Status Jual / Barter */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipe Penawaran</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'jual', label: 'Jual Saja' },
                { id: 'barter', label: 'Barter Saja' },
                { id: 'keduanya', label: 'Jual & Barter' },
              ].map(opt => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setStatus(opt.id as 'jual' | 'barter' | 'keduanya')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${status === opt.id
                    ? 'border-[var(--color-primary)] bg-[#567257]/15 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Foto Barang */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">Foto Barang</label>
              <span className="text-[11px] text-gray-400">Pilih salah satu opsi</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {[
                { id: 'upload', label: 'Upload File' },
                { id: 'preset', label: 'Pilih Preset' },
                { id: 'url', label: 'Input URL' },
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setPhotoSource(tab.id as 'upload' | 'preset' | 'url')}
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${photoSource === tab.id
                    ? 'border-[var(--color-primary)] bg-[#567257]/15 text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {photoSource === 'upload' && (
              <div>
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-black/5 text-center"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {isCompressing ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-800">
                      {isCompressing ? 'Sedang memproses & kompres foto...' : 'Pilih Foto dari Perangkat'}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">Format: JPG, PNG, WebP (Maksimal 2 MB)</p>
                  </div>
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isCompressing}
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}

            {photoSource === 'preset' && (
              <div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {PHOTO_PRESETS.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setFoto(p.url);
                        setUploadedFileName('');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${foto === p.url
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold'
                        : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {photoSource === 'url' && (
              <div>
                <input
                  type="text"
                  value={foto.startsWith('data:') ? '' : foto}
                  onChange={e => {
                    setFoto(e.target.value);
                    setUploadedFileName('');
                  }}
                  placeholder="URL gambar (contoh: https://... atau /assets/...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                />
              </div>
            )}

            {foto && (
              <div
                className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl border"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee' }}
              >
                <div
                  className="w-12 h-12 rounded-lg overflow-hidden border bg-white shrink-0 flex items-center justify-center"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <img
                    src={foto}
                    alt="Preview Foto"
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = DEFAULT_PLACEHOLDER;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#567257]/15 text-[var(--color-primary)]">
                      Preview Foto
                    </span>
                    {uploadedFileName && (
                      <span className="text-xs text-gray-700 truncate font-semibold">
                        {uploadedFileName}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5 font-mono">
                    {foto.startsWith('data:')
                      ? 'Tersimpan dari file perangkat (Data URL terkompresi)'
                      : foto}
                  </p>
                </div>
                {foto !== DEFAULT_PLACEHOLDER && (
                  <button
                    type="button"
                    onClick={() => {
                      setFoto(DEFAULT_PLACEHOLDER);
                      setUploadedFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi Barang</label>
            <textarea
              value={deskripsi}
              onChange={e => setDeskripsi(e.target.value)}
              placeholder="Jelaskan kondisi barang, kelengkapan, alasan barter/jual, dll..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none transition-all focus:border-[var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
            />
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border font-bold text-xs text-gray-600 hover:bg-black/5 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
              style={{ background: 'var(--color-accent)' }}
            >
              {isEditMode ? 'Simpan Perubahan' : 'Pasang Iklan Sekarang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}