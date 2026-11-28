import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import ReturnModal from '../components/ReturnModal';

export interface OrderRecord {
  id: string;
  itemId: string;
  itemTitle: string;
  itemImage: string;
  price: number;
  type: 'beli' | 'barter';
  barterOfferItemTitle?: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  status: 'Menunggu COD' | 'Diproses' | 'Selesai' | 'Dibatalkan';
  codLocation: string;
  lokasi_cod?: string;
  createdAt: string;
}

const ORDERS_STORAGE_KEY = 'rev_orders';
const LEGACY_ORDERS_STORAGE_KEY = 'rev_orders_v1';

function parseSafeOrderPrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string') {
    const digitsOnly = value.replace(/[^\d]/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  }
  return 0;
}

function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

function normalizeOrderRecord(raw: any): OrderRecord {
  const resolvedLocation =
    raw?.lokasi_cod || raw?.codLocation || 'Gerbang Utama UNNES Sekaran';
  const validStatuses: OrderRecord['status'][] = [
    'Menunggu COD',
    'Diproses',
    'Selesai',
    'Dibatalkan',
  ];
  const status: OrderRecord['status'] = validStatuses.includes(raw?.status)
    ? raw.status
    : 'Menunggu COD';

  return {
    id: String(raw?.id || generateOrderId()),
    itemId: String(raw?.itemId || ''),
    itemTitle: String(raw?.itemTitle || 'Barang Kampus'),
    itemImage: String(raw?.itemImage || '/assets/seed-images/placeholder.svg'),
    price: parseSafeOrderPrice(raw?.price),
    type: raw?.type === 'barter' ? 'barter' : 'beli',
    ...(raw?.barterOfferItemTitle
      ? { barterOfferItemTitle: String(raw.barterOfferItemTitle) }
      : {}),
    sellerId: String(raw?.sellerId || ''),
    sellerName: String(raw?.sellerName || 'Penjual Kampus'),
    buyerId: String(raw?.buyerId || ''),
    buyerName: String(raw?.buyerName || 'Pembeli Kampus'),
    status,
    codLocation: resolvedLocation,
    lokasi_cod: resolvedLocation,
    createdAt: String(raw?.createdAt || new Date().toISOString()),
  };
}

export function getOrders(userId?: string): OrderRecord[] {
  try {
    const db = dbService.getDB() as any;
    const dbOrders: any[] = Array.isArray(db?.orders) ? db.orders : [];

    const rawCurrent = localStorage.getItem(ORDERS_STORAGE_KEY);
    const rawLegacy = localStorage.getItem(LEGACY_ORDERS_STORAGE_KEY);
    const localOrders: any[] = rawCurrent
      ? JSON.parse(rawCurrent)
      : rawLegacy
      ? JSON.parse(rawLegacy)
      : [];

    // Gabungkan data dari jualbeliDB.orders dan localStorage rev_orders tanpa duplikasi
    const mergedMap = new Map<string, OrderRecord>();
    [...localOrders, ...dbOrders].forEach((entry) => {
      if (!entry || !entry.id) return;
      const normalized = normalizeOrderRecord(entry);
      if (!mergedMap.has(normalized.id)) {
        mergedMap.set(normalized.id, normalized);
      }
    });

    const list = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!userId) return list;
    return list.filter(
      (o) =>
        String(o.buyerId) === String(userId) ||
        String(o.sellerId) === String(userId)
    );
  } catch {
    return [];
  }
}

export function saveOrders(orders: OrderRecord[]) {
  const normalizedList = orders.map(normalizeOrderRecord);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(normalizedList));

  try {
    const db = dbService.getDB() as any;
    dbService.saveDB({
      ...db,
      orders: normalizedList,
    });
  } catch {
    window.dispatchEvent(new Event('rev-db-updated'));
  }

  window.dispatchEvent(new Event('rev-orders-updated'));
}

export function createOrder(
  order: Omit<OrderRecord, 'id' | 'createdAt' | 'status'>
): OrderRecord {
  const existing = getOrders();
  const resolvedLocation =
    order.lokasi_cod || order.codLocation || 'Gerbang Utama UNNES Sekaran';

  const newOrder: OrderRecord = normalizeOrderRecord({
    ...order,
    id: generateOrderId(),
    status: 'Menunggu COD',
    codLocation: resolvedLocation,
    lokasi_cod: resolvedLocation,
    createdAt: new Date().toISOString(),
  });

  saveOrders([newOrder, ...existing]);
  return newOrder;
}

export interface AddOrderTransactionInput {
  userId?: string;
  buyerId?: string;
  buyerName?: string;
  sellerId?: string;
  sellerName?: string;
  itemId?: string;
  itemTitle: string;
  itemImage?: string;
  type: 'beli' | 'barter';
  price?: number | string;
  barterOfferTitle?: string;
  barterOfferItemTitle?: string;
  codLocation?: string;
  lokasi_cod?: string;
}

export function addOrderTransaction(input: AddOrderTransactionInput): OrderRecord {
  const resolvedBuyerId = String(input.buyerId || input.userId || 'USR-BUYER');
  const resolvedSellerId = String(input.sellerId || 'USR-SELLER');
  const resolvedLocation =
    input.lokasi_cod || input.codLocation || 'Gerbang Utama UNNES Sekaran';

  const created = createOrder({
    itemId: String(input.itemId || ''),
    itemTitle: input.itemTitle,
    itemImage: input.itemImage || '/assets/seed-images/placeholder.svg',
    price: parseSafeOrderPrice(input.price),
    type: input.type,
    barterOfferItemTitle: input.barterOfferTitle || input.barterOfferItemTitle,
    sellerId: resolvedSellerId,
    sellerName: input.sellerName || 'Penjual Kampus',
    buyerId: resolvedBuyerId,
    buyerName: input.buyerName || 'Pembeli Kampus',
    codLocation: resolvedLocation,
    lokasi_cod: resolvedLocation,
  });

  if (resolvedSellerId && resolvedSellerId !== 'USR-SELLER') {
    (dbService.pushNotification as any)({
      userId: resolvedSellerId,
      tipe: input.type === 'barter' ? 'barter' : 'success',
      teks: `Pesanan COD baru "${created.itemTitle}" (${created.id}) dari ${created.buyerName}.`,
      targetPage: 'orders',
      targetId: created.id,
      link_page: 'orders',
      target_id: created.id,
    });
  }

  return created;
}

if (typeof window !== 'undefined') {
  (window as any).addRevOrder = addOrderTransaction;
}

interface OrdersPageProps {
  onNavigate?: (page: string, params?: any, extraParam?: string) => void;
}

export default function OrdersPage({ onNavigate }: OrdersPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activeTab, setActiveTab] = useState<
    'semua' | 'aktif' | 'selesai' | 'dibatalkan'
  >('semua');
  const [returnOrderTarget, setReturnOrderTarget] = useState<OrderRecord | null>(
    null
  );

  const go = (page: string, params?: any, extraParam?: string) => {
    if (onNavigate) onNavigate(page, params, extraParam);
    else if ((window as any).revNavigate)
      (window as any).revNavigate(page, params, extraParam);
  };

  useEffect(() => {
    const syncOrders = () => setOrders(getOrders());
    syncOrders();
    window.addEventListener('rev-db-updated', syncOrders);
    window.addEventListener('rev-orders-updated', syncOrders);
    return () => {
      window.removeEventListener('rev-db-updated', syncOrders);
      window.removeEventListener('rev-orders-updated', syncOrders);
    };
  }, []);

  const usersMap = useMemo(() => {
    try {
      const db = dbService.getDB() as any;
      const map = new Map<string, string>();
      (db?.users || []).forEach((u: any) => {
        if (u?.id && u?.nama) map.set(String(u.id), String(u.nama));
      });
      return map;
    } catch {
      return new Map<string, string>();
    }
  }, [orders]);

  const userOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(
      (o) =>
        String(o.buyerId) === String(currentUser.id) ||
        String(o.sellerId) === String(currentUser.id)
    );
  }, [orders, currentUser]);

  const filteredOrders = useMemo(() => {
    if (activeTab === 'aktif') {
      return userOrders.filter(
        (o) => o.status === 'Menunggu COD' || o.status === 'Diproses'
      );
    }
    if (activeTab === 'selesai') {
      return userOrders.filter((o) => o.status === 'Selesai');
    }
    if (activeTab === 'dibatalkan') {
      return userOrders.filter((o) => o.status === 'Dibatalkan');
    }
    return userOrders;
  }, [userOrders, activeTab]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Masuk untuk Melihat Pesanan
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Pantau jadwal pertemuan COD, status barter, dan riwayat belanjamu di
              kampus.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="min-h-[44px] w-full py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk Akun
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateStatus = (
    orderId: string,
    nextStatus: OrderRecord['status']
  ) => {
    if (
      nextStatus === 'Dibatalkan' &&
      !window.confirm('Batalkan transaksi COD ini?')
    ) {
      return;
    }

    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const updated = orders.map((o) =>
      o.id === orderId ? { ...o, status: nextStatus } : o
    );
    saveOrders(updated);
    setOrders(updated);

    const partnerId =
      String(targetOrder.buyerId) === String(currentUser.id)
        ? targetOrder.sellerId
        : targetOrder.buyerId;

    // Tandai barang terjual menggunakan boolean terjual: true tanpa menimpa Item.status
    if (nextStatus === 'Selesai' && targetOrder.itemId) {
      const db = dbService.getDB() as any;
      const updatedItems = (db.items || []).map((item: any) =>
        String(item.id) === String(targetOrder.itemId)
          ? { ...item, terjual: true }
          : item
      );
      dbService.saveDB({ ...db, items: updatedItems });
    }

    const notifTipe: 'barter' | 'success' =
      targetOrder.type === 'barter' && nextStatus !== 'Selesai'
        ? 'barter'
        : 'success';

    if (partnerId && String(partnerId) !== String(currentUser.id)) {
      (dbService.pushNotification as any)({
        userId: String(partnerId),
        tipe: notifTipe,
        teks: `Status transaksi "${targetOrder.itemTitle}" (${targetOrder.id}) diperbarui menjadi ${nextStatus}.`,
        targetPage: 'orders',
        targetId: targetOrder.id,
        link_page: 'orders',
        target_id: targetOrder.id,
      });
    }
  };

  const getStatusBadgeStyle = (status: OrderRecord['status']) => {
    switch (status) {
      case 'Menunggu COD':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Diproses':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Dibatalkan':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Pesanan & Riwayat COD
          </h1>
          <p className="text-xs text-gray-500">
            Kelola jadwal temu langsung, konfirmasi selesai, atau ajukan peninjauan
            kendala
          </p>
        </div>
        <button
          type="button"
          onClick={() => go('home')}
          className="min-h-[40px] self-start sm:self-auto px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
        >
          + Cari Barang Lagi
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {[
          { id: 'semua', label: `Semua (${userOrders.length})` },
          {
            id: 'aktif',
            label: `Berlangsung (${
              userOrders.filter(
                (o) => o.status === 'Menunggu COD' || o.status === 'Diproses'
              ).length
            })`,
          },
          {
            id: 'selesai',
            label: `Selesai (${
              userOrders.filter((o) => o.status === 'Selesai').length
            })`,
          },
          {
            id: 'dibatalkan',
            label: `Dibatalkan (${
              userOrders.filter((o) => o.status === 'Dibatalkan').length
            })`,
          },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors touch-manipulation ${
              activeTab === tab.id
                ? 'text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={
              activeTab === tab.id
                ? { background: 'var(--color-primary, #567257)' }
                : undefined
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-800">
            Belum ada transaksi di tab ini
          </p>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Mulai belanja atau ajukan barter barang dengan teman kampusmu di
            sekitar UNNES.
          </p>
          <div className="pt-1 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => go('home')}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-white touch-manipulation"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Jelajahi Katalog
            </button>
            <button
              type="button"
              onClick={() => go('barter')}
              className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation"
            >
              Smart Barter
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isBuyer = String(order.buyerId) === String(currentUser.id);
            const partnerId = isBuyer ? order.sellerId : order.buyerId;
            const rawPartnerName = isBuyer ? order.sellerName : order.buyerName;
            const resolvedFromDb = usersMap.get(String(partnerId));
            const partnerName =
              resolvedFromDb ||
              (rawPartnerName && rawPartnerName !== currentUser.nama
                ? rawPartnerName
                : isBuyer
                ? 'Penjual Kampus'
                : 'Pembeli Kampus');

            const displayLocation =
              order.lokasi_cod ||
              order.codLocation ||
              'Gerbang Utama UNNES Sekaran';

            const formattedDate = new Date(order.createdAt).toLocaleDateString(
              'id-ID',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }
            );

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-gray-800">
                      {order.id}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-500">{formattedDate}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        order.type === 'barter'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {order.type}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="flex gap-3.5 items-start">
                  <button
                    type="button"
                    onClick={() =>
                      order.itemId && go('product', { productId: order.itemId })
                    }
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-600 touch-manipulation"
                    aria-label={`Lihat detail ${order.itemTitle}`}
                  >
                    <img
                      src={order.itemImage || '/assets/seed-images/placeholder.svg'}
                      alt={order.itemTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          '/assets/seed-images/placeholder.svg';
                      }}
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    <button
                      type="button"
                      onClick={() =>
                        order.itemId &&
                        go('product', { productId: order.itemId })
                      }
                      className="text-left text-sm font-bold text-gray-900 line-clamp-1 hover:underline focus:outline-none focus:underline touch-manipulation"
                    >
                      {order.itemTitle}
                    </button>

                    {order.type === 'barter' && order.barterOfferItemTitle && (
                      <p className="text-xs text-amber-800 font-medium">
                        Ditukar dengan:{' '}
                        <strong>{order.barterOfferItemTitle}</strong>
                      </p>
                    )}

                    <p className="text-xs text-gray-500">
                      {isBuyer ? 'Penjual' : 'Pembeli'}:{' '}
                      <strong className="text-gray-700">{partnerName}</strong>
                    </p>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-[11px] text-gray-600 max-w-full">
                      <svg
                        className="w-3 h-3 text-gray-500 shrink-0"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate">COD: {displayLocation}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-gray-400">
                      {order.type === 'barter' ? 'Estimasi Nilai' : 'Total Bayar'}
                    </p>
                    <p
                      className="text-sm sm:text-base font-black"
                      style={{ color: 'var(--color-accent, #D97706)' }}
                    >
                      Rp {parseSafeOrderPrice(order.price).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      go('chat', {
                        partnerId,
                        itemId: order.itemId,
                      })
                    }
                    className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
                  >
                    Chat {isBuyer ? 'Penjual' : 'Pembeli'}
                  </button>

                  {order.status !== 'Dibatalkan' && (
                    <button
                      type="button"
                      onClick={() => setReturnOrderTarget(order)}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 touch-manipulation"
                    >
                      Kendala / Peninjauan COD
                    </button>
                  )}

                  {(order.status === 'Menunggu COD' ||
                    order.status === 'Diproses') && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(order.id, 'Dibatalkan')
                        }
                        className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 touch-manipulation"
                      >
                        Batalkan
                      </button>

                      {!isBuyer && order.status === 'Menunggu COD' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateStatus(order.id, 'Diproses')
                          }
                          className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 touch-manipulation"
                        >
                          Siap COD
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(order.id, 'Selesai')}
                        className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 touch-manipulation"
                        style={{ background: 'var(--color-primary, #567257)' }}
                      >
                        Selesai COD ✓
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {returnOrderTarget && (
        <ReturnModal
          onClose={() => setReturnOrderTarget(null)}
          orderId={returnOrderTarget.id}
          itemName={returnOrderTarget.itemTitle}
          sellerId={
            String(returnOrderTarget.buyerId) === String(currentUser.id)
              ? returnOrderTarget.sellerId
              : returnOrderTarget.buyerId
          }
        />
      )}
    </div>
  );
}