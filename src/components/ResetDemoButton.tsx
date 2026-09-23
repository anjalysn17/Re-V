import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ResetDemoButton() {
  const { resetDemoData } = useAuth();
  const [showToast, setShowToast] = useState(false);

  const handleReset = () => {
    resetDemoData();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      window.location.reload();
    }, 800);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {showToast && (
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg animate-in fade-in slide-in-from-bottom-2"
          style={{ background: 'var(--color-success, #4a8c5c)' }}
        >
          ✓ Data demo direset ke awal!
        </div>
      )}
      <button
        onClick={handleReset}
        title="Hapus data localStorage dan isi ulang seed data awal"
        className="px-3 py-1.5 rounded-full border shadow-sm text-xs font-semibold transition-all hover:shadow hover:opacity-90 active:scale-95 flex items-center gap-1.5"
        style={{
          background: 'var(--color-card, #fffdf8)',
          borderColor: 'var(--color-border, #d4c8b5)',
          color: 'var(--color-muted, #8b7355)',
        }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>Reset Data Demo</span>
      </button>
    </div>
  );
}
