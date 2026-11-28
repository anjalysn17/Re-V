import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB, generateId, parseSafePrice } from '../services/db';
import { Item } from '../types/database';
import {
  UNNES_LOCATIONS,
  DEFAULT_LOCATION_ID,
  findLocation,
  getGroupedLocations,
} from '../constants/locations';

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

const PHOTO_PRESETS = [
  { label: 'Placeholder Netral', url: '/assets/seed-images/placeholder.svg' },
  { label: 'Elektronik', url: '/elektronik.jpg' },
  { label: 'Buku', url: '/bukk.jpg' },
  { label: 'Fashion', url: '/bajuu.jpg' },
  { label: 'Perlengkapan', url: '/perlengkapan.jpg' },
];

const DEFAULT_PLACEHOLDER = '/assets/seed-images/placeholder.svg';

function formatRibuan(val: string | number | undefined): string {
  const num = parseSafePrice(val);
  if (!num) return '';
  return num.toLocaleString('id-ID');
}

function normalizeConditionOption(rawCondition?: string): string {
  const trimmed = (rawCondition || '').trim();
  if (!trimmed) return CONDITIONS[1];
  if (CONDITIONS.includes(trimmed)) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower === 'baru' || lower.includes('new')) return CONDITIONS[0];
  if (lower.includes('grade a') || lower.includes('seperti baru')) return CONDITIONS[1];
  if (lower.includes('grade b') || lower.includes('layak pakai')) return CONDITIONS[2];
  if (lower.includes('grade c') || lower.includes('cacat')) return CONDITIONS[3];
  return trimmed;
}

function compressImage(file: File, maxWidth = 800, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File yang dipilih bukan gambar. Harap pilih file gambar (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
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
          resolve(canvas.toDataURL('image/jpeg', quality));
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

  const groupedLocations = getGroupedLocations();
  const defaultLocObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

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
  const [selectedPresetLocation, setSelectedPresetLocation] = useState<string>(defaultLocObj.name);
  const [customLocation, setCustomLocation] = useState('');

  const [deskripsi, setDeskripsi] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
      const initialPrice = parseSafePrice(
        editItem.harga ?? (extendedItem.price as number | undefined)
      );
      const initialFoto = editItem.foto || DEFAULT_PLACEHOLDER;

      const rawOffer = String(extendedItem.transactionType || editItem.status || 'keduanya');
      const validOffer: 'jual' | 'barter' | 'keduanya' =
        rawOffer === 'jual' || rawOffer === 'barter' || rawOffer === 'keduanya'
          ? rawOffer
          : 'keduanya';

      const initialLoc = (editItem.lokasi || currentUser?.lokasi || defaultLocObj.name).trim();
      const matchedPreset = findLocation(initialLoc);

      setNama(initialName);
      setKategori(CATEGORIES.includes(editItem.kategori) ? editItem.kategori : CATEGORIES[0]);
      setHargaDisplay(formatRibuan(initialPrice));
      setKondisi(normalizeConditionOption(editItem.kondisi));
      setFoto(initialFoto);
      setStatus(validOffer);
      setDeskripsi(editItem.deskripsi || '');

      if (matchedPreset) {
        setSelectedPresetLocation(matchedPreset.name);
        setCustomLocation('');
      } else {
        setSelectedPresetLocation('CUSTOM');
        setCustomLocation(initialLoc);
      }

      if (initialFoto.startsWith('data:')) {
        setPhotoSource('upload');
        setUploadedFileName('Foto tersimpan');
      } else if (PHOTO_PRESETS.some((p) => p.url === initialFoto)) {
        setPhotoSource('preset');
      } else {
        setPhotoSource('url');
      }
    } else {
      const defaultLoc = (currentUser?.lokasi || defaultLocObj.name).trim();
      const matchedDefault = findLocation(defaultLoc);

      setNama('');
      setKategori(CATEGORIES[0]);
      setHargaDisplay('');
      setKondisi(CONDITIONS[1]);
      setFoto(DEFAULT_PLACEHOLDER);
      setPhotoSource('upload');
      setStatus('keduanya');
      setDeskripsi('');

      if (matchedDefault) {
        setSelectedPresetLocation(matchedDefault.name);
        setCustomLocation('');
      } else {
        setSelectedPresetLocation('CUSTOM');
        setCustomLocation(defaultLoc);
      }
    }
  }, [isOpen, editItem, currentUser, defaultLocObj.name]);

  if (!isOpen) return null;

  const activeLocationLabel =
    selectedPresetLocation === 'CUSTOM'
      ? customLocation.trim() || currentUser?.lokasi || defaultLocObj.name
      : selectedPresetLocation;

  const hasCustomCondition = Boolean(kondisi) && !CONDITIONS.includes(kondisi);

  const handleHargaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const trimmedDigits = rawDigits.slice(0, 12);
    setHargaDisplay(formatRibuan(trimmedDigits));
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
      const compressedBase64 = await compressImage(file, 800, 0.78);
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

    const numericHarga = parseSafePrice(hargaDisplay);
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

      const idx = db.items.findIndex((item) => item.id === editItem.id);
      if (idx === -1) {
        setErrorMsg('Data barang tidak ditemukan. Silakan muat ulang halaman.');
        return;
      }

      const existing = db.items[idx] as Item & Record<string, unknown>;
      const isAlreadySold = Boolean(
        existing.terjual || (existing.status as string) === 'sold'
      );

      const { koordinat: _dropCoords, ...restExisting } = existing;

      const updatedItem: Item & Record<string, unknown> = {
        ...restExisting,
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
        status,
        transactionType: status,
        terjual: isAlreadySold,
        lokasi: resolvedLocation,
        deskripsi: cleanDeskripsi,
      };

      db.items[idx] = updatedItem as Item;
      saveDB(db);

      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onItemUpdated?.();
        onClose();
      }, 650);
      return;
    }

    const newId = generateId('ITM');

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
      terjual: false,
      id_pemilik: currentUser.id,
      id_user: currentUser.id,
      ownerId: currentUser.id,
      lokasi: resolvedLocation,
      deskripsi: cleanDeskripsi,
    };

    db.items.unshift(newItem as Item);
    saveDB(db);

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onItemAdded?.();
      onClose();
    }, 650);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEditMode ? 'Edit Barang' : 'Tambah Barang Baru'}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[88dvh]"
        style={{
          background: 'var(--color-card, #fffdf8)',
          borderColor: 'var(--color-border, #d4c8b5)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          className="px-5 sm:px-6 py-4 flex items-center justify-between border-b shrink-0"
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
            aria-label="Tutup modal"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10 touch-manipulation cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showToast && (
          <div
            className="mx-4 mt-4 p-3 rounded-xl text-xs font-bold text-white text-center shadow shrink-0"
            style={{ background: 'var(--color-success, #4a8c5c)' }}
          >
            {isEditMode
              ? '✓ Perubahan barang berhasil disimpan!'
              : '✓ Barang baru berhasil ditambahkan ke listing!'}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto overscroll-contain pb-24 sm:pb-6"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nama Barang <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="Contoh: Laptop Lenovo ThinkPad E14 Gen 3"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer touch-manipulation"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              >
                {CATEGORIES.map((cat) => (
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
                onChange={(e) => setKondisi(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer touch-manipulation"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              >
                {hasCustomCondition && <option value={kondisi}>{kondisi}</option>}
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-semibold outline-none transition-all focus:border-[var(--color-primary)]"
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

          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">Area COD Kampus / Kos</label>
            <select
              value={selectedPresetLocation}
              onChange={(e) => setSelectedPresetLocation(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)] cursor-pointer touch-manipulation"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
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
              <option value="CUSTOM">Area Lainnya (Ketik Nama Area Umum...)</option>
            </select>

            {selectedPresetLocation === 'CUSTOM' && (
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="Contoh: Sekaran Raya / Patemon Gunungpati"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
            )}
            <p className="text-[11px] text-gray-500">
              Demi privasi, hanya nama area umum yang ditampilkan publik. Titik temu presisi dapat diatur bersama di ruang chat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tipe Penawaran</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'jual', label: 'Jual Saja' },
                { id: 'barter', label: 'Barter Saja' },
                { id: 'keduanya', label: 'Jual & Barter' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setStatus(opt.id as 'jual' | 'barter' | 'keduanya')}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer touch-manipulation ${
                    status === opt.id
                      ? 'border-[var(--color-primary)] bg-[#567257]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setPhotoSource(tab.id as 'upload' | 'preset' | 'url')}
                  className={`min-h-[42px] py-1.5 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer touch-manipulation ${
                    photoSource === tab.id
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
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:bg-black/5 text-center touch-manipulation"
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
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {PHOTO_PRESETS.map((p, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => {
                      setFoto(p.url);
                      setUploadedFileName('');
                    }}
                    className={`min-h-[40px] px-3 py-2 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer touch-manipulation ${
                      foto === p.url
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-bold'
                        : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {photoSource === 'url' && (
              <input
                type="text"
                value={foto.startsWith('data:') ? '' : foto}
                onChange={(e) => {
                  setFoto(e.target.value);
                  setUploadedFileName('');
                }}
                placeholder="URL gambar (contoh: https://... atau /assets/...)"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs outline-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
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
                    onError={(e) => {
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
                    className="min-h-[38px] text-xs text-red-500 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 cursor-pointer touch-manipulation"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi Barang</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              placeholder="Jelaskan kondisi barang, kelengkapan, alasan barter/jual, dll..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none transition-all focus:border-[var(--color-primary)]"
              style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 py-2.5 rounded-xl border font-bold text-xs text-gray-600 hover:bg-black/5 transition-colors cursor-pointer touch-manipulation"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="min-h-[44px] flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer touch-manipulation"
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