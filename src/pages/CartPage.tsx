import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { addOrderTransaction } from './OrdersPage';

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
  sellerId?: string;
  sellerName: string;
  type: 'beli' | 'barter';
  barterOfferTitle?: string;
}

const SAFE_COD_SPOTS = [
  'Gerbang Utama UNNES Sekaran',
  'Lobi Dekanat FMIPA UNNES',
  'Perpustakaan Pusat UNNES',
  'Alfamart / Indomaret Sekaran Raya',
  'Area Kos Patemon (Sesuai Kesepakatan Chat)',
];

// Helper untuk menyimpan perubahan keranjang ke db.ts / localStorage secara dinamis
function persistCartChanges(updatedCartArray: any[]) {
  const db = dbService.getDB() as any;
  const updatedDB = { ...db, cart: updatedCartArray };

  if (typeof (dbService as any).saveDB === 'function') {
    (dbService as any).saveDB(updatedDB);
    return;
  }

  // Fallback: cari key database di localStorage yang menyimpan array 'items' dan 'cart'
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '');
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        localStorage.setItem(key, JSON.stringify({ ...parsed, cart: updatedCartArray }));
        return;
      }
    } catch {
      // Abaikan key non-JSON
    }
  }

  localStorage.setItem('rev_db', JSON.stringify(updatedDB));
}

export default function CartPage({ onNavigate, onCartUpdated }: CartPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [cartItems, setCartItems] = useState<ResolvedCartItem[]>([]);
  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(SAFE_COD_SPOTS[0]);
  const [buyerNote, setBuyerNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadCart = () => {
    if (!currentUser) {
      setCartItems([]);
      return;
    }

    const db = dbService.getDB() as any;
    const rawCart: any[] = db.cart || [];
    const allItems: any[] = db.items || [];
    const allUsers: any[] = db.users || [];

    const userEntries = rawCart.filter(
      (c) => String(c.id_user ?? c.userId) === String(currentUser.id)
    );

    const resolved: ResolvedCartItem[] = userEntries.map((entry, idx) => {
      const targetItemId = String(entry.id_item ?? entry.itemId ?? entry.productId ?? '');
      const product = allItems.find((it) => String(it.id) === targetItemId) || entry;

      const sellerId = product.id_user ?? product.sellerId ?? product.ownerId;
      const sellerObj = allUsers.find((u) => String(u.id) === String(sellerId));

      return {
        cartId: String(entry.id ?? `${targetItemId}-${idx}`),
        itemId: targetItemId,
        title: product.title || product.nama_barang || 'Barang Bekas Mahasiswa',
        price: Number(product.price ?? product.harga ?? 0),
        quantity: Number(entry.quantity ?? entry.qty ?? 1),
        image: product.image || product.foto || '/assets/seed-images/placeholder.svg',
        category: product.category || product.kategori || 'Umum',
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
  }, [currentUser]);

  const handleUpdateQty = (cartId: string, itemId: string, delta: number) => {
    if (!currentUser) return;
    const db = dbService.getDB() as any;
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
    const db = dbService.getDB() as any;
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

  // Fungsi utama Checkout yang mencatat pesanan ke OrdersPage & mengosongkan keranjang
  const handleCheckout = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    if (cartItems.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      const codInfo = buyerNote.trim()
        ? `${selectedCodSpot} (Catatan: ${buyerNote.trim()})`
        : selectedCodSpot;

      // 1. Tambahkan setiap item keranjang ke riwayat transaksi (OrdersPage)
      cartItems.forEach((item) => {
        addOrderTransaction({
          userId: String(currentUser.id),
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          itemTitle: item.quantity > 1 ? `${item.title} (${item.quantity}x)` : item.title,
          itemImage: item.image,
          type: item.type,
          price: item.price * item.quantity,
          barterOfferTitle: item.barterOfferTitle,
          codLocation: codInfo,
        });
      });

      // 2. Kosongkan item milik akun yang sedang login dari keranjang
      const db = dbService.getDB() as any;
      const otherUsersCart = (db.cart || []).filter(
        (c: any) => String(c.id_user ?? c.userId) !== String(currentUser.id)
      );
      persistCartChanges(otherUsersCart);

      // 3. Perbarui UI & pindah ke halaman OrdersPage
      setCartItems([]);
      if (onCartUpdated) onCartUpdated();
      alert('Transaksi berhasil dibuat! Silakan koordinasikan jadwal COD dengan penjual.');
      onNavigate('orders');
    } finally {
      setIsProcessing(false);
    }
  };

  // Tampilan jika pengguna belum login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Keranjang Belanja</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masuk terlebih dahulu untuk melihat dan menyelesaikan transaksi barang di keranjangmu.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white"
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">Keranjang Saya</h1>
        <p className="text-xs text-gray-500">
          Periksa kembali daftar barang sebelum menyepakati titik COD di sekitar kampus
        </p>
      </div>

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
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Mulai Cari Barang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Daftar Item di Keranjang */}
          <div className="lg:col-span-2 space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.cartId}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex gap-3.5 items-center"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  onClick={() => onNavigate('product', item.itemId)}
                  className="w-20 h-20 rounded-xl object-cover bg-gray-100 border border-gray-200 shrink-0 cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      onClick={() => onNavigate('product', item.itemId)}
                      className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {item.title}
                    </h3>
                    <button
                      onClick={() => handleRemoveItem(item.cartId, item.itemId)}
                      title="Hapus dari keranjang"
                      className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 px-1.5 py-0.5"
                    >
                      Hapus
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-0.5">
                    Penjual: {item.sellerName} • {item.category}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm font-bold text-gray-900">
                      {item.type === 'barter'
                        ? 'Tukar Barang (Barter)'
                        : `Rp ${(item.price * item.quantity).toLocaleString('id-ID')}`}
                    </p>

                    {/* Kontrol Jumlah Barang */}
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <button
                        onClick={() => handleUpdateQty(item.cartId, item.itemId, -1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200 rounded"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-gray-800 w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.cartId, item.itemId, 1)}
                        className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold hover:bg-gray-200 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Kolom Kanan: Pengaturan COD & Ringkasan Checkout */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-fit space-y-4">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">
              Ringkasan & Titik COD
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Rekomendasi Titik Temu Aman (COD)
              </label>
              <select
                value={selectedCodSpot}
                onChange={(e) => setSelectedCodSpot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                {SAFE_COD_SPOTS.map((spot) => (
                  <option key={spot} value={spot}>
                    {spot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Catatan Waktu / Lokasi (Opsional)
              </label>
              <input
                type="text"
                value={buyerNote}
                onChange={(e) => setBuyerNote(e.target.value)}
                placeholder="Misal: Ketemu jam 4 sore setelah kelas"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
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
                <span>Rp {totalPrice.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
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