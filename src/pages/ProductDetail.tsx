import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { addOrderTransaction } from './OrdersPage';

interface ProductDetailProps {
  productId?: string;
  onNavigate: (page: string, params?: any, extraParam?: string) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

const SAFE_COD_SPOTS = [
  'Gerbang Utama UNNES (Sekaran)',
  'Taman FMIPA UNNES',
  'Masjid Ulul Albab UNNES',
  'Indomaret Point Sekaran Raya',
  'Pertigaan Patemon Gunungpati',
];

export default function ProductDetail({
  productId,
  onNavigate,
  onOpenAddItem,
  onCartUpdated,
}: ProductDetailProps) {
  const { currentUser, openAuthModal } = useAuth() as any;

  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(SAFE_COD_SPOTS[0]);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState<boolean>(false);
  const [selectedOfferItemId, setSelectedOfferItemId] = useState<string>('');
  const [barterNote, setBarterNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];
  const allUsers: any[] = db.users || [];

  // Ambil detail produk berdasarkan productId (fallback ke item pertama jika tidak ada)
  const rawItem = useMemo(() => {
    if (!allItems.length) return null;
    if (productId) {
      const found = allItems.find((it) => String(it.id) === String(productId));
      if (found) return found;
    }
    return allItems[0];
  }, [allItems, productId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const persistDB = (updatedDB: any) => {
    if (typeof (dbService as any).saveDB === 'function') {
      (dbService as any).saveDB(updatedDB);
    }
    localStorage.setItem('rev_db', JSON.stringify(updatedDB));
  };

  if (!rawItem) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-2">Barang Tidak Ditemukan</h2>
          <p className="text-xs text-gray-500 mb-6">
            Barang yang kamu cari mungkin sudah terjual, selesai dibarter, atau dihapus oleh pemiliknya.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Normalisasi properti barang agar kompatibel dengan berbagai versi skema db.ts
  const item = {
    id: rawItem.id,
    title: rawItem.title || rawItem.nama_barang || 'Barang Mahasiswa UNNES',
    description:
      rawItem.description ||
      rawItem.deskripsi ||
      'Barang masih sangat layak pakai, siap COD di area sekitar kampus UNNES Gunungpati.',
    price: Number(rawItem.price ?? rawItem.harga ?? 0),
    category: rawItem.category || rawItem.kategori || 'Perlengkapan Kos',
    condition: rawItem.condition || rawItem.kondisi || 'Bekas - Sangat Baik',
    location: rawItem.location || rawItem.lokasi || 'Sekaran, Gunungpati',
    image: rawItem.image || rawItem.foto || '/assets/seed-images/placeholder.svg',
    ownerId: rawItem.id_user ?? rawItem.sellerId ?? rawItem.ownerId ?? 'seller-default',
    transactionMode: (
      rawItem.transactionType ||
      rawItem.tipe_transaksi ||
      rawItem.mode ||
      'both'
    ).toLowerCase(),
    wantedItem: rawItem.wantedItem || rawItem.barang_dicari || 'Perlengkapan kos / buku kuliah',
  };

  const seller = allUsers.find((u) => String(u.id) === String(item.ownerId));
  const sellerName =
    seller?.nama || seller?.name || rawItem.sellerName || rawItem.ownerName || 'Mahasiswa UNNES';
  const isSellerVerified =
    seller?.is_verified || (seller?.email || '').toLowerCase().includes('unnes.ac.id');

  const isOwnItem = currentUser && String(currentUser.id) === String(item.ownerId);
  const canBuy =
    item.transactionMode.includes('jual') ||
    item.transactionMode.includes('sell') ||
    item.transactionMode === 'both' ||
    item.price > 0;
  const canBarter =
    item.transactionMode.includes('barter') ||
    item.transactionMode === 'both' ||
    Boolean(rawItem.canBarter);

  // Daftar barang milik user yang sedang login untuk opsi barter
  const myBarterItems = useMemo(() => {
    if (!currentUser) return [];
    return allItems.filter((it) => {
      const uid = it.id_user ?? it.sellerId ?? it.ownerId;
      return String(uid) === String(currentUser.id) && String(it.id) !== String(item.id);
    });
  }, [allItems, currentUser, item.id]);

  // Helper membuat/membuka ruang chat agar terhubung dengan ChatPage
  const createOrOpenChatRoom = (initialText?: string): string => {
    const latestDB = dbService.getDB() as any;
    const conversations: any[] = latestDB.conversations || [];
    const messages: any[] = latestDB.messages || [];

    const buyerId = String(currentUser.id);
    const sellerId = String(item.ownerId);

    let existingConv = conversations.find((c) => {
      if (Array.isArray(c.participants)) {
        const ids = c.participants.map(String);
        return ids.includes(buyerId) && ids.includes(sellerId);
      }
      return (
        (String(c.buyerId) === buyerId && String(c.sellerId) === sellerId) ||
        (String(c.buyerId) === sellerId && String(c.sellerId) === buyerId)
      );
    });

    const convId = existingConv ? String(existingConv.id) : `conv-${Date.now()}`;

    if (!existingConv) {
      existingConv = {
        id: convId,
        participants: [buyerId, sellerId],
        buyerId,
        sellerId,
        buyerName: currentUser.nama || currentUser.name || 'Saya',
        sellerName,
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.image,
        lastMessage: initialText || `Halo, saya tertarik dengan ${item.title}`,
        updatedAt: new Date().toISOString(),
      };
      conversations.unshift(existingConv);
    } else if (initialText) {
      existingConv.lastMessage = initialText;
      existingConv.updatedAt = new Date().toISOString();
    }

    if (initialText) {
      messages.push({
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: buyerId,
        senderName: currentUser.nama || currentUser.name || 'Saya',
        text: initialText,
        createdAt: new Date().toISOString(),
      });
    }

    persistDB({
      ...latestDB,
      conversations,
      messages,
    });

    return convId;
  };

  // 1. Aksi Tambah ke Keranjang
  const handleAddToCart = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    const latestDB = dbService.getDB() as any;
    const cart: any[] = latestDB.cart || [];

    const existingIdx = cart.findIndex(
      (c) =>
        String(c.id_user ?? c.userId) === String(currentUser.id) &&
        String(c.id_item ?? c.itemId) === String(item.id)
    );

    if (existingIdx >= 0) {
      cart[existingIdx].quantity = (cart[existingIdx].quantity || 1) + 1;
    } else {
      cart.push({
        id: `cart-${Date.now()}`,
        id_user: currentUser.id,
        userId: currentUser.id,
        id_item: item.id,
        itemId: item.id,
        title: item.title,
        price: item.price,
        image: item.image,
        sellerId: item.ownerId,
        sellerName,
        type: 'beli',
        quantity: 1,
      });
    }

    persistDB({ ...latestDB, cart });
    if (onCartUpdated) onCartUpdated();
    showToast('Barang berhasil ditambahkan ke keranjang!');
  };

  // 2. Aksi Beli Langsung (Tercatat langsung ke OrdersPage)
  const handleDirectBuy = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    addOrderTransaction({
      userId: currentUser.id,
      sellerId: String(item.ownerId),
      sellerName,
      itemTitle: item.title,
      itemImage: item.image,
      type: 'beli',
      price: item.price,
      codLocation: selectedCodSpot,
    });

    createOrOpenChatRoom(
      `Halo ${sellerName}, saya baru saja memesan "${item.title}" (Rp ${item.price.toLocaleString(
        'id-ID'
      )}). Bisa COD di ${selectedCodSpot}?`
    );

    showToast('Pesanan berhasil dibuat! Mengalihkan ke Riwayat Transaksi...');
    setTimeout(() => onNavigate('orders'), 800);
  };

  // 3. Aksi Ajukan Barter (Tercatat ke OrdersPage + ChatPage)
  const handleConfirmBarter = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    const offeredRaw = myBarterItems.find((it) => String(it.id) === String(selectedOfferItemId));
    if (!offeredRaw) {
      alert('Pilih salah satu barang milikmu terlebih dahulu untuk ditawarkan.');
      return;
    }

    const offeredTitle = offeredRaw.title || offeredRaw.nama_barang || 'Barang Penawaran';

    addOrderTransaction({
      userId: currentUser.id,
      sellerId: String(item.ownerId),
      sellerName,
      itemTitle: item.title,
      itemImage: item.image,
      type: 'barter',
      barterOfferTitle: offeredTitle,
      codLocation: selectedCodSpot,
    });

    const noteText = barterNote.trim() ? ` Catatan: "${barterNote.trim()}"` : '';
    const convId = createOrOpenChatRoom(
      `Halo ${sellerName}, saya mengajukan barter "${offeredTitle}" milik saya untuk ditukar dengan "${item.title}". Titik COD: ${selectedCodSpot}.${noteText}`
    );

    setIsBarterModalOpen(false);
    setBarterNote('');
    showToast('Pengajuan barter terkirim & tercatat di Transaksi!');
    setTimeout(() => onNavigate('chat', convId), 700);
  };

  // 4. Aksi Chat Penjual
  const handleChatSeller = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    const convId = createOrOpenChatRoom(
      `Halo ${sellerName}, apakah "${item.title}" masih tersedia?`
    );
    onNavigate('chat', convId);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
      {/* Notifikasi Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Tombol Kembali */}
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1"
      >
        <span>←</span> Kembali ke Katalog
      </button>

      {/* Kontainer Utama Produk */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Foto Barang */}
        <div className="bg-gray-50 relative aspect-square md:aspect-auto md:min-h-[360px]">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {canBuy && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/95 text-emerald-800 shadow-sm">
                Dijual
              </span>
            )}
            {canBarter && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm">
                Bisa Dibarter
              </span>
            )}
          </div>
        </div>

        {/* Informasi & Aksi */}
        <div className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2.5 py-0.5 rounded-md bg-gray-100 font-medium text-gray-700">
                {item.category}
              </span>
              <span>•</span>
              <span>{item.condition}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
              {item.title}
            </h1>

            {canBuy ? (
              <p className="text-2xl font-extrabold" style={{ color: 'var(--color-primary, #567257)' }}>
                Rp {item.price.toLocaleString('id-ID')}
              </p>
            ) : (
              <p className="text-base font-bold text-amber-700">
                Khusus Pertukaran / Barter Barang
              </p>
            )}

            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <span>📍</span> Lokasi Barang: <strong>{item.location}</strong>
            </p>

            {canBarter && (
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">
                  Preferensi Barter Pemilik:
                </span>
                <span className="text-amber-800">{item.wantedItem}</span>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold text-gray-800 mb-1">Deskripsi Barang</h3>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                {item.description}
              </p>
            </div>
          </div>

          {/* Info Pemilik & Rekomendasi Titik COD */}
          <div className="space-y-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  {sellerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-900">{sellerName}</p>
                    {isSellerVerified && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700">
                        UNNES ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">Aktif di sekitar kampus</p>
                </div>
              </div>

              {!isOwnItem && (
                <button
                  onClick={handleChatSeller}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Chat
                </button>
              )}
            </div>

            {/* Pilihan Titik Aman COD */}
            {!isOwnItem && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Pilih Rekomendasi Titik Aman COD:
                </label>
                <select
                  value={selectedCodSpot}
                  onChange={(e) => setSelectedCodSpot(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  {SAFE_COD_SPOTS.map((spot) => (
                    <option key={spot} value={spot}>
                      {spot}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tombol Aksi Transaksi */}
            {isOwnItem ? (
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
                <p className="text-xs text-gray-600 font-medium">
                  Ini adalah barang yang kamu unggah sendiri.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {canBuy && (
                  <>
                    <button
                      onClick={handleAddToCart}
                      className="py-3 px-4 rounded-xl text-xs font-bold border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-[0.99] transition-all"
                    >
                      + Keranjang
                    </button>
                    <button
                      onClick={handleDirectBuy}
                      className="py-3 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all"
                      style={{ background: 'var(--color-primary, #567257)' }}
                    >
                      Beli Langsung (COD)
                    </button>
                  </>
                )}

                {canBarter && (
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('login');
                        return;
                      }
                      setSelectedOfferItemId(myBarterItems[0]?.id ? String(myBarterItems[0].id) : '');
                      setIsBarterModalOpen(true);
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all ${
                      canBuy ? 'sm:col-span-2' : 'col-span-full'
                    }`}
                    style={{ background: 'var(--color-accent, #D97706)' }}
                  >
                    Ajukan Barter Barang
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Pengajuan Barter */}
      {isBarterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Ajukan Pertukaran Barang</h3>
              <button
                onClick={() => setIsBarterModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
              Kamu akan menukar barangmu dengan <strong>{item.title}</strong> milik{' '}
              <strong>{sellerName}</strong> di <strong>{selectedCodSpot}</strong>.
            </div>

            {myBarterItems.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-gray-500">
                  Kamu belum memiliki barang di inventaris untuk ditawarkan barter.
                </p>
                {onOpenAddItem && (
                  <button
                    onClick={() => {
                      setIsBarterModalOpen(false);
                      onOpenAddItem();
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: 'var(--color-primary, #567257)' }}
                  >
                    + Unggah Barangmu Dulu
                  </button>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Pilih Barang Milikmu yang Ditawarkan:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {myBarterItems.map((myIt) => {
                      const isSelected = String(selectedOfferItemId) === String(myIt.id);
                      return (
                        <label
                          key={myIt.id}
                          onClick={() => setSelectedOfferItemId(String(myIt.id))}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="offerItem"
                            checked={isSelected}
                            onChange={() => setSelectedOfferItemId(String(myIt.id))}
                            className="accent-amber-600"
                          />
                          <img
                            src={myIt.image || myIt.foto || '/assets/seed-images/placeholder.svg'}
                            alt={myIt.title || myIt.nama_barang}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {myIt.title || myIt.nama_barang}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Estimasi Rp {Number(myIt.price ?? myIt.harga ?? 0).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pesan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={barterNote}
                    onChange={(e) => setBarterNote(e.target.value)}
                    placeholder="Contoh: Kondisi mulus 95%, siap COD sore ini..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <button
                  onClick={handleConfirmBarter}
                  className="w-full py-3 rounded-xl text-xs font-bold text-white shadow-sm"
                  style={{ background: 'var(--color-accent, #D97706)' }}
                >
                  Kirim Penawaran Barter
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}