import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, saveDB } from '../services/db';
import { Item } from '../types/database';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
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

        // Isi background putih agar file transparan (PNG) tidak menghasilkan background hitam saat konversi ke JPEG
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

export default function AddItemModal({ isOpen, onClose, onItemAdded }: AddItemModalProps) {
  const { currentUser } = useAuth();

  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState(CATEGORIES[0]);
  const [harga, setHarga] = useState<number | string>('');
  const [kondisi, setKondisi] = useState(CONDITIONS[1]);
  const [foto, setFoto] = useState('/assets/seed-images/placeholder.svg');
  const [photoSource, setPhotoSource] = useState<'upload' | 'preset' | 'url'>('upload');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'jual' | 'barter' | 'keduanya'>('keduanya');
  const [lokasi, setLokasi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (currentUser?.lokasi) {
      setLokasi(currentUser.lokasi);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('File yang dipilih bukan gambar. Harap pilih file bertipe JPG, PNG, atau WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
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

    if (!nama.trim()) {
      setErrorMsg('Nama barang wajib diisi.');
      return;
    }

    if (!harga || Number(harga) <= 0) {
      setErrorMsg('Harga harus berupa angka yang valid.');
      return;
    }

    const db = getDB();
    const existingNums = db.items
      .map(i => parseInt(i.id.replace('ITM-', ''), 10))
      .filter(n => !isNaN(n));
    const nextNumber = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const newId = `ITM-${String(nextNumber).padStart(3, '0')}`;

    const newItem: Item = {
      id: newId,
      nama: nama.trim(),
      kategori: String(kategori).trim(),
      harga: Number(harga),
      kondisi,
      foto: foto.trim() || '/assets/seed-images/placeholder.svg',
      status,
      id_pemilik: currentUser.id,
      lokasi: lokasi.trim() || currentUser.lokasi || 'Sekaran, Gunungpati',
      deskripsi: deskripsi.trim() || 'Tidak ada deskripsi.',
    };

    // Tambahkan di awal agar langsung muncul paling atas
    db.items.unshift(newItem);
    saveDB(db);

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      onItemAdded?.();
      onClose();
      // Reset form
      setNama('');
      setHarga('');
      setKategori(CATEGORIES[0]);
      setDeskripsi('');
      setFoto('/assets/seed-images/placeholder.svg');
      setUploadedFileName('');
      setPhotoSource('upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 900);
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
              +
            </span>
            <h3 className="font-bold text-white text-base">Tambah Barang Baru</h3>
          </div>
          <button
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
            ✓ Barang baru berhasil ditambahkan ke listing!
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

          {/* Harga (Rupiah) & Lokasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Harga (Rp) <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-gray-500">Rp</span>
                <input
                  type="number"
                  value={harga}
                  onChange={e => setHarga(e.target.value)}
                  placeholder="350000"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Lokasi Kampus / Kos</label>
              <input
                type="text"
                value={lokasi}
                onChange={e => setLokasi(e.target.value)}
                placeholder="Contoh: Sekaran, Gunungpati"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all focus:border-[var(--color-primary)]"
                style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', color: 'var(--color-text)' }}
              />
            </div>
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
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
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

          {/* Foto Barang */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700">Foto Barang</label>
              <span className="text-[11px] text-gray-400">Pilih salah satu opsi</span>
            </div>

            {/* Tab Pemilih Opsi Foto */}
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
                  className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    photoSource === tab.id
                      ? 'border-[var(--color-primary)] bg-[#567257]/15 text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[#f8f4ee] text-gray-600 hover:bg-black/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Opsi 1: Upload dari Device */}
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

            {/* Opsi 2: Pilih Preset */}
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
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                        foto === p.url
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

            {/* Opsi 3: Masukkan URL */}
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

            {/* Preview Thumbnail */}
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
                      (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
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
                {foto !== '/assets/seed-images/placeholder.svg' && (
                  <button
                    type="button"
                    onClick={() => {
                      setFoto('/assets/seed-images/placeholder.svg');
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
              className="flex-1 py-2.5 rounded-xl border font-bold text-xs text-gray-600 hover:bg-black/5 transition-colors"
              style={{ borderColor: 'var(--color-border)' }}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: 'var(--color-accent)' }}
            >
              Pasang Iklan Sekarang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
