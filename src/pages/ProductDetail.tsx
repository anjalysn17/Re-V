import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
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

function parseCleanPrice(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    if (/^\d+\.\d{1,2}$/.test(trimmed)) {
      return Math.max(0, Math.round(Number(trimmed)));
    }
    const digits = trimmed.replace(/\D/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
}

function resolveGrade(kondisi?: string): { grade: 'A' | 'B' | 'C'; label: string } {
  const val = String(kondisi || '').trim();
  if (!val) return { grade: 'A', label: 'Grade A - Seperti Baru' };
  if (/\bGrade\s*C\b/i.test(val) || val === 'C' || /cacat minor|layak pakai/i.test(val)) {
    return { grade: 'C', label: val.includes('Grade') ? val : 'Grade C - Cacat Minor' };
  }
  if (/\bGrade\s*B\b/i.test(val) || val === 'B' || /baik/i.test(val)) {
    return { grade: 'B', label: val.includes('Grade') ? val : 'Grade B - Layak Pakai / Baik' };
  }
  return { grade: 'A', label: val.includes('Grade') ? val : 'Grade A - Seperti Baru' };
}

export default function ProductDetail({
  productId,
  onNavigate,
  onOpenAddItem,
  onCartUpdated,
}: ProductDetailProps) {
  const { currentUser, openAuthModal } = useAuth() as any;

  const groupedLocations = getGroupedLocations();
  const defaultLocObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string>('');
  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(defaultLocObj.name);
  const [barterNote, setBarterNote] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [, setRefresh] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3200);
  };

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];
  const allUsers: any[] = db.users || [];

  const product = useMemo(() => {
    if (!allItems.length) return null;
    if (productId) {
      const found = allItems.find((it) => String(it.id) === String(productId));
      if (found) return found;
    }
    return allItems[0];
  }, [allItems, productId]);

  const myItems = useMemo(() => {
    if (!currentUser) return [];
    return allItems.filter((it) => {
      const ownerId = it.id_pemilik ?? it.id_user ?? it.sellerId ?? it.ownerId;
      const isSold =
        it.terjual === true ||
        it.isSold === true ||
        ['sold', 'terjual', 'dibarter'].includes(String(it.status || '').toLowerCase());
      return String(ownerId) === String(currentUser.id) && !isSold;
    });
  }, [allItems, currentUser]);

  useEffect(() => {
    if (myItems.length > 0 && !myItems.some((m) => String(m.id) === String(selectedMyItemId))) {
      setSelectedMyItemId(String(myItems[0].id));
    }
  }, [myItems, selectedMyItemId]);

  if (!product) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Barang Tidak Ditemukan</h2>
          <p className="text-xs text-gray-500">
            Barang yang kamu cari mungkin sudah dihapus atau belum tersedia di katalog.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="min-h-[42px] px-5 py-2.5 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  const sellerId = String(
    product.id_pemilik ?? product.id_user ?? product.sellerId ?? product.ownerId ?? 'USR-001'
  );
  const sellerObj = allUsers.find((u) => String(u.id) === sellerId);
  const sellerName =
    sellerObj?.nama || sellerObj?.name || product.sellerName || product.ownerName || 'Mahasiswa UNNES';
  const sellerVerified = Boolean(sellerObj?.is_verified ?? true);

  const isOwner = Boolean(currentUser && String(currentUser.id) === sellerId);
  const rawStatus = String(product.status || '').toLowerCase();
  const isSold =
    product.terjual === true ||
    product.isSold === true ||
    rawStatus === 'sold' ||
    rawStatus === 'terjual' ||
    rawStatus === 'dibarter';

  const offerMode = String(
    product.transactionType ||
      (['jual', 'barter', 'keduanya'].includes(rawStatus) ? rawStatus : 'keduanya')
  ).toLowerCase();
  const canBuy = offerMode === 'jual' || offerMode === 'keduanya' || offerMode === 'both';
  const canBarter =
    offerMode.includes('barter') ||
    offerMode === 'keduanya' ||
    offerMode === 'both' ||
    Boolean(product.canBarter);

  const itemTitle = product.nama || product.title || product.nama_barang || 'Barang Kampus';
  const itemPrice = parseCleanPrice(product.harga ?? product.price ?? 0);
  const itemImage = product.foto || product.image || '/assets/seed-images/placeholder.svg';
  const itemCategory = product.kategori || product.category || 'Umum';
  const itemLocation = product.lokasi || product.location || defaultLocObj.name;
  const itemDescription =
    product.deskripsi ||
    product.description ||
    'Barang bekas layak pakai area sekitar kampus UNNES. Siap dicek langsung saat pertemuan COD.';
  const gradeInfo = resolveGrade(product.kondisi);

  // Tambah barang ke Keranjang COD
  const handleAddToCart = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwner) {
      showToast('Ini adalah barang milikmu sendiri.');
      return;
    }
    if (isSold) {
      showToast('Maaf, barang ini sudah terjual.');
      return;
    }

    const latestDB = dbService.getDB() as any;
    const currentCart: any[] = [...(latestDB.cart || [])];
    const alreadyExists = currentCart.some(
      (c) =>
        String(c.id_user) === String(currentUser.id) &&
        String(c.id_barang) === String(product.id)
    );

    if (alreadyExists) {
      showToast('Barang sudah ada di keranjangmu.');
      return;
    }

    currentCart.push({
      id: dbService.generateId('CART'),
      id_user: String(currentUser.id),
      id_barang: String(product.id),
      jumlah: 1,
      ditambahkan_pada: new Date().toISOString(),
    });

    dbService.saveDB({ ...latestDB, cart: currentCart });
    setRefresh((prev) => prev + 1);
    if (onCartUpdated) onCartUpdated();
    showToast('Berhasil ditambahkan ke Keranjang!');
  };

  // Buka atau buat percakapan chat dengan pemilik barang
  const handleStartChat = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwner) {
      onNavigate('my-items');
      return;
    }

    const latestDB = dbService.getDB() as any;
    const conversations: any[] = [...(latestDB.conversations || [])];
    const messages: any[] = [...(latestDB.messages || [])];

    const buyerId = String(currentUser.id);
    const nowIso = new Date().toISOString();

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

    const convId = existingConv ? String(existingConv.id) : dbService.generateId('CONV');
    const introText = `Halo kak ${sellerName}, apakah "${itemTitle}" masih tersedia untuk COD di ${itemLocation}?`;

    if (!existingConv) {
      existingConv = {
        id: convId,
        participants: [buyerId, sellerId],
        id_pembeli: buyerId,
        id_penjual: sellerId,
        buyerId,
        sellerId,
        buyerName: currentUser.nama || currentUser.name || 'Saya',
        sellerName,
        id_barang: product.id,
        itemId: product.id,
        itemTitle,
        itemImage,
        itemPrice,
        pesan_terakhir: introText,
        lastMessage: introText,
        updatedAt: nowIso,
      };
      conversations.unshift(existingConv);

      messages.push({
        id: dbService.generateId('MSG'),
        id_percakapan: convId,
        conversationId: convId,
        id_pengirim: buyerId,
        senderId: buyerId,
        senderName: currentUser.nama || currentUser.name || 'Saya',
        isi: introText,
        text: introText,
        waktu: nowIso,
        createdAt: nowIso,
      });
    } else {
      existingConv.id_barang = product.id;
      existingConv.itemId = product.id;
      existingConv.itemTitle = itemTitle;
      existingConv.itemImage = itemImage;
      existingConv.itemPrice = itemPrice;
      existingConv.updatedAt = nowIso;
    }

    dbService.saveDB({ ...latestDB, conversations, messages });
    onNavigate('chat', convId);
  };

  // Buka modal penawaran barter
  const handleOpenBarterModal = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (isOwner) {
      showToast('Kamu tidak dapat membarter barangmu sendiri.');
      return;
    }
    if (isSold) {
      showToast('Barang ini sudah terjual/dibarter.');
      return;
    }
    if (myItems.length === 0) {
      alert('Unggah minimal 1 barang milikmu terlebih dahulu untuk mengajukan barter.');
      if (onOpenAddItem) onOpenAddItem();
      return;
    }
    setIsBarterModalOpen(true);
  };

  // Konfirmasi & kirim penawaran barter ke Chat + Notifikasi penjual
  const handleConfirmBarter = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    const offeredItem = myItems.find((m) => String(m.id) === String(selectedMyItemId));
    if (!offeredItem) {
      showToast('Pilih salah satu barang milikmu untuk ditukar.');
      return;
    }

    const offeredTitle =
      offeredItem.nama || offeredItem.title || offeredItem.nama_barang || 'Barang Saya';
    const offeredPrice = parseCleanPrice(offeredItem.harga ?? offeredItem.price ?? 0);
    const offeredImage =
      offeredItem.foto || offeredItem.image || '/assets/seed-images/placeholder.svg';

    const diff = itemPrice - offeredPrice;
    const diffSummary =
      diff > 0
        ? `Estimasi selisih: +Rp ${diff.toLocaleString('id-ID')} (pengaju menambah)`
        : diff < 0
        ? `Estimasi selisih: -Rp ${Math.abs(diff).toLocaleString('id-ID')} (barang penawar lebih mahal)`
        : 'Estimasi selisih: Rp 0 (nilai seimbang)';

    const noteSuffix = barterNote.trim() ? ` Catatan: "${barterNote.trim()}"` : '';
    const barterMsgText = `[Penawaran Barter] Saya ingin menukar "${offeredTitle}" (Rp ${offeredPrice.toLocaleString(
      'id-ID'
    )}) dengan "${itemTitle}" (Rp ${itemPrice.toLocaleString(
      'id-ID'
    )}). ${diffSummary}. Usulan COD: ${selectedCodSpot}.${noteSuffix}`;

    const latestDB = dbService.getDB() as any;
    const conversations: any[] = [...(latestDB.conversations || [])];
    const messages: any[] = [...(latestDB.messages || [])];

    const buyerId = String(currentUser.id);
    const nowIso = new Date().toISOString();

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

    const convId = existingConv ? String(existingConv.id) : dbService.generateId('CONV');

    if (!existingConv) {
      existingConv = {
        id: convId,
        participants: [buyerId, sellerId],
        id_pembeli: buyerId,
        id_penjual: sellerId,
        buyerId,
        sellerId,
        buyerName: currentUser.nama || currentUser.name || 'Saya',
        sellerName,
        id_barang: product.id,
        itemId: product.id,
        itemTitle,
        itemImage,
        itemPrice,
        pesan_terakhir: barterMsgText,
        lastMessage: barterMsgText,
        updatedAt: nowIso,
      };
      conversations.unshift(existingConv);
    } else {
      existingConv.id_barang = product.id;
      existingConv.itemId = product.id;
      existingConv.itemTitle = itemTitle;
      existingConv.itemImage = itemImage;
      existingConv.itemPrice = itemPrice;
      existingConv.pesan_terakhir = barterMsgText;
      existingConv.lastMessage = barterMsgText;
      existingConv.updatedAt = nowIso;
    }

    messages.push({
      id: dbService.generateId('MSG'),
      id_percakapan: convId,
      conversationId: convId,
      id_pengirim: buyerId,
      senderId: buyerId,
      senderName: currentUser.nama || currentUser.name || 'Saya',
      isi: barterMsgText,
      text: barterMsgText,
      waktu: nowIso,
      createdAt: nowIso,
      type: 'barter_offer',
      barterOffer: {
        offeredItemId: String(offeredItem.id),
        offeredItemTitle: offeredTitle,
        offeredItemPrice: offeredPrice,
        offeredItemImage: offeredImage,
        targetItemId: String(product.id),
        targetItemTitle: itemTitle,
        targetItemPrice: itemPrice,
        priceDifference: diff,
        codLocation: selectedCodSpot,
        note: barterNote.trim(),
      },
    });

    dbService.saveDB({ ...latestDB, conversations, messages });

    // Kirim notifikasi lonceng ke pemilik barang
    dbService.pushNotification({
      userId: sellerId,
      tipe: 'barter',
      teks: `${currentUser.nama || 'Pengguna'} mengajukan barter "${offeredTitle}" untuk "${itemTitle}".`,
      link_page: 'chat',
      target_id: convId,
    });

    setIsBarterModalOpen(false);
    setBarterNote('');
    onNavigate('chat', convId);
  };

  const selectedOfferedItem = myItems.find((m) => String(m.id) === String(selectedMyItemId));
  const selectedOfferedPrice = parseCleanPrice(
    selectedOfferedItem?.harga ?? selectedOfferedItem?.price ?? 0
  );
  const priceDifference = itemPrice - selectedOfferedPrice;

  // Barang serupa dari kategori yang sama
  const relatedProducts = useMemo(() => {
    return allItems
      .filter((it) => {
        if (String(it.id) === String(product.id)) return false;
        const cat = String(it.kategori || it.category || '').toLowerCase();
        return cat === String(itemCategory).toLowerCase();
      })
      .slice(0, 4);
  }, [allItems, product.id, itemCategory]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 space-y-6">
      {/* Toast Notifikasi */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl bg-gray-900 text-white text-xs font-semibold shadow-lg">
          {toastMessage}
        </div>
      )}

      {/* Breadcrumb & Tombol Kembali */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 py-1 touch-manipulation"
        >
          <span>←</span> Kembali ke Katalog
        </button>
        <button
          type="button"
          onClick={() => onNavigate('category', itemCategory)}
          className="text-xs font-semibold hover:underline touch-manipulation"
          style={{ color: 'var(--color-primary, #567257)' }}
        >
          Kategori: {itemCategory}
        </button>
      </div>

      {/* Kartu Utama Detail Produk */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-2"
        style={{ background: 'var(--color-card, #ffffff)', borderColor: 'var(--color-border)' }}
      >
        {/* Kolom Foto Barang */}
        <div className="relative bg-gray-100 aspect-square md:aspect-auto md:min-h-[400px] flex items-center justify-center overflow-hidden">
          <img
            src={itemImage}
            alt={itemTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/assets/seed-images/placeholder.svg';
            }}
          />

          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
              style={{
                background:
                  gradeInfo.grade === 'A'
                    ? 'var(--color-primary, #567257)'
                    : gradeInfo.grade === 'B'
                    ? '#c9852b'
                    : '#b45309',
              }}
            >
              Grade {gradeInfo.grade}
            </span>
            {canBarter && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/70 text-white shadow-sm">
                Bisa Barter
              </span>
            )}
            {isSold && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm">
                Sudah Terjual
              </span>
            )}
          </div>
        </div>

        {/* Kolom Informasi & Tombol Aksi */}
        <div className="p-5 sm:p-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-700">
                  {itemCategory}
                </span>
                <span>•</span>
                <span>{gradeInfo.label}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
                {itemTitle}
              </h1>

              <p
                className="text-2xl sm:text-3xl font-black pt-1"
                style={{
                  color: 'var(--color-accent, #D97706)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {itemPrice === 0 && offerMode === 'barter'
                  ? 'Khusus Barter'
                  : `Rp ${itemPrice.toLocaleString('id-ID')}`}
              </p>
            </div>

            {/* Info Lokasi COD */}
            <div className="p-3.5 rounded-xl bg-[#f7f4ee] border border-[#e6dfd3] flex items-start gap-2.5">
              <svg
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: 'var(--color-primary, #567257)' }}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-xs">
                <p className="font-bold text-gray-800">Area COD: {itemLocation}</p>
                <p className="text-gray-600 mt-0.5">
                  Metode transaksi tatap muka langsung (COD) di sekitar kampus. Cek kondisi barang sebelum bayar atau tukar.
                </p>
              </div>
            </div>

            {/* Deskripsi Barang */}
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Deskripsi Barang
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {itemDescription}
              </p>
            </div>

            {/* Kartu Pemilik / Penjual */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  {sellerName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-900 truncate">{sellerName}</p>
                    {sellerVerified && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Terverifikasi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">Komunitas Kampus • {itemLocation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Transaksi */}
          <div className="pt-3 border-t border-gray-100 space-y-2.5">
            {isOwner ? (
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => onNavigate('my-items')}
                  className="min-h-[44px] flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white touch-manipulation"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Kelola di Barang Saya
                </button>
              </div>
            ) : isSold ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center text-xs font-bold text-red-700">
                Barang ini sudah terjual atau selesai dibarter.
              </div>
            ) : (
              <>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartChat}
                    className="min-h-[44px] flex-1 py-3 px-4 rounded-xl text-xs font-bold border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 transition-colors touch-manipulation"
                  >
                    💬 Chat Penjual
                  </button>

                  {canBarter && (
                    <button
                      type="button"
                      onClick={handleOpenBarterModal}
                      className="min-h-[44px] flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity touch-manipulation"
                      style={{ background: 'var(--color-accent, #D97706)' }}
                    >
                      ⇄ Ajukan Barter
                    </button>
                  )}
                </div>

                {canBuy && (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="min-h-[46px] w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition-opacity touch-manipulation"
                    style={{ background: 'var(--color-primary, #567257)' }}
                  >
                    + Tambah ke Keranjang COD
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barang Serupa */}
      {relatedProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-bold text-gray-900">Barang Serupa di {itemCategory}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {relatedProducts.map((rel) => {
              const relPrice = parseCleanPrice(rel.harga ?? rel.price ?? 0);
              return (
                <button
                  type="button"
                  key={rel.id}
                  onClick={() => onNavigate('product', { productId: String(rel.id) })}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden text-left hover:shadow-md transition-all touch-manipulation"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    <img
                      src={rel.foto || rel.image || '/assets/seed-images/placeholder.svg'}
                      alt={rel.nama || rel.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">
                      {rel.nama || rel.title || rel.nama_barang}
                    </p>
                    <p
                      className="text-xs font-black mt-1"
                      style={{ color: 'var(--color-accent, #D97706)' }}
                    >
                      Rp {relPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Penawaran Barter */}
      {isBarterModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsBarterModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-8 sm:pb-6 space-y-4 max-h-[88dvh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Ajukan Penawaran Barter</h3>
                <p className="text-[11px] text-gray-500">Tukar dengan barang milikmu</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBarterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 font-bold flex items-center justify-center touch-manipulation"
              >
                ✕
              </button>
            </div>

            {/* Target Barang */}
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
              <img
                src={itemImage}
                alt={itemTitle}
                className="w-12 h-12 rounded-lg object-cover bg-white shrink-0"
              />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-500">Barang yang diinginkan:</p>
                <p className="text-xs font-bold text-gray-900 truncate">{itemTitle}</p>
                <p className="text-xs font-semibold text-gray-700">
                  Nilai: Rp {itemPrice.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Pilih Barang Milik Pengguna */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Pilih Barangmu untuk Ditukar:
              </label>
              <select
                value={selectedMyItemId}
                onChange={(e) => setSelectedMyItemId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
              >
                {myItems.map((m) => {
                  const mPrice = parseCleanPrice(m.harga ?? m.price ?? 0);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.nama || m.title || m.nama_barang} (Rp {mPrice.toLocaleString('id-ID')})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Estimasi Selisih Nilai */}
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">Perkiraan Selisih Nilai:</span>
              <span className="font-bold text-amber-800">
                {priceDifference > 0
                  ? `Kamu tambah Rp ${priceDifference.toLocaleString('id-ID')}`
                  : priceDifference < 0
                  ? `Pemilik tambah Rp ${Math.abs(priceDifference).toLocaleString('id-ID')}`
                  : 'Impas (Rp 0)'}
              </span>
            </div>

            {/* Pilih Area COD */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Usulan Lokasi COD:
              </label>
              <select
                value={selectedCodSpot}
                onChange={(e) => setSelectedCodSpot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
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

            {/* Catatan Tambahan */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Catatan untuk {sellerName} (Opsional):
              </label>
              <input
                type="text"
                value={barterNote}
                onChange={(e) => setBarterNote(e.target.value)}
                placeholder="Misal: Bisa ketemu sore ini di Gerbang UNNES..."
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBarterModalOpen(false)}
                className="min-h-[44px] flex-1 py-3 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 touch-manipulation"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBarter}
                className="min-h-[44px] flex-1 py-3 rounded-xl text-xs font-bold text-white touch-manipulation"
                style={{ background: 'var(--color-accent, #D97706)' }}
              >
                Kirim Penawaran ke Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}