import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDB,
  saveDB,
  parseSafePrice,
  isItemSold,
  pushNotification,
} from '../services/db';
import { addOrderTransaction } from './OrdersPage';
import OsmMapEmbed from '../components/OsmMapEmbed';
import {
  UNNES_LOCATIONS,
  DEFAULT_LOCATION_ID,
  estimateLocationDistance,
} from '../constants/locations';

interface CartPageProps {
  onNavigate: (page: string, params?: any) => void;
  onCartUpdated?: () => void;
}

interface ResolvedCartItem {
  cartId: string;
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
  category: string;
  lokasi: string;
  distanceLabel: string | null;
  isSold: boolean;
  sellerId?: string;
  sellerName: string;
  type: 'beli' | 'barter';
  barterOfferTitle?: string;
}

function getConfiguredWebLocation(currentUser: any): string {
  try {
    const savedLoc = localStorage.getItem('rev_selected_location');
    if (savedLoc && savedLoc.trim() && savedLoc !== 'Semua Lokasi') {
      return savedLoc.trim();
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
  return currentUser?.lokasi?.trim() || DEFAULT_LOCATION_ID;
}

function getSessionUserCoords(): { lat: number; lng: number } | null {
  try {
    const raw = sessionStorage.getItem('rev_session_coords');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lng === 'number') {
      return { lat: parsed.lat, lng: parsed.lng };
    }
  } catch {
    // Abaikan jika sessionStorage tidak tersedia
  }
  return null;
}

function persistCartChanges(updatedCartArray: any[]) {
  const db = getDB() as any;
  saveDB({ ...db, cart: updatedCartArray });
}

export default function CartPage({ onNavigate, onCartUpdated }: CartPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const defaultLocationObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

  const [cartItems, setCartItems] = useState<ResolvedCartItem[]>([]);
  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(
    defaultLocationObj?.name || 'Gerbang Utama UNNES (Sekaran)'
  );
  const [buyerNote, setBuyerNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  const loadCart = () => {
    if (!currentUser) {
      setCartItems([]);
      return;
    }

    const db = getDB() as any;
    const rawCart: any[] = db.cart || [];
    const allItems: any[] = db.items || [];
    const allUsers: any[] = db.users || [];

    const userOriginLocation = getConfiguredWebLocation(currentUser);
    const sessionCoords = getSessionUserCoords();

    const userEntries = rawCart.filter(
      (c) => String(c.id_user ?? c.userId) === String(currentUser.id)
    );

    const resolved: ResolvedCartItem[] = userEntries.map((entry, idx) => {
      const targetItemId = String(entry.id_item ?? entry.itemId ?? entry.productId ?? '');
      const product = allItems.find((it) => String(it.id) === targetItemId) || entry;

      const sellerId =
        product.id_pemilik ?? product.id_user ?? product.sellerId ?? product.ownerId;
      const sellerObj = allUsers.find((u) => String(u.id) === String(sellerId));

      const itemLocation =
        product.lokasi ||
        product.location ||
        sellerObj?.lokasi ||
        defaultLocationObj?.name ||
        'Gerbang Utama UNNES (Sekaran)';

      const distInfo = estimateLocationDistance(
        userOriginLocation,
        itemLocation,
        sessionCoords
      );

      return {
        cartId: String(entry.id ?? `${targetItemId}-${idx}`),
        itemId: targetItemId,
        title:
          product.nama ||
          product.title ||
          product.nama_barang ||
          'Barang Mahasiswa',
        price: parseSafePrice(product.harga ?? product.price ?? 0),
        quantity: Math.max(1, Number(entry.quantity ?? entry.qty ?? 1)),
        image: product.foto || product.image || '/assets/seed-images/placeholder.svg',
        category: product.kategori || product.category || 'Umum',
        lokasi: itemLocation,
        distanceLabel: distInfo?.label || null,
        isSold: isItemSold(product),
        sellerId: sellerId ? String(sellerId) : undefined,
        sellerName:
          sellerObj?.nama ||
          sellerObj?.name ||
          product.sellerName ||
          product.ownerName ||
          'Mahasiswa UNNES',
        type: entry.type === 'barter' ? 'barter' : 'beli',
        barterOfferTitle: entry.barterOfferTitle,
      };
    });

    setCartItems(resolved);
  };

  useEffect(() => {
    loadCart();
    const handleDbUpdated = () => loadCart();
    window.addEventListener('rev-db-updated', handleDbUpdated);
    return () => window.removeEventListener('rev-db-updated', handleDbUpdated);
  }, [currentUser]);

  const availableCodSpots = useMemo(() => {
    const spots: string[] = [];
    const webLoc = getConfiguredWebLocation(currentUser);

    if (webLoc && webLoc !== DEFAULT_LOCATION_ID) {
      spots.push(`Area Pilihanmu: ${webLoc}`);
    }

    cartItems.forEach((item) => {
      if (item.lokasi) {
        const label = `Area Barang (${item.lokasi})`;
        if (!spots.includes(label)) spots.push(label);
      }
    });

    UNNES_LOCATIONS.forEach((loc) => {
      if (!spots.includes(loc.name)) spots.push(loc.name);
    });

    return spots;
  }, [cartItems, currentUser]);

  useEffect(() => {
    if (availableCodSpots.length > 0 && !availableCodSpots.includes(selectedCodSpot)) {
      setSelectedCodSpot(availableCodSpots[0]);
    }
  }, [availableCodSpots, selectedCodSpot]);

  const activePresetLocation = useMemo(() => {
    const cleanName = selectedCodSpot
      .replace(/^Area Pilihanmu:\s*/i, '')
      .replace(/^Area Barang\s*\((.+)\)$/i, '$1')
      .trim()
      .toLowerCase();

    return (
      UNNES_LOCATIONS.find(
        (loc) =>
          loc.id.toLowerCase() === cleanName ||
          loc.name.toLowerCase() === cleanName ||
          loc.name.toLowerCase().includes(cleanName)
      ) ||
      defaultLocationObj ||
      null
    );
  }, [selectedCodSpot, defaultLocationObj]);

  const codDistanceLabel = useMemo(() => {
    if (!activePresetLocation) return null;
    const userOriginLocation = getConfiguredWebLocation(currentUser);
    const sessionCoords = getSessionUserCoords();
    const distInfo = estimateLocationDistance(
      userOriginLocation,
      activePresetLocation.name,
      sessionCoords
    );
    return distInfo?.label || null;
  }, [activePresetLocation, currentUser]);

  const handleUpdateQty = (cartId: string, itemId: string, delta: number) => {
    if (!currentUser) return;
    setFeedback(null);
    const db = getDB() as any;
    const rawCart: any[] = db.cart || [];

    const updatedRawCart = rawCart
      .map((entry, idx) => {
        const entryCartId = String(entry.id ?? `${entry.id_item ?? entry.itemId}-${idx}`);
        const isTarget =
          String(entry.id_user ?? entry.userId) === String(currentUser.id) &&
          (entryCartId === cartId || String(entry.id_item ?? entry.itemId) === itemId);

        if (!isTarget) return entry;

        const currentQty = Number(entry.quantity ?? entry.qty ?? 1);
        const nextQty = currentQty + delta;
        if (nextQty <= 0) return null;

        return { ...entry, quantity: nextQty, qty: nextQty };
      })
      .filter(Boolean);

    persistCartChanges(updatedRawCart);
    loadCart();
    if (onCartUpdated) onCartUpdated();
  };

  const handleRemoveItem = (cartId: string, itemId: string) => {
    if (!currentUser) return;
    setFeedback(null);
    const db = getDB() as any;
    const rawCart: any[] = db.cart || [];

    const remainingCart = rawCart.filter((entry, idx) => {
      const isSameUser = String(entry.id_user ?? entry.userId) === String(currentUser.id);
      if (!isSameUser) return true;

      const entryCartId = String(entry.id ?? `${entry.id_item ?? entry.itemId}-${idx}`);
      const entryItemId = String(entry.id_item ?? entry.itemId ?? entry.productId ?? '');
      return entryCartId !== cartId && entryItemId !== itemId;
    });

    persistCartChanges(remainingCart);
    loadCart();
    if (onCartUpdated) onCartUpdated();
  };

  const handleCheckout = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    if (cartItems.length === 0 || isProcessing) return;

    const hasSoldItems = cartItems.some((item) => item.isSold);
    if (hasSoldItems) {
      setFeedback({
        type: 'error',
        message:
          'Ada barang di keranjang yang sudah terjual. Hapus barang tersebut terlebih dahulu sebelum checkout.',
      });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      const cleanSpot = selectedCodSpot
        .replace(/^Area Pilihanmu:\s*/i, '')
        .replace(/^Area Barang\s*\((.+)\)$/i, '$1')
        .trim();

      const codInfo = buyerNote.trim()
        ? `${cleanSpot} (Catatan: ${buyerNote.trim()})`
        : cleanSpot;

      const buyerName = currentUser.nama || currentUser.name || 'Mahasiswa UNNES';

      cartItems.forEach((item) => {
        const orderTitle =
          item.quantity > 1 ? `${item.title} (${item.quantity}x)` : item.title;

        addOrderTransaction({
          buyerId: String(currentUser.id),
          buyerName,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          itemId: item.itemId,
          itemTitle: orderTitle,
          itemImage: item.image,
          type: item.type,
          price: item.price * item.quantity,
          barterOfferTitle: item.barterOfferTitle,
          codLocation: codInfo,
          lokasi_cod: codInfo,
        });

        if (item.sellerId && String(item.sellerId) !== String(currentUser.id)) {
          pushNotification({
            userId: String(item.sellerId),
            tipe: item.type === 'barter' ? 'barter' : 'success',
            teks: `${buyerName} membuat pesanan untuk "${orderTitle}" dengan titik COD di ${cleanSpot}.`,
            targetPage: 'orders',
            targetId: item.itemId,
          });
        }
      });

      const db = getDB() as any;
      const otherUsersCart = (db.cart || []).filter(
        (c: any) => String(c.id_user ?? c.userId) !== String(currentUser.id)
      );
      persistCartChanges(otherUsersCart);

      setCartItems([]);
      if (onCartUpdated) onCartUpdated();
      onNavigate('orders');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Keranjang Belanja</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masuk terlebih dahulu untuk melihat dan menyelesaikan transaksi barang di keranjangmu.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full min-h-[44px] py-3 rounded-xl text-xs font-bold text-white touch-manipulation active:scale-[0.99] transition-transform"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk ke Akun
          </button>
        </div>
      </div>
    );
  }

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const hasSoldItems = cartItems.some((item) => item.isSold);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-10">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Keranjang Saya</h1>
        <p className="text-xs text-gray-500">
          Periksa kembali daftar barang dan titik lokasi COD di sekitar kampus sebelum checkout
        </p>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mb-4 rounded-xl px-4 py-3 text-xs font-medium border ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-gray-800">Keranjang Masih Kosong</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            Jelajahi perlengkapan kos, buku kuliah, atau elektronik bekas layak pakai di sekitar UNNES.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation active:scale-[0.99] transition-transform"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Mulai Cari Barang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.cartId}
                className={`bg-white rounded-2xl p-4 border shadow-sm flex gap-3.5 items-start sm:items-center ${
                  item.isSold ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onNavigate('product', item.itemId)}
                  aria-label={`Lihat detail ${item.title}`}
                  className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onNavigate('product', item.itemId)}
                        className="text-left text-sm font-bold text-gray-900 truncate block max-w-full hover:underline touch-manipulation"
                      >
                        {item.title}
                      </button>
                      {item.isSold && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700">
                          Sudah Terjual
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.cartId, item.itemId)}
                      title="Hapus dari keranjang"
                      className="min-h-[32px] px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium shrink-0 touch-manipulation"
                    >
                      Hapus
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5">
                    Penjual: {item.sellerName} • {item.category}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[11px] text-emerald-700 font-medium">
                      Area: {item.lokasi}
                    </span>
                    {item.distanceLabel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Estimasi jarak {item.distanceLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      {item.type === 'barter'
                        ? 'Tukar Barang (Barter)'
                        : `Rp ${(item.price * item.quantity).toLocaleString('id-ID')}`}
                    </p>

                    {!item.isSold && (
                      <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.cartId, item.itemId, -1)}
                          aria-label="Kurangi jumlah"
                          className="w-8 h-8 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200 active:bg-gray-300 rounded-lg touch-manipulation"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-gray-800 w-6 text-center select-none">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.cartId, item.itemId, 1)}
                          aria-label="Tambah jumlah"
                          className="w-8 h-8 flex items-center justify-center text-gray-700 font-bold hover:bg-gray-200 active:bg-gray-300 rounded-lg touch-manipulation"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-fit space-y-4">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
              Ringkasan & Titik Lokasi COD
            </h2>

            <div>
              <label
                htmlFor="cod-spot-select"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Titik Temu COD (Area Preset Kampus)
              </label>
              <select
                id="cod-spot-select"
                value={selectedCodSpot}
                onChange={(e) => setSelectedCodSpot(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                {availableCodSpots.map((spot) => (
                  <option key={spot} value={spot}>
                    {spot}
                  </option>
                ))}
              </select>
              {codDistanceLabel && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1.5">
                  Prediksi jarak ke titik COD: <span className="font-bold">{codDistanceLabel}</span>
                </p>
              )}
            </div>

            <OsmMapEmbed
              locationName={activePresetLocation?.name || selectedCodSpot}
              coordinates={
                activePresetLocation
                  ? { lat: activePresetLocation.lat, lng: activePresetLocation.lng }
                  : null
              }
              height={165}
            />

            <div>
              <label
                htmlFor="cod-buyer-note"
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
                Catatan Waktu / Detail Lokasi (Opsional)
              </label>
              <input
                id="cod-buyer-note"
                type="text"
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                placeholder="Misal: Ketemu jam 4 sore depan lobi"
                className="w-full min-h-[42px] px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Total Barang</span>
                <span>{totalCount} item</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Biaya Pengiriman (COD Kampus)</span>
                <span className="text-emerald-600 font-semibold">Gratis (Rp 0)</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total Pembayaran COD</span>
                <span className="whitespace-nowrap">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {hasSoldItems && (
              <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">
                Hapus barang berstatus <strong>Sudah Terjual</strong> terlebih dahulu sebelum melanjutkan checkout.
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={isProcessing || hasSoldItems}
              className="w-full min-h-[46px] py-3 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50 touch-manipulation"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              {isProcessing ? 'Memproses...' : `Checkout Sekarang (${totalCount})`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}