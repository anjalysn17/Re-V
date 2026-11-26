import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { addOrderTransaction } from './OrdersPage';
import {
  UNNES_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getGroupedLocations,
} from '../constants/locations';

interface ProductDetailProps {
  productId?: string;
  onNavigate: (page: string, params?: any, extraParam?: string) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

const ITEM_CATEGORIES = [
  'Elektronik',
  'Buku & Alat Tulis',
  'Fashion',
  'Perlengkapan',
  'Tas',
] as const;

const ITEM_CONDITIONS = [
  'Baru',
  'Grade A (Seperti Baru)',
  'Grade B (Bekas Layak Pakai)',
  'Grade C (Bekas dengan Cacat Minor)',
] as const;

function parseCleanPrice(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }
  if (typeof value === 'string') {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly ? Number(digitsOnly) : 0;
  }
  return 0;
}

function formatRupiahInput(value: string | number): string {
  const numeric = parseCleanPrice(value);
  return numeric > 0 ? numeric.toLocaleString('id-ID') : '';
}

export default function ProductDetail({
  productId,
  onNavigate,
  onOpenAddItem,
  onCartUpdated,
}: ProductDetailProps) {
  const { currentUser, openAuthModal } = useAuth();

  const groupedLocations = getGroupedLocations();
  const defaultLocObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(defaultLocObj.name);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState<boolean>(false);
  const [selectedOfferItemId, setSelectedOfferItemId] = useState<string>('');
  const [barterNote, setBarterNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // State Modal Edit Barang
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>(ITEM_CATEGORIES[0]);
  const [editCondition, setEditCondition] = useState<string>(ITEM_CONDITIONS[1]);
  const [editLocation, setEditLocation] = useState<string>(defaultLocObj.name);
  const [editTransactionType, setEditTransactionType] = useState<'jual' | 'barter' | 'keduanya'>('jual');
  const [editPriceInput, setEditPriceInput] = useState<string>('');
  const [editWantedItem, setEditWantedItem] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIsSold, setEditIsSold] = useState<boolean>(false);

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];
  const allUsers: any[] = db.users || [];

  const rawItem = useMemo(() => {
    if (!allItems.length) return null;
    if (productId) {
      const found = allItems.find((it) => String(it.id) === String(productId));
      if (found) return found;
    }
    return allItems[0];
  }, [allItems, productId]);

  const myBarterItems = useMemo(() => {
    if (!currentUser || !rawItem) return [];
    return allItems.filter((it) => {
      const uid = it.id_pemilik ?? it.id_user ?? it.sellerId ?? it.ownerId;
      const isSold = it.status === 'sold' || Boolean(it.terjual);
      return (
        String(uid) === String(currentUser.id) &&
        String(it.id) !== String(rawItem.id) &&
        !isSold
      );
    });
  }, [allItems, currentUser, rawItem]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const persistDB = (updatedDB: any) => {
    dbService.saveDB(updatedDB);
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
            type="button"
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

  const rawStatus = String(rawItem.status || '').toLowerCase();
  const isSold = rawStatus === 'sold' || Boolean(rawItem.terjual);

  const normalizedMode = String(
    rawItem.transactionType ||
      (rawStatus !== 'sold' && rawStatus !== 'available' ? rawStatus : '') ||
      rawItem.tipe_transaksi ||
      rawItem.mode ||
      'keduanya'
  ).toLowerCase();

  const item = {
    id: rawItem.id,
    title: rawItem.nama || rawItem.title || rawItem.nama_barang || 'Barang Mahasiswa UNNES',
    description:
      rawItem.deskripsi ||
      rawItem.description ||
      'Barang masih sangat layak pakai, siap COD di area sekitar kampus UNNES Gunungpati.',
    price: parseCleanPrice(rawItem.harga ?? rawItem.price ?? 0),
    category: rawItem.kategori || rawItem.category || 'Perlengkapan',
    condition: rawItem.kondisi || rawItem.condition || ITEM_CONDITIONS[1],
    location: rawItem.lokasi || rawItem.location || defaultLocObj.name,
    image: rawItem.foto || rawItem.image || '/assets/seed-images/placeholder.svg',
    ownerId: rawItem.id_pemilik ?? rawItem.id_user ?? rawItem.sellerId ?? rawItem.ownerId ?? 'USR-001',
    transactionMode: normalizedMode,
    wantedItem: rawItem.barang_dicari || rawItem.wantedItem || 'Perlengkapan kos / buku kuliah',
  };

  const seller = allUsers.find((u) => String(u.id) === String(item.ownerId));
  const sellerName =
    seller?.nama || seller?.name || rawItem.sellerName || rawItem.ownerName || 'Mahasiswa UNNES';
  const isSellerVerified = Boolean(seller?.is_verified);

  const isOwnItem = Boolean(currentUser && String(currentUser.id) === String(item.ownerId));

  const isBothMode = item.transactionMode === 'keduanya' || item.transactionMode === 'both';
  const canBuy =
    isBothMode ||
    item.transactionMode.includes('jual') ||
    item.transactionMode.includes('sell') ||
    (!item.transactionMode && item.price > 0);
  const canBarter =
    isBothMode ||
    item.transactionMode.includes('barter') ||
    Boolean(rawItem.canBarter);

  // Kalkulasi selisih harga otomatis untuk preview di modal barter
  const selectedOfferItem = myBarterItems.find(
    (it) => String(it.id) === String(selectedOfferItemId)
  );
  const selectedOfferPrice = selectedOfferItem
    ? parseCleanPrice(selectedOfferItem.harga ?? selectedOfferItem.price ?? 0)
    : 0;
  const priceDiff = item.price - selectedOfferPrice;

  const handleOpenEditModal = () => {
    setEditTitle(item.title);
    setEditCategory(
      ITEM_CATEGORIES.includes(item.category as any) ? item.category : ITEM_CATEGORIES[3]
    );
    setEditCondition(item.condition);
    setEditLocation(item.location);

    const initialOfferType: 'jual' | 'barter' | 'keduanya' = isBothMode
      ? 'keduanya'
      : canBarter && !canBuy
      ? 'barter'
      : 'jual';
    setEditTransactionType(initialOfferType);
    setEditPriceInput(item.price > 0 ? item.price.toLocaleString('id-ID') : '');
    setEditWantedItem(item.wantedItem);
    setEditDescription(item.description);
    setEditIsSold(isSold);
    setIsEditModalOpen(true);
  };

  const handleSaveEditItem = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      alert('Nama barang tidak boleh kosong.');
      return;
    }

    const cleanPrice = editTransactionType === 'barter' ? 0 : parseCleanPrice(editPriceInput);
    if ((editTransactionType === 'jual' || editTransactionType === 'keduanya') && cleanPrice <= 0) {
      alert('Masukkan nominal harga yang valid untuk barang yang dijual.');
      return;
    }

    const latestDB = dbService.getDB() as any;
    const updatedItems = (latestDB.items || []).map((it: any) => {
      if (String(it.id) !== String(item.id)) return it;

      const nextStatus = editIsSold ? 'sold' : editTransactionType;
      const { koordinat: _dropCoords, ...restIt } = it;
      return {
        ...restIt,
        nama: trimmedTitle,
        deskripsi: editDescription.trim() || it.deskripsi,
        harga: cleanPrice,
        kategori: editCategory,
        kondisi: editCondition,
        lokasi: editLocation,
        status: nextStatus,
        terjual: editIsSold,
        barang_dicari: editWantedItem.trim(),
        title: trimmedTitle,
        nama_barang: trimmedTitle,
        description: editDescription.trim() || it.description,
        price: cleanPrice,
        category: editCategory,
        condition: editCondition,
        location: editLocation,
        transactionType: editTransactionType,
        wantedItem: editWantedItem.trim(),
        updatedAt: new Date().toISOString(),
      };
    });

    persistDB({
      ...latestDB,
      items: updatedItems,
    });

    setIsEditModalOpen(false);
    showToast('Perubahan barang berhasil disimpan!');
  };

  // Helper membuat/membuka ruang chat & mengirim pesan (termasuk metadata barter)
  const createOrOpenChatRoom = (
    initialText?: string,
    extraMessageData?: Record<string, any>
  ): string => {
    const latestDB = dbService.getDB() as any;
    const conversations: any[] = [...(latestDB.conversations || [])];
    const messages: any[] = [...(latestDB.messages || [])];

    const buyerId = String(currentUser!.id);
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

    const convId = existingConv
      ? String(existingConv.id)
      : dbService.generateId('CONV');

    const nowIso = new Date().toISOString();
    const previewMsg = initialText || `Halo, saya tertarik dengan ${item.title}`;

    if (!existingConv) {
      existingConv = {
        id: convId,
        participants: [buyerId, sellerId],
        id_pembeli: buyerId,
        id_penjual: sellerId,
        buyerId,
        sellerId,
        buyerName: currentUser!.nama || (currentUser as any).name || 'Saya',
        sellerName,
        id_barang: item.id,
        itemId: item.id,
        itemTitle: item.title,
        itemImage: item.image,
        itemPrice: item.price,
        pesan_terakhir: previewMsg,
        lastMessage: previewMsg,
        updatedAt: nowIso,
      };
      conversations.unshift(existingConv);
    } else {
      existingConv.id_barang = item.id;
      existingConv.itemId = item.id;
      existingConv.itemTitle = item.title;
      existingConv.itemImage = item.image;
      existingConv.itemPrice = item.price;
      if (initialText) {
        existingConv.pesan_terakhir = initialText;
        existingConv.lastMessage = initialText;
      }
      existingConv.updatedAt = nowIso;
    }

    if (initialText) {
      messages.push({
        id: dbService.generateId('MSG'),
        id_percakapan: convId,
        conversationId: convId,
        id_pengirim: buyerId,
        senderId: buyerId,
        senderName: currentUser!.nama || (currentUser as any).name || 'Saya',
        isi: initialText,
        text: initialText,
        waktu: nowIso,
        createdAt: nowIso,
        ...(extraMessageData || {}),
      });
    }

    persistDB({
      ...latestDB,
      conversations,
      messages,
    });

    return convId;
  };

  const handleAddToCart = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isSold) {
      showToast('Maaf, barang ini sudah terjual.');
      return;
    }

    const latestDB = dbService.getDB() as any;
    const cart: any[] = [...(latestDB.cart || [])];

    const existingIdx = cart.findIndex(
      (c) =>
        String(c.id_user ?? c.userId) === String(currentUser.id) &&
        String(c.id_barang ?? c.id_item ?? c.itemId) === String(item.id)
    );

    if (existingIdx >= 0) {
      const nextQty = (cart[existingIdx].jumlah ?? cart[existingIdx].quantity ?? 1) + 1;
      cart[existingIdx].jumlah = nextQty;
      cart[existingIdx].quantity = nextQty;
    } else {
      cart.push({
        id: dbService.generateId('CRT'),
        id_user: currentUser.id,
        userId: currentUser.id,
        id_barang: item.id,
        id_item: item.id,
        itemId: item.id,
        nama: item.title,
        title: item.title,
        harga: item.price,
        price: item.price,
        foto: item.image,
        image: item.image,
        sellerId: item.ownerId,
        sellerName,
        type: 'beli',
        jumlah: 1,
        quantity: 1,
      });
    }

    persistDB({ ...latestDB, cart });
    if (onCartUpdated) onCartUpdated();
    showToast('Barang berhasil ditambahkan ke keranjang!');
  };

  const handleDirectBuy = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isSold) {
      showToast('Maaf, barang ini sudah terjual.');
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

  // Mengirim pengajuan barter langsung ke ChatPage lengkap dengan selisih harga otomatis
  const handleConfirmBarter = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isSold) {
      showToast('Maaf, barang ini sudah selesai ditransaksikan.');
      return;
    }

    const offeredRaw = myBarterItems.find((it) => String(it.id) === String(selectedOfferItemId));
    if (!offeredRaw) {
      alert('Pilih salah satu barang milikmu terlebih dahulu untuk ditawarkan.');
      return;
    }

    const offeredTitle =
      offeredRaw.nama || offeredRaw.title || offeredRaw.nama_barang || 'Barang Penawaran';
    const offeredPrice = parseCleanPrice(offeredRaw.harga ?? offeredRaw.price ?? 0);
    const offeredImage =
      offeredRaw.foto || offeredRaw.image || '/assets/seed-images/placeholder.svg';
    const diff = item.price - offeredPrice;

    const diffSummary =
      diff > 0
        ? `Estimasi selisih: +Rp ${diff.toLocaleString('id-ID')} (pengaju menambah)`
        : diff < 0
        ? `Estimasi selisih: -Rp ${Math.abs(diff).toLocaleString('id-ID')} (barang penawar lebih mahal)`
        : 'Estimasi selisih: Rp 0 (nilai seimbang)';

    const noteText = barterNote.trim() ? ` Catatan: "${barterNote.trim()}"` : '';
    const messageText = `Pengajuan Barter: "${offeredTitle}" (Rp ${offeredPrice.toLocaleString(
      'id-ID'
    )}) ⇄ "${item.title}" (Rp ${item.price.toLocaleString(
      'id-ID'
    )}). ${diffSummary}. Area COD: ${selectedCodSpot}.${noteText}`;

    const convId = createOrOpenChatRoom(messageText, {
      type: 'barter_offer',
      barterOffer: {
        offeredItemId: String(offeredRaw.id),
        offeredItemTitle: offeredTitle,
        offeredItemPrice: offeredPrice,
        offeredItemImage: offeredImage,
        targetItemId: String(item.id),
        targetItemTitle: item.title,
        targetItemPrice: item.price,
        priceDifference: diff,
        codLocation: selectedCodSpot,
        note: barterNote.trim(),
      },
    });

    setIsBarterModalOpen(false);
    setBarterNote('');
    showToast('Penawaran barter dikirim ke ruang chat!');
    onNavigate('chat', convId);
  };

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

  const hasCustomEditCondition =
    Boolean(editCondition) && !(ITEM_CONDITIONS as readonly string[]).includes(editCondition);

  return (
    <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1"
      >
        <span>←</span> Kembali ke Katalog
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="bg-gray-50 relative aspect-square md:aspect-auto md:min-h-[360px]">
          <img
            src={item.image}
            alt={item.title}
            className={`w-full h-full object-cover ${isSold ? 'opacity-70 grayscale-[30%]' : ''}`}
          />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {isSold ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-900/90 text-white shadow-sm">
                Sudah Terjual / Selesai
              </span>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="px-2.5 py-0.5 rounded-md bg-gray-100 font-medium text-gray-700">
                {item.category}
              </span>
              <span>•</span>
              <span>{item.condition}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug break-words">
              {item.title}
            </h1>

            {canBuy ? (
              <p
                className="text-2xl font-extrabold break-words"
                style={{ color: 'var(--color-primary, #567257)' }}
              >
                Rp {item.price.toLocaleString('id-ID')}
              </p>
            ) : (
              <p className="text-base font-bold text-amber-700">
                Khusus Pertukaran / Barter Barang
              </p>
            )}

            <p className="text-xs text-gray-600 flex items-center gap-1.5">
              <span>📍</span> Area Barang: <strong>{item.location}</strong>
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
                  type="button"
                  onClick={handleChatSeller}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
                >
                  Chat
                </button>
              )}
            </div>

            {!isOwnItem && !isSold && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700">
                  Pilih Area Awal COD (Bisa disesuaikan di Chat):
                </label>
                <select
                  value={selectedCodSpot}
                  onChange={(e) => setSelectedCodSpot(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:border-emerald-600"
                >
                  {groupedLocations.map((group) => (
                    <optgroup key={group.zone} label={group.zone}>
                      {group.locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}

            {isOwnItem ? (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2.5">
                <p className="text-xs text-gray-600 font-medium text-center">
                  Ini adalah barang yang kamu unggah sendiri.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95"
                    style={{ background: 'var(--color-primary, #567257)' }}
                  >
                    Edit Barang
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('my-items')}
                    className="py-2.5 px-3 rounded-xl text-xs font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    Kelola Barang Saya
                  </button>
                </div>
              </div>
            ) : isSold ? (
              <div className="p-3.5 rounded-xl bg-gray-100 border border-gray-200 text-center">
                <p className="text-xs font-bold text-gray-700">
                  Barang ini sudah terjual atau selesai dibarter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {canBuy && (
                  <>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="py-3 px-4 rounded-xl text-xs font-bold border border-gray-300 text-gray-800 hover:bg-gray-50 active:scale-[0.99] transition-all touch-manipulation"
                    >
                      + Keranjang
                    </button>
                    <button
                      type="button"
                      onClick={handleDirectBuy}
                      className="py-3 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all touch-manipulation"
                      style={{ background: 'var(--color-primary, #567257)' }}
                    >
                      Beli Langsung (COD)
                    </button>
                  </>
                )}

                {canBarter && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('login');
                        return;
                      }
                      setSelectedOfferItemId(myBarterItems[0]?.id ? String(myBarterItems[0].id) : '');
                      setIsBarterModalOpen(true);
                    }}
                    className={`py-3.5 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all touch-manipulation ${
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

      {/* Modal Edit Barang */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Detail Barang</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Barang</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kategori</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {ITEM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kondisi</label>
                  <select
                    value={editCondition}
                    onChange={(e) => setEditCondition(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
                  >
                    {hasCustomEditCondition && (
                      <option value={editCondition}>{editCondition}</option>
                    )}
                    {ITEM_CONDITIONS.map((cond) => (
                      <option key={cond} value={cond}>
                        {cond}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Area Barang / Lokasi COD
                </label>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
                >
                  {!UNNES_LOCATIONS.some((l) => l.name === editLocation) && (
                    <option value={editLocation}>{editLocation}</option>
                  )}
                  {groupedLocations.map((group) => (
                    <optgroup key={group.zone} label={group.zone}>
                      {group.locations.map((loc) => (
                        <option key={loc.id} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Penawaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: 'jual', label: 'Dijual' },
                      { value: 'barter', label: 'Barter' },
                      { value: 'keduanya', label: 'Jual / Barter' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setEditTransactionType(opt.value)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors ${
                        editTransactionType === opt.value
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {(editTransactionType === 'jual' || editTransactionType === 'keduanya') && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Harga Jual (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editPriceInput}
                      onChange={(e) => setEditPriceInput(formatRupiahInput(e.target.value))}
                      placeholder="Contoh: 150.000"
                      className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {(editTransactionType === 'barter' || editTransactionType === 'keduanya') && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Preferensi Barang Barter
                  </label>
                  <input
                    type="text"
                    value={editWantedItem}
                    onChange={(e) => setEditWantedItem(e.target.value)}
                    placeholder="Contoh: Buku kalkulus / lampu belajar"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editIsSold}
                  onChange={(e) => setEditIsSold(e.target.checked)}
                  className="accent-emerald-700"
                />
                <span className="text-xs font-semibold text-gray-700">
                  Tandai barang ini sudah terjual / selesai dibarter
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEditItem}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengajuan Barter (Mobile-friendly z-[60] + Kalkulasi Selisih Harga Otomatis) */}
      {isBarterModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsBarterModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 space-y-4 max-h-[88vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Ajukan Pertukaran Barang</h3>
              <button
                type="button"
                onClick={() => setIsBarterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 text-sm font-bold flex items-center justify-center touch-manipulation"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
              Kamu akan menukar barangmu dengan <strong>{item.title}</strong> (Rp{' '}
              {item.price.toLocaleString('id-ID')}) milik <strong>{sellerName}</strong>.
            </div>

            {myBarterItems.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-xs text-gray-500">
                  Kamu belum memiliki barang aktif di inventaris untuk ditawarkan barter.
                </p>
                {onOpenAddItem && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBarterModalOpen(false);
                      onOpenAddItem();
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
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
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {myBarterItems.map((myIt) => {
                      const isSelected = String(selectedOfferItemId) === String(myIt.id);
                      const myTitle = myIt.nama || myIt.title || myIt.nama_barang;
                      const myPrice = parseCleanPrice(myIt.harga ?? myIt.price ?? 0);
                      return (
                        <button
                          type="button"
                          key={myIt.id}
                          onClick={() => setSelectedOfferItemId(String(myIt.id))}
                          className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors touch-manipulation ${
                            isSelected
                              ? 'border-amber-500 bg-amber-50/70'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-amber-600' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-amber-600" />
                            )}
                          </span>
                          <img
                            src={myIt.foto || myIt.image || '/assets/seed-images/placeholder.svg'}
                            alt={myTitle}
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{myTitle}</p>
                            <p className="text-[11px] text-gray-500">
                              Estimasi Rp {myPrice.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Kalkulasi Selisih Perkiraan Harga Otomatis */}
                {selectedOfferItem && (
                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 space-y-1 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span>Harga Barang Target:</span>
                      <span className="font-semibold">Rp {item.price.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Harga Barangmu:</span>
                      <span className="font-semibold">
                        Rp {selectedOfferPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="pt-1.5 mt-1 border-t border-amber-200/70 flex justify-between items-center font-bold">
                      <span className="text-amber-900">Perkiraan Selisih:</span>
                      <span className="text-amber-800">
                        {priceDiff > 0
                          ? `Kamu tambah Rp ${priceDiff.toLocaleString('id-ID')}`
                          : priceDiff < 0
                          ? `Lawan tambah Rp ${Math.abs(priceDiff).toLocaleString('id-ID')}`
                          : 'Impas (Rp 0)'}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Pesan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={barterNote}
                    onChange={(e) => setBarterNote(e.target.value)}
                    placeholder="Contoh: Kondisi mulus 95%, siap COD sore ini..."
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleConfirmBarter}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-[0.99] touch-manipulation"
                  style={{ background: 'var(--color-accent, #D97706)' }}
                >
                  Kirim Penawaran Barter ke Chat
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}