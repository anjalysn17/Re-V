import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notifyLocalChange } from '../services/api';
import OsmMapEmbed from '../components/OsmMapEmbed';

export interface OrderRecord {
  id: string;
  userId: string; // ID pembeli / pengaju barter
  sellerId?: string;
  sellerName: string;
  itemTitle: string;
  itemImage?: string;
  type: 'beli' | 'barter';
  price?: number;
  barterOfferTitle?: string; // Nama barang yang ditukar jika tipe 'barter'
  codLocation?: string;
  codCoordinates?: { lat: number; lng: number };
  status: 'Menunggu COD' | 'Diproses' | 'Selesai' | 'Dibatalkan';
  createdAt: string;
}

const ORDERS_STORAGE_KEY = 'rev_orders';

// Helper untuk membaca pesanan dari localStorage (default kosong [])
export function getOrders(userId?: string): OrderRecord[] {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: OrderRecord[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!userId) return parsed;
    return parsed.filter((o) => o.userId === userId || o.sellerId === userId);
  } catch {
    return [];
  }
}

// Helper global yang dipanggil saat transaksi terjadi (Checkout / Beli / Barter)
export function addOrderTransaction(
  orderInput: Omit<OrderRecord, 'id' | 'createdAt' | 'status'> & {
    status?: OrderRecord['status'];
  }
): OrderRecord {
  const existing = getOrders();
  const newOrder: OrderRecord = {
    ...orderInput,
    price:
      orderInput.price !== undefined
        ? Number(String(orderInput.price).replace(/\D/g, '')) || 0
        : undefined,
    id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status: orderInput.status || 'Menunggu COD',
    createdAt: new Date().toISOString(),
  };

  const updated = [newOrder, ...existing];
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
  notifyLocalChange();

  // Trigger event agar OrdersPage langsung ter-update
  window.dispatchEvent(new Event('rev-orders-updated'));
  return newOrder;
}

// Daftarkan ke window agar bisa dipanggil dari komponen mana saja dengan mudah
if (typeof window !== 'undefined') {
  (window as any).addRevOrder = addOrderTransaction;
}

interface OrdersPageProps {
  onNavigate?: (page: string, params?: any) => void;
}

type FilterTab = 'all' | 'beli' | 'barter' | 'dibatalkan';

export default function OrdersPage({ onNavigate }: OrdersPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filterType, setFilterType] = useState<FilterTab>('all');
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  const loadUserOrders = () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }
    setOrders(getOrders(currentUser.id));
  };

  useEffect(() => {
    loadUserOrders();

    // Dengarkan perubahan transaksi lokal maupun hasil sinkronisasi server
    window.addEventListener('rev-orders-updated', loadUserOrders);
    window.addEventListener('rev-db-updated', loadUserOrders);
    window.addEventListener('storage', loadUserOrders);
    return () => {
      window.removeEventListener('rev-orders-updated', loadUserOrders);
      window.removeEventListener('rev-db-updated', loadUserOrders);
      window.removeEventListener('storage', loadUserOrders);
    };
  }, [currentUser]);

  const handleUpdateStatus = (orderId: string, newStatus: OrderRecord['status']) => {
    if (
      newStatus === 'Dibatalkan' &&
      !window.confirm('Apakah kamu yakin ingin membatalkan transaksi ini?')
    ) {
      return;
    }

    const allOrders = getOrders();
    const updated = allOrders.map((o) =>
      o.id === orderId ? { ...o, status: newStatus } : o
    );
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    notifyLocalChange();
    window.dispatchEvent(new Event('rev-orders-updated'));
    loadUserOrders();
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Riwayat Transaksi</h2>
          <p className="text-sm text-gray-500 mb-6">
            Masuk ke akunmu terlebih dahulu untuk melihat daftar pembelian dan barter.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk Akun
          </button>
        </div>
      </div>
    );
  }

  const cancelledCount = orders.filter((o) => o.status === 'Dibatalkan').length;

  const filteredOrders = orders.filter((o) => {
    if (filterType === 'dibatalkan') return o.status === 'Dibatalkan';
    if (filterType === 'beli') return o.type === 'beli';
    if (filterType === 'barter') return o.type === 'barter';
    return true;
  });

  const tabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: 'all', label: 'Semua' },
    { id: 'beli', label: 'Pembelian' },
    { id: 'barter', label: 'Barter' },
    { id: 'dibatalkan', label: 'Dibatalkan', count: cancelledCount },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Transaksi Saya</h1>
          <p className="text-xs text-gray-500">
            Riwayat pembelian dan pertukaran barang (COD sekitar kampus)
          </p>
        </div>

        {/* Filter Tipe & Status Transaksi */}
        <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl self-start overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                filterType === tab.id
                  ? tab.id === 'dibatalkan'
                    ? 'bg-white text-red-600 shadow-sm'
                    : 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === tab.id
                      ? 'bg-red-50 text-red-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State saat belum ada transaksi */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {filterType === 'dibatalkan'
              ? 'Tidak Ada Transaksi Dibatalkan'
              : 'Belum Ada Transaksi'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            {filterType === 'dibatalkan'
              ? 'Riwayat pesanan pembelian atau barter yang dibatalkan akan tampil di tab ini.'
              : 'Daftar transaksimu masih kosong. Setiap kali kamu membeli barang atau menyepakati barter, riwayatnya akan otomatis muncul di sini.'}
          </p>
          {filterType !== 'dibatalkan' && (
            <div className="flex justify-center gap-3">
              <button
                onClick={() => go('home')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Cari Barang
              </button>
              <button
                onClick={() => go('barter')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Coba Smart Barter
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Daftar Transaksi */
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isCancelled = order.status === 'Dibatalkan';
            const isActive =
              order.status === 'Menunggu COD' || order.status === 'Diproses';
            const hasLocation = Boolean(order.codLocation || order.codCoordinates);
            const isMapOpen = expandedMapId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-sm space-y-3 transition-opacity ${
                  isCancelled ? 'border-red-100/80 opacity-90' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                        order.type === 'barter'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {order.type === 'barter' ? 'Barter' : 'Pembelian'}
                    </span>
                    <span className="text-gray-400">#{order.id}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      order.status === 'Selesai'
                        ? 'bg-emerald-50 text-emerald-700'
                        : isCancelled
                        ? 'bg-red-50 text-red-600'
                        : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="flex gap-3.5 items-center">
                  <img
                    src={order.itemImage || '/assets/seed-images/placeholder.svg'}
                    alt={order.itemTitle}
                    className={`w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0 ${
                      isCancelled ? 'grayscale-[40%]' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {order.itemTitle}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Mitra: {order.sellerName}
                    </p>
                    {order.type === 'barter' ? (
                      <p className="text-xs font-medium text-amber-700 mt-1">
                        Ditukar dengan: {order.barterOfferTitle || 'Barang penawaran'}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        Rp {Number(order.price || 0).toLocaleString('id-ID')}
                      </p>
                    )}
                    {hasLocation && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-gray-500 flex items-center gap-1">
                          <span>📍</span>
                          <span>
                            Titik COD: {order.codLocation || 'Area Kampus UNNES'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMapId(isMapOpen ? null : order.id)
                          }
                          className="text-emerald-700 hover:underline font-semibold"
                        >
                          {isMapOpen ? 'Tutup Peta' : 'Lihat Peta'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Peta OpenStreetMap Embed untuk Titik COD */}
                {hasLocation && isMapOpen && (
                  <OsmMapEmbed
                    locationName={order.codLocation}
                    coordinates={order.codCoordinates}
                    height={180}
                  />
                )}

                {/* Aksi Transaksi */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => go('chat')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Hubungi Mitra
                  </button>

                  {isActive && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Dibatalkan')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Batalkan
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'Selesai')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: 'var(--color-primary, #567257)' }}
                      >
                        Selesaikan COD
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}