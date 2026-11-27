import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { pushNotification } from '../services/db';
import { APP_NAME } from '../constants/brand';

interface Props {
  onClose: () => void;
  orderId?: string;
  itemName?: string;
  sellerId?: string;
}

const reasons = [
  { id: 'hidden-defect', label: 'Cacat Fisik Tersembunyi', desc: 'Kerusakan yang tidak terlihat dalam foto/video iklan', icon: '🔍' },
  { id: 'different-item', label: 'Barang Berbeda / Tidak Sesuai', desc: 'Barang yang diterima berbeda dari deskripsi atau foto', icon: '📦' },
  { id: 'missing-parts', label: 'Kelengkapan Tidak Sesuai', desc: 'Ada aksesori atau komponen yang kurang', icon: '🧩' },
  { id: 'no-show', label: 'Kendala Jadwal / Titik COD', desc: 'Pihak lawan tidak hadir di titik COD sesuai kesepakatan', icon: '⚠️' },
];

const mediationPoints = [
  { name: 'Depan GSG UNNES', note: 'Tersedia jam 08.00–16.00', icon: '🏛️' },
  { name: 'Perpustakaan Pusat UNNES', note: 'Tersedia jam 07.30–17.00', icon: '📚' },
  { name: 'Security Post Gerbang Utama', note: 'Area terbuka & ramai 24 jam', icon: '🛡️' },
];

export default function ReturnModal({ onClose, orderId, itemName, sellerId }: Props) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedMediation, setSelectedMediation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = () => {
    const reasonLabel = reasons.find((r) => r.id === selectedReason)?.label || selectedReason;
    if (sellerId && currentUser) {
      pushNotification({
        userId: sellerId,
        tipe: 'order',
        teks: `${currentUser.nama} mengajukan peninjauan COD (${reasonLabel}) untuk ${itemName || 'pesanan'} di ${selectedMediation}.`,
        link_page: 'orders',
      });
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl text-center p-7"
          style={{ background: 'var(--color-card)' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: '#4a8c5c20' }}
          >
            ✅
          </div>
          <h3
            className="text-xl font-black mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}
          >
            Pengajuan Mediasi Terkirim
          </h3>
          {orderId && (
            <p className="text-xs mb-2 font-mono text-gray-500">
              Referensi Pesanan: {orderId}
            </p>
          )}
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
            Laporan ketidaksesuaian telah diteruskan. Silakan koordinasikan pertemuan ulang di titik aman{' '}
            <strong>{selectedMediation}</strong> melalui ruang chat {APP_NAME}.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full py-3 rounded-xl font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-card)' }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: '#c0392b' }}
        >
          <div>
            <h3 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
              Ajukan Peninjauan / Mediasi COD
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              {itemName || 'Laporan Ketidaksesuaian Barang'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl leading-none p-2 touch-manipulation"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {['Pilih Alasan', 'Bukti Foto', 'Titik Mediasi'].map((s, i) => (
            <div
              key={s}
              className="flex-1 flex items-center justify-center py-2.5 text-xs font-medium gap-1.5"
              style={{
                borderBottom: step === i + 1 ? '2px solid #c0392b' : '2px solid transparent',
                color: step === i + 1 ? '#c0392b' : 'var(--color-muted)',
                background: step > i + 1 ? '#f8f4ee' : 'transparent',
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{
                  background: step >= i + 1 ? '#c0392b' : '#e5e7eb',
                  color: step >= i + 1 ? 'white' : '#999',
                }}
              >
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        <div className="p-5 max-h-[80dvh] overflow-y-auto overscroll-contain pb-24 sm:pb-6">
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                Pilih alasan pengajuan:
              </p>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all touch-manipulation"
                    style={{
                      borderColor: selectedReason === r.id ? '#c0392b' : 'var(--color-border)',
                      background: selectedReason === r.id ? '#c0392b0c' : '#f8f4ee',
                    }}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{r.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
                        {r.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Deskripsi masalah (opsional):
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan secara detail bagian yang tidak sesuai..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: '#f8f4ee',
                    fontFamily: 'var(--font-body)',
                    color: 'var(--color-text)',
                  }}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedMedia(files.map((f) => URL.createObjectURL(f)));
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-current touch-manipulation"
                style={{
                  borderColor: selectedMedia.length > 0 ? '#c0392b' : 'var(--color-border)',
                  background: '#f8f4ee',
                }}
              >
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Ketuk untuk unggah foto bukti
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Format: JPG, PNG, WebP
                </p>
              </button>
              {selectedMedia.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {selectedMedia.map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-xl overflow-hidden border"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <img src={src} alt={`bukti ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setSelectedMedia((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-xs flex items-center justify-center touch-manipulation"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Pilih titik aman kampus untuk pengecekan ulang / penukaran barang secara langsung:
              </p>
              <div className="space-y-2">
                {mediationPoints.map((pt) => (
                  <button
                    type="button"
                    key={pt.name}
                    onClick={() => setSelectedMediation(pt.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all touch-manipulation"
                    style={{
                      borderColor: selectedMediation === pt.name ? '#c0392b' : 'var(--color-border)',
                      background: selectedMediation === pt.name ? '#c0392b0c' : '#f8f4ee',
                    }}
                  >
                    <span className="text-xl shrink-0">{pt.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{pt.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {pt.note}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2.5 mt-5">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="min-h-[44px] flex-1 py-3 rounded-xl border font-bold text-sm transition-all hover:opacity-80 touch-manipulation"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-muted)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                ← Kembali
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedReason}
                className="min-h-[44px] flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40 touch-manipulation"
                style={{ background: '#c0392b', fontFamily: 'var(--font-display)' }}
              >
                Lanjut →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedMediation}
                className="min-h-[44px] flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40 touch-manipulation"
                style={{ background: '#c0392b', fontFamily: 'var(--font-display)' }}
              >
                Kirim Pengajuan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}