import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB } from '../services/db';

interface HeaderProps {
  activePage: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAddItem: () => void;
  cartCount?: number;
}

// Rekomendasi kata kunci pencarian populer untuk mahasiswa UNNES
const popularSearches = [
  'Laptop Lenovo',
  'Buku Kalkulus',
  'Meja Lipat',
  'Kalkulator',
  'Kamera Canon',
  'Botol Minum',
  'Tas Ransel',
  'Gitar Akustik',
];

export default function Header({ activePage, onNavigate, onOpenAddItem, cartCount }: HeaderProps) {
  const { currentUser, openAuthModal, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifications = getDB().notifications;
  const unreadCount = notifications.filter(n => !n.sudah_dibaca).length;

  const computedCartCount = cartCount !== undefined
    ? cartCount
    : (currentUser ? (getDB().cart || []).filter(c => c.id_user === currentUser.id).length : 0);

  const handlePerformSearch = (customQuery?: string) => {
    const inputEl = document.querySelector('header input[type="text"]') as HTMLInputElement | null;
    const inputVal = inputEl ? inputEl.value : '';
    const q = (customQuery !== undefined ? customQuery : (search || inputVal || '')).trim();
    if (!q) return;
    onNavigate('search', { searchQuery: q });
  };

  return (
    <header className="sticky top-0 z-50 shadow-md" style={{ background: 'var(--color-primary)' }}>
      {/* Top bar */}
      <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo  */}
        <button
          onClick={() => onNavigate('home')}
          title="Re:V Beranda"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-black shadow-sm shrink-0 hover:opacity-90 transition-transform active:scale-95"
          style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}
        >
          R
        </button>

        {/* Tombol Beranda  */}
        <button
          onClick={() => onNavigate('home')}
          title="Beranda"
          className="text-white hover:opacity-85 transition-all p-2 rounded-xl shrink-0 flex items-center justify-center"
          style={{
            background: activePage === 'home' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </button>

        {/* Search Bar - Otomatis Melebar & Proporsional ke Kiri */}
        <div className="flex-1 relative">
          <div className="flex rounded-xl overflow-hidden shadow-sm">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePerformSearch();
                }
              }}
              placeholder="Cari barang, buku, elektronik, atau tawarkan barter..."
              className="w-full px-4 py-2.5 text-sm outline-none"
              style={{ background: '#fffdf8', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            />
            <button
              onClick={() => handlePerformSearch()}
              className="px-6 py-2.5 text-white font-semibold text-sm transition-opacity hover:opacity-90 shrink-0 cursor-pointer"
              style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
            >
              Cari
            </button>
          </div>
        </div>

        {/* Smart Barter Button */}
        <button
          onClick={() => onNavigate('barter')}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0 shadow-sm"
          style={{
            background: activePage === 'barter' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <span>Smart Barter</span>
        </button>

        {/* Tombol Tambah Barang Baru */}
        <button
          onClick={() => {
            if (!currentUser) {
              openAuthModal('login');
            } else {
              onOpenAddItem();
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shrink-0 shadow-sm"
          style={{
            background: 'var(--color-accent)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Tambah Barang</span>
        </button>

        {/* Right Icons: Keranjang, Notifikasi, Profil */}
        <div className="flex items-center gap-3.5 shrink-0 pl-1">
          {/* Cart */}
          <button
            onClick={() => onNavigate('cart')}
            className="relative text-white flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-[10px] opacity-80">Keranjang</span>
            {computedCartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {computedCartCount}
              </span>
            )}
          </button>

          {/* Notification */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="text-white flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="text-[10px] opacity-80">Notifikasi</span>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 top-12 w-80 rounded-xl shadow-xl border z-50 overflow-hidden"
                style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
              >
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                  <span className="font-bold text-xs text-gray-900">Notifikasi</span>
                  <span className="text-[10px] text-gray-400 font-medium cursor-pointer hover:underline">Tandai dibaca</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 flex items-start gap-2.5 hover:bg-black/5 cursor-pointer transition-colors ${
                        !n.sudah_dibaca ? 'bg-[#567257]/5' : ''
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background:
                            n.tipe === 'barter' ? '#e07b3915' : n.tipe === 'chat' ? '#56725715' : '#4a8c5c15',
                          color:
                            n.tipe === 'barter' ? 'var(--color-accent)' : n.tipe === 'chat' ? 'var(--color-primary)' : '#4a8c5c',
                        }}
                      >
                        {n.tipe === 'barter' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        )}
                        {n.tipe === 'chat' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        )}
                        {n.tipe === 'success' && (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-800 leading-snug">{n.teks}</p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{n.waktu}</span>
                      </div>
                      {!n.sudah_dibaca && <span className="w-1.5 h-1.5 rounded-full bg-[#e07b39] shrink-0 mt-1" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Conditional Auth Slot: Belum login -> Tombol Masuk, Sudah login -> Foto Profil + Nama */}
          {!currentUser ? (
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 shrink-0"
              style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
            >
              Masuk
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/60 bg-white/20 shrink-0">
                  <img
                    src={currentUser.foto_profil}
                    alt={currentUser.nama}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs font-semibold text-white max-w-[110px] truncate hidden sm:inline">
                  {currentUser.nama.split(' ')[0]}
                </span>
                <svg className="w-3 h-3 text-white/80 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-11 w-56 rounded-xl shadow-xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', fontFamily: 'var(--font-body)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-xs font-bold text-gray-900 truncate">{currentUser.nama}</p>
                    <p className="text-[10px] text-gray-500 truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#567257]/15 text-[#567257]">
                      {currentUser.lokasi}
                    </span>
                  </div>
                  <div className="py-1 text-xs text-gray-700 divide-y divide-gray-100">
                    <div>
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full px-4 py-2 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profil Saya</span>
                      </button>
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full px-4 py-2 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>Pesanan Saya</span>
                      </button>
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('my-items');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Barang Saya</span>
                      </button>
                      <button
                        onClick={() => setProfileOpen(false)}
                        className="w-full px-4 py-2 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Barter Saya</span>
                      </button>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Keluar / Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Baris Bawah: Rekomendasi Pencarian Produk Populer + Chat */}
      <div
        className="border-t"
        style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'var(--color-primary-dark, #3e5540)' }}
      >
        <div className="max-w-screen-xl mx-auto px-4 py-1.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[11px] text-white/60 font-medium whitespace-nowrap hidden sm:inline">
              Populer:
            </span>
            {popularSearches.map(item => (
              <button
                key={item}
                onClick={() => {
                  setSearch(item);
                  handlePerformSearch(item);
                }}
                className="px-3 py-1 rounded-full text-xs font-normal text-white/90 whitespace-nowrap transition-all hover:bg-white/20 hover:text-white cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Tombol Chat & Negosiasi */}
          <div className="shrink-0">
            <button
              onClick={() => onNavigate('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shadow-sm"
              style={{
                background: activePage === 'chat' ? '#c8682a' : 'var(--color-accent)',
                color: 'white',
                fontFamily: 'var(--font-body)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 3H3c-1.1 0-2 .9-2 2v14l4-4h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                />
              </svg>
              <span>Chat</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}