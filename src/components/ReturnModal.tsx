import { useState, useRef } from 'react';
import { APP_NAME } from '../constants/brand';

interface Props {
  onClose: () => void;
}

const reasons = [
  { id: 'hidden-defect', label: 'Cacat Fisik Tersembunyi', desc: 'Kerusakan yang tidak terlihat dalam foto/video iklan', icon: '🔍' },
  { id: 'different-item', label: 'Barang Berbeda / Tidak Sesuai', desc: 'Barang yang diterima berbeda dari deskripsi atau foto', icon: '📦' },
  { id: 'missing-parts', label: 'Kelengkapan Tidak Sesuai', desc: 'Ada aksesori atau komponen yang kurang', icon: '🧩' },
  { id: 'fraud', label: 'Dugaan Penipuan', desc: 'Penjual tidak dapat dihubungi atau tidak hadir COD', icon: '⚠️' },
];

const mediationPoints = [
  { name: 'Depan GSG UNNES', note: 'Tersedia jam 08.00–16.00', icon: '🏛️' },
  { name: 'Perpustakaan Pusat UNNES', note: 'Tersedia jam 07.30–17.00', icon: '📚' },
  { name: 'Kantor Wakil Rektor I', note: 'Dengan persetujuan pihak kampus', icon: '🏢' },
  { name: 'Security Post Gerbang Utama', note: 'Tersedia 24 jam', icon: '🛡️' },
];

export default function ({ onClose }: Props) {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [selectedMediation, setSelectedMediation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl text-center p-8"
          style={{ background: 'var(--color-card)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: '#4a8c5c' + '20' }}>
            ✅
          </div>
          <h3 className="text-xl font-black mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>
            Klaim Berhasil Dikirim!
          </h3>
          <p className="text-sm mb-2" style={{ color: 'var(--color-muted)' }}>
            Nomor Klaim: <span className="font-bold" style={{ color: 'var(--color-text)' }}>#RTR-2024-0892</span>
          </p>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
            Tim {APP_NAME} akan meninjau klaimmu dalam 1×24 jam. Kamu akan dihubungi melalui chat untuk jadwal mediasi di kampus.
          </p>
          <button onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-white"
            style={{ background: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-card)' }}>
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: '#c0392b' }}>
          <div>
            <h3 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-display)' }}>
              🛡️ Retur & Refund
            </h3>
            <p className="text-xs text-white/70 mt-0.5">Pengajuan Klaim Barang Tidak Sesuai</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        {/* Step indicator */}
        <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
          {['Pilih Alasan', 'Bukti Foto/Video', 'Lokasi Mediasi'].map((s, i) => (
            <div key={s} className="flex-1 flex items-center justify-center py-2.5 text-xs font-medium gap-1.5"
              style={{
                borderBottom: step === i + 1 ? '2px solid #c0392b' : '2px solid transparent',
                color: step === i + 1 ? '#c0392b' : 'var(--color-muted)',
                background: step > i + 1 ? '#f8f4ee' : 'transparent',
              }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: step >= i + 1 ? '#c0392b' : '#e5e7eb', color: step >= i + 1 ? 'white' : '#999' }}>
                {step > i + 1 ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        <div className="p-5">
          {/* Step 1: Reasons */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ background: '#f8f4ee', borderColor: 'var(--color-border)' }}>
                <img src="https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=80&h=80&fit=crop&auto=format"
                  alt="produk" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <p className="text-xs font-bold">Laptop Lenovo ThinkPad E14 Gen 3</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>Transaksi #TRX-2024-0441 · Rp 3.800.000</p>
                </div>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Pilih alasan pengajuan klaim:</p>
              <div className="space-y-2">
                {reasons.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReason(r.id)}
                    className="w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: selectedReason === r.id ? '#c0392b' : 'var(--color-border)',
                      background: selectedReason === r.id ? '#c0392b' + '0c' : '#f8f4ee',
                    }}>
                    <span className="text-xl shrink-0 mt-0.5">{r.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{r.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{r.desc}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all`}
                      style={{
                        borderColor: selectedReason === r.id ? '#c0392b' : '#ccc',
                        background: selectedReason === r.id ? '#c0392b' : 'transparent',
                      }}>
                      {selectedReason === r.id && <svg className="w-3 h-3 fill-white" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>}
                    </div>
                  </button>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text)' }}>Deskripsi masalah (opsional):</p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Ceritakan secara detail apa yang tidak sesuai..."
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={{ borderColor: 'var(--color-border)', background: '#f8f4ee', fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          )}

          {/* Step 2: Media Upload */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl p-3 text-sm" style={{ background: '#fef9e7', border: '1px solid #f59e0b40' }}>
                <p className="font-semibold text-amber-700">⚠️ Tips bukti yang valid:</p>
                <ul className="mt-1 text-xs text-amber-700/80 space-y-0.5 list-disc list-inside">
                  <li>Foto/video barang dari semua sisi</li>
                  <li>Foto close-up kerusakan/ketidaksesuaian</li>
                  <li>Video unboxing jika ada (sangat membantu)</li>
                  <li>Screenshot percakapan jika relevan</li>
                </ul>
              </div>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setSelectedMedia(files.map(f => URL.createObjectURL(f)));
                }} />
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-current"
                style={{ borderColor: selectedMedia.length > 0 ? '#c0392b' : 'var(--color-border)', background: '#f8f4ee' }}>
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  Klik untuk unggah foto/video bukti
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                  Format: JPG, PNG, MP4, MOV · Maks. 50MB per file · Maks. 10 file
                </p>
              </div>
              {selectedMedia.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {selectedMedia.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <img src={src} alt={`bukti ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSelectedMedia(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center text-2xl"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                    +
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {/* Placeholder uploaded images for demo */}
                  {[
                    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=120&h=120&fit=crop&auto=format',
                    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=120&h=120&fit=crop&auto=format',
                  ].map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border"
                      style={{ borderColor: 'var(--color-border)' }}>
                      <img src={src} alt={`bukti ${i + 1}`} className="w-full h-full object-cover opacity-70" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-white text-xs font-bold">Contoh</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Mediation location */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Pilih lokasi mediasi retur di dalam kampus. Tim {APP_NAME} akan hadir sebagai penengah.
              </p>
              <div className="space-y-2">
                {mediationPoints.map(pt => (
                  <button
                    key={pt.name}
                    onClick={() => setSelectedMediation(pt.name)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: selectedMediation === pt.name ? '#c0392b' : 'var(--color-border)',
                      background: selectedMediation === pt.name ? '#c0392b' + '0c' : '#f8f4ee',
                    }}>
                    <span className="text-xl shrink-0">{pt.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{pt.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{pt.note}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderColor: selectedMediation === pt.name ? '#c0392b' : '#ccc',
                        background: selectedMediation === pt.name ? '#c0392b' : 'transparent',
                      }}>
                      {selectedMediation === pt.name && <svg className="w-3 h-3 fill-white" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-3 rounded-xl text-xs" style={{ background: '#e8f4ea', border: '1px solid #4a8c5c30' }}>
                <p className="font-semibold" style={{ color: '#4a8c5c' }}>🛡️ Jaminan Proses Mediasi</p>
                <p className="mt-1" style={{ color: 'var(--color-text)' }}>
                  Uang/barang akan ditahan oleh sistem escrow {APP_NAME} hingga mediasi selesai. Keputusan mediator {APP_NAME} bersifat final dan mengikat.
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-2.5 mt-5">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 rounded-xl border font-bold text-sm transition-all hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)', fontFamily: 'var(--font-display)' }}>
                ← Kembali
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !selectedReason}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: '#c0392b', fontFamily: 'var(--font-display)' }}>
                Lanjut →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!selectedMediation}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: '#c0392b', fontFamily: 'var(--font-display)' }}>
                🛡️ Kirim Klaim Retur
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
