import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDB, markNotificationsRead } from '../services/db';
import { Notification, PageName } from '../types/database';
import { APP_NAME, APP_LOGO_LETTER } from '../constants/brand';
import { NavigateFunction } from '../App';

interface HeaderProps {
  activePage: string;
  onNavigate: NavigateFunction;
  onOpenAddItem: () => void;
  cartCount?: number;
}

const VALID_PAGES: PageName[] = [
  'home',
  'product',
  'barter',
  'chat',
  'admin',
  'my-items',
  'category',
  'search',
  'cart',
  'profile',
  'orders',
  'info',
];

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

function formatNotifTime(waktu?: string): string {
  if (!waktu) return 'Baru saja';
  const parsed = Date.parse(waktu);
  if (Number.isNaN(parsed)) return waktu;
  const diffSec = Math.max(0, Math.floor((Date.now() - parsed) / 1000));
  if (diffSec < 60) return 'Baru saja';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} mnt lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
  return new Date(parsed).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export default function Header({ activePage, onNavigate, onOpenAddItem, cartCount }: HeaderProps) {
  const { currentUser, openAuthModal, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [, setDbTick] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const desktopNotifRef = useRef<HTMLDivElement>(null);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarError(false);
  }, [currentUser?.foto_profil]);

  useEffect(() => {
    const bump = () => setDbTick((n) => n + 1);
    window.addEventListener('rev-db-updated', bump);
    return () => window.removeEventListener('rev-db-updated', bump);
  }, []);

  useEffect(() => {
    if (!notifOpen && !profileOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      const insideDesktopNotif = desktopNotifRef.current?.contains(target);
      const insideMobileNotif = mobileNotifRef.current?.contains(target);
      const insideProfile = profileRef.current?.contains(target);

      if (notifOpen && !insideDesktopNotif && !insideMobileNotif) {
        setNotifOpen(false);
      }
      if (profileOpen && !insideProfile) {
        setProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notifOpen, profileOpen]);

  const db = getDB();
  const userNotifications = currentUser
    ? (db.notifications || []).filter((n) => String(n.id_user) === String(currentUser.id))
    : [];
  const unreadCount = userNotifications.filter((n) => !n.sudah_dibaca).length;

  const computedCartCount =
    cartCount !== undefined
      ? cartCount
      : currentUser
      ? (db.cart || []).filter((c) => String(c.id_user) === String(currentUser.id)).length
      : 0;

  const handlePerformSearch = (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : search).trim();
    if (!q) return;
    setNotifOpen(false);
    setProfileOpen(false);
    setSearch('');
    searchInputRef.current?.blur();
    onNavigate('search', { searchQuery: q });
  };

  const handleNotificationClick = (n: Notification) => {
    if (currentUser) {
      markNotificationsRead(currentUser.id, n.id);
    }
    setNotifOpen(false);

    const rawPage = String(n.targetPage || n.link_page || '');
    const targetId = n.targetId || n.target_id;
    const notifType = String(n.tipe);

    if (rawPage === 'chat' || notifType === 'chat' || notifType === 'barter') {
      onNavigate('chat', targetId ? { conversationId: targetId } : undefined);
    } else if (rawPage === 'orders' || notifType === 'order' || notifType === 'success') {
      onNavigate('orders');
    } else if (rawPage === 'product' && targetId) {
      onNavigate('product', { productId: targetId });
    } else if (VALID_PAGES.includes(rawPage as PageName)) {
      onNavigate(rawPage as PageName);
    } else {
      onNavigate('home');
    }
  };

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    markNotificationsRead(currentUser.id);
  };

  const renderUserAvatar = (sizeClass = 'w-7 h-7') => {
    if (!currentUser) return null;
    const initial = (currentUser.nama || 'U').trim().charAt(0).toUpperCase();
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-white/60 bg-white/20 shrink-0 flex items-center justify-center`}>
        {currentUser.foto_profil && !avatarError ? (
          <img
            src={currentUser.foto_profil}
            alt={currentUser.nama}
            onError={() => setAvatarError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white">{initial}</span>
        )}
      </div>
    );
  };

  const renderNotificationDropdown = (alignClass = 'right-0') => (
    <div
      role="dialog"
      aria-label="Daftar Notifikasi"
      className={`absolute ${alignClass} top-11 w-80 max-w-[90vw] rounded-xl shadow-2xl border z-50 overflow-hidden`}
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span className="font-bold text-xs text-gray-900">
          Notifikasi {unreadCount > 0 ? `(${unreadCount})` : ''}
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[11px] text-[var(--color-primary)] font-semibold hover:underline touch-manipulation"
          >
            Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto overscroll-contain">
        {!currentUser ? (
          <div className="p-5 text-center text-xs text-gray-500">
            Masuk terlebih dahulu untuk melihat notifikasi chat dan pesanan.
          </div>
        ) : userNotifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            Belum ada notifikasi baru. Aktivitas chat, tawaran barter, dan status pesanan akan muncul di sini.
          </div>
        ) : (
          userNotifications.map((n) => {
            const notifType = String(n.tipe);
            return (
              <button
                type="button"
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-left p-3 flex items-start gap-2.5 hover:bg-black/5 active:bg-black/10 transition-colors touch-manipulation ${
                  !n.sudah_dibaca ? 'bg-[#567257]/10' : ''
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{
                    background:
                      notifType === 'barter'
                        ? '#e07b3915'
                        : notifType === 'chat'
                        ? '#56725715'
                        : '#4a8c5c15',
                    color:
                      notifType === 'barter'
                        ? 'var(--color-accent)'
                        : notifType === 'chat'
                        ? 'var(--color-primary)'
                        : '#4a8c5c',
                  }}
                >
                  {notifType === 'barter' && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                  {notifType === 'chat' && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  )}
                  {(notifType === 'success' || notifType === 'order') && (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-800 leading-snug">{n.teks}</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">{formatNotifTime(n.waktu)}</span>
                </div>
                {!n.sudah_dibaca && <span className="w-2 h-2 rounded-full bg-[#e07b39] shrink-0 mt-1.5" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 shadow-md" style={{ background: 'var(--color-primary)' }}>
      {/* Top bar */}
      <div className="max-w-screen-xl mx-auto px-2.5 sm:px-4 py-2.5 sm:py-3 flex items-center gap-1.5 sm:gap-3">
        {/* Logo */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          title={`${APP_NAME} Beranda`}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl font-black shadow-sm shrink-0 hover:opacity-90 transition-transform active:scale-95 touch-manipulation"
          style={{ background: 'var(--color-bg)', color: 'var(--color-primary)' }}
        >
          {APP_LOGO_LETTER}
        </button>

        {/* Tombol Beranda Desktop */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          title="Beranda"
          className="hidden md:flex text-white hover:opacity-85 transition-all p-2.5 rounded-xl shrink-0 items-center justify-center touch-manipulation"
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

        {/* Search Bar */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex rounded-xl overflow-hidden shadow-sm">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePerformSearch();
                }
              }}
              placeholder="Cari barang, buku, elektronik..."
              className="w-full min-w-0 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm outline-none"
              style={{ background: '#fffdf8', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
            />
            <button
              type="button"
              onClick={() => handlePerformSearch()}
              className="px-2.5 sm:px-6 py-2 sm:py-2.5 text-white font-semibold text-xs sm:text-sm transition-opacity hover:opacity-90 shrink-0 cursor-pointer touch-manipulation"
              style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
            >
              Cari
            </button>
          </div>
        </div>

        {/* Pintasan Mobile: Keranjang, Notifikasi, Profil/Masuk */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label="Keranjang"
            className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 touch-manipulation"
            style={{ background: 'rgba(255, 255, 255, 0.14)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {computedCartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow"
                style={{ background: 'var(--color-accent)', color: 'white' }}
              >
                {computedCartCount}
              </span>
            )}
          </button>

          <div className="relative" ref={mobileNotifRef}>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setNotifOpen((prev) => !prev);
              }}
              aria-label="Notifikasi"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all active:scale-95 touch-manipulation"
              style={{
                background: notifOpen ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.14)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && renderNotificationDropdown('-right-10')}
          </div>

          {!currentUser ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="h-9 px-2.5 rounded-xl text-[11px] font-bold text-white shadow-sm active:scale-95 touch-manipulation"
              style={{ background: 'var(--color-accent)' }}
            >
              Masuk
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(currentUser.role === 'admin' ? 'admin' : 'profile')}
              aria-label="Profil Saya"
              className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 touch-manipulation"
              style={{ background: 'rgba(255, 255, 255, 0.14)' }}
            >
              {renderUserAvatar('w-6 h-6')}
            </button>
          )}
        </div>

        {/* Smart Barter Button Desktop */}
        <button
          type="button"
          onClick={() => onNavigate('barter')}
          className="hidden md:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 shrink-0 shadow-sm touch-manipulation"
          style={{
            background: activePage === 'barter' ? 'var(--color-accent)' : 'rgba(255, 255, 255, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <span>Smart Barter</span>
        </button>

        {/* Tombol Tambah Barang Baru Desktop */}
        <button
          type="button"
          onClick={() => {
            if (!currentUser) {
              openAuthModal('login');
            } else {
              onOpenAddItem();
            }
          }}
          className="hidden md:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shrink-0 shadow-sm touch-manipulation"
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

        {/* Right Icons Desktop: Keranjang, Notifikasi, Profil */}
        <div className="hidden md:flex items-center gap-3.5 shrink-0 pl-1">
          {/* Cart */}
          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="relative text-white flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer touch-manipulation"
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

          {/* Notification Desktop */}
          <div className="relative" ref={desktopNotifRef}>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setNotifOpen((prev) => !prev);
              }}
              className="text-white flex flex-col items-center gap-0.5 hover:opacity-80 transition-opacity cursor-pointer touch-manipulation"
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
                  className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && renderNotificationDropdown('right-0')}
          </div>

          {/* Conditional Auth Slot */}
          {!currentUser ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 shrink-0 touch-manipulation"
              style={{ background: 'var(--color-accent)', fontFamily: 'var(--font-body)' }}
            >
              Masuk
            </button>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(false);
                  setProfileOpen((prev) => !prev);
                }}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity focus:outline-none cursor-pointer touch-manipulation"
              >
                {renderUserAvatar('w-7 h-7')}
                <span className="text-xs font-semibold text-white max-w-[110px] truncate hidden sm:inline">
                  {currentUser.nama.split(' ')[0]}
                </span>
                <svg className="w-3 h-3 text-white/80 hidden sm:inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-11 w-56 rounded-xl shadow-xl border z-50 overflow-hidden"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', fontFamily: 'var(--font-body)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{currentUser.nama}</p>
                      {currentUser.is_verified && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{currentUser.email}</p>
                    {currentUser.lokasi && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-[#567257]/15 text-[#567257]">
                        {currentUser.lokasi}
                      </span>
                    )}
                  </div>
                  <div className="py-1 text-xs text-gray-700 divide-y divide-gray-100">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profil Saya</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('orders');
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>Pesanan Saya</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('my-items');
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span>Barang Saya</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('barter');
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-black/5 flex items-center gap-2 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Barter Saya</span>
                      </button>
                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            onNavigate('admin');
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-amber-50 text-amber-800 font-semibold flex items-center gap-2 transition-colors"
                        >
                          <span>⚡ Panel Admin & Flash Barter</span>
                        </button>
                      )}
                    </div>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                          onNavigate('home');
                        }}
                        className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-semibold transition-colors"
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
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="text-[11px] text-white/60 font-medium whitespace-nowrap hidden sm:inline">
              Populer:
            </span>
            {popularSearches.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => handlePerformSearch(item)}
                className="px-3 py-1 rounded-full text-xs font-normal text-white/90 whitespace-nowrap transition-all hover:bg-white/20 hover:text-white cursor-pointer touch-manipulation"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 shadow-sm touch-manipulation min-h-[34px]"
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