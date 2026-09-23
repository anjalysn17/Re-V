import { useAuth } from '../context/AuthContext';

interface AdminDashboardProps {
  onNavigate: (page: string) => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { currentUser, logout } = useAuth();

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-12">
      <div
        className="max-w-2xl mx-auto rounded-2xl border p-8 md:p-12 shadow-sm text-center space-y-6"
        style={{
          background: 'var(--color-card)',
          borderColor: 'var(--color-border)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {/* Badge Role Admin */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#567257]/15 text-[#567257]">
          <span className="w-2 h-2 rounded-full bg-[#567257]" />
          <span>Panel Administrator</span>
        </div>

        {/* Judul Utama yang Diminta */}
        <h1
          className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Dashboard Admin (belum dibuat)
        </h1>

        <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          Selamat datang, <span className="font-bold text-gray-800">{currentUser?.nama || 'Admin'}</span>. Halaman khusus administrasi ini sedang dipersiapkan dan siap dikembangkan lebih lanjut.
        </p>

        {/* Info Box Akun Admin */}
        <div
          className="p-4 rounded-xl border text-left flex items-center justify-between text-xs max-w-md mx-auto"
          style={{ borderColor: 'var(--color-border)', background: '#f8f4ee' }}
        >
          <div>
            <p className="font-bold text-gray-800">{currentUser?.nama} ({currentUser?.role})</p>
            <p className="text-gray-500 mt-0.5">{currentUser?.email}</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            Akses Penuh
          </span>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 rounded-xl border font-bold text-xs text-gray-700 hover:bg-black/5 transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            Lihat Beranda Publik
          </button>
          <button
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: 'var(--color-accent)' }}
          >
            Keluar / Logout
          </button>
        </div>
      </div>
    </div>
  );
}
