import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getDB,
  saveDB,
  getCatalogItems,
  parseSafePrice,
  isItemSold,
  generateId,
  pushNotification,
} from '../services/db';
import {
  UNNES_LOCATIONS,
  DEFAULT_LOCATION_ID,
  getGroupedLocations,
  estimateLocationDistance,
} from '../constants/locations';

interface SmartBarterProps {
  onNavigate: (page: string, params?: any, extraParam?: string) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

export default function SmartBarter({ onNavigate, onOpenAddItem }: SmartBarterProps) {
  const { currentUser, openAuthModal } = useAuth();

  const groupedLocations = getGroupedLocations();
  const defaultLocObj =
    UNNES_LOCATIONS.find((l) => l.id === DEFAULT_LOCATION_ID) || UNNES_LOCATIONS[0];

  const [dbTick, setDbTick] = useState(0);
  const [selectedMyItemId, setSelectedMyItemId] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(defaultLocObj.name);
  const [barterNote, setBarterNote] = useState<string>('');
  const [confirmTargetItem, setConfirmTargetItem] = useState<any | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  // Koordinat GPS hanya disimpan sementara di state memori browser (tidak pernah disimpan ke DB publik)
  const [transientCoords, setTransientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const handleDbUpdate = () => setDbTick((t) => t + 1);
    window.addEventListener('rev-db-updated', handleDbUpdate);
    return () => window.removeEventListener('rev-db-updated', handleDbUpdate);
  }, []);

  useEffect(() => {
    if (!confirmTargetItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmTargetItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmTargetItem]);

  const handleRequestTransientGps = () => {
    if (!navigator.geolocation) {
      setInlineNotice('Browser perangkat ini tidak mendukung deteksi lokasi GPS.');
      return;
    }
    setIsLocating(true);
    setInlineNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTransientCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setInlineNotice('Izin lokasi ditolak. Jarak dihitung berdasarkan area kampus default.');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const db = useMemo(() => getDB(), [dbTick]);
  const allItems = useMemo(() => getCatalogItems(db), [db]);
  const allUsers = db.users || [];

  const myItems = useMemo(() => {
    if (!currentUser) return [];
    return allItems.filter((it) => {
      const ownerId = it.id_pemilik ?? it.id_user ?? it.ownerId;
      return String(ownerId) === String(currentUser.id) && !isItemSold(it);
    });
  }, [allItems, currentUser]);

  useEffect(() => {
    if (myItems.length > 0 && !myItems.some((m) => String(m.id) === String(selectedMyItemId))) {
      setSelectedMyItemId(String(myItems[0].id));
    }
  }, [myItems, selectedMyItemId]);

  const activeMyItem = useMemo(() => {
    return myItems.find((it) => String(it.id) === String(selectedMyItemId)) || null;
  }, [myItems, selectedMyItemId]);

  const matchedCandidates = useMemo(() => {
    const myPrice = parseSafePrice(activeMyItem?.harga ?? activeMyItem?.price ?? 50000);
    const myCategory = (activeMyItem?.kategori || '').toLowerCase();
    const originLocation =
      activeMyItem?.lokasi || currentUser?.lokasi || DEFAULT_LOCATION_ID;
    const myLocationLower = originLocation.toLowerCase();

    return allItems
      .filter((it) => {
        const ownerId = it.id_pemilik ?? it.id_user ?? it.ownerId;
        if (currentUser && String(ownerId) === String(currentUser.id)) return false;
        if (isItemSold(it)) return false;

        const mode = String(it.transactionType || it.status || 'keduanya').toLowerCase();
        const allowsBarter = mode.includes('barter') || mode === 'keduanya';
        if (!allowsBarter) return false;

        if (filterArea !== 'all') {
          const itemLoc = (it.lokasi || 'sekaran').toLowerCase();
          if (!itemLoc.includes(filterArea.toLowerCase())) return false;
        }

        return true;
      })
      .map((it) => {
        const targetPrice = parseSafePrice(it.harga ?? it.price ?? 50000);
        const targetCategory = (it.kategori || '').toLowerCase();
        const targetLocationRaw = it.lokasi || defaultLocObj.name;
        const targetLocationLower = targetLocationRaw.toLowerCase();

        const distInfo = estimateLocationDistance(
          originLocation,
          targetLocationRaw,
          transientCoords
        );

        let score = 68;
        const reasons: string[] = [];

        const maxP = Math.max(myPrice, targetPrice, 1);
        const diffRatio = Math.abs(myPrice - targetPrice) / maxP;
        if (diffRatio <= 0.25) {
          score += 18;
          reasons.push('Nilai barang setara');
        } else if (diffRatio <= 0.5) {
          score += 10;
          reasons.push('Selisih nilai tipis');
        }

        if (
          (distInfo && distInfo.distanceKm <= 1.2) ||
          targetLocationLower.includes('sekaran') ||
          targetLocationLower.includes(myLocationLower)
        ) {
          score += 8;
          reasons.push('Radius terdekat kampus');
        }

        if (myCategory && targetCategory && myCategory !== targetCategory) {
          score += 4;
          reasons.push('Saling melengkapi kebutuhan');
        }

        const ownerId = String(it.id_pemilik ?? it.id_user ?? it.ownerId ?? 'USR-001');
        const seller = allUsers.find((u) => String(u.id) === ownerId);

        return {
          ...it,
          normalizedTitle: it.nama || it.title || it.nama_barang || 'Barang Kampus',
          normalizedPrice: targetPrice,
          normalizedCategory: it.kategori || 'Umum',
          normalizedLocation: targetLocationRaw,
          distanceLabel: distInfo?.label || '',
          normalizedImage: it.foto || '/assets/seed-images/placeholder.svg',
          sellerId: ownerId,
          sellerName: seller?.nama || 'Mahasiswa UNNES',
          matchScore: Math.min(score, 98),
          matchReasons: reasons.length > 0 ? reasons : ['Tersedia untuk barter lokal'],
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [allItems, allUsers, activeMyItem, currentUser, filterArea, defaultLocObj.name, transientCoords]);

  const handleExecuteSmartBarter = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!confirmTargetItem || !activeMyItem) return;

    const myOfferTitle =
      activeMyItem.nama || activeMyItem.title || activeMyItem.nama_barang || 'Barang Saya';
    const myOfferPrice = parseSafePrice(activeMyItem.harga ?? activeMyItem.price ?? 0);
    const myOfferImage = activeMyItem.foto || '/assets/seed-images/placeholder.svg';

    const targetPrice = confirmTargetItem.normalizedPrice;
    const diff = targetPrice - myOfferPrice;
    const diffText =
      diff > 0
        ? `Estimasi selisih: +Rp ${diff.toLocaleString('id-ID')} (pengaju menambah)`
        : diff < 0
        ? `Estimasi selisih: -Rp ${Math.abs(diff).toLocaleString('id-ID')} (barang penawar lebih mahal)`
        : 'Estimasi selisih: Rp 0 (nilai seimbang)';

    const noteSuffix = barterNote.trim() ? ` Catatan: "${barterNote.trim()}"` : '';
    const offerMessage = `[Smart Barter ${confirmTargetItem.matchScore}% Match] Pengajuan Barter: "${myOfferTitle}" (Rp ${myOfferPrice.toLocaleString(
      'id-ID'
    )}) ⇄ "${confirmTargetItem.normalizedTitle}" (Rp ${targetPrice.toLocaleString(
      'id-ID'
    )}). ${diffText}. Area COD: ${selectedCodSpot}.${noteSuffix}`;

    const latestDB = getDB();
    const conversations: any[] = [...(latestDB.conversations || [])];
    const offers: any[] = [...(latestDB.offers || [])];
    const messages: any[] = [...(latestDB.messages || [])];

    const buyerId = String(currentUser.id);
    const sellerId = String(confirmTargetItem.sellerId);
    const nowIso = new Date().toISOString();

    let existingConv = conversations.find((c) => {
      if (Array.isArray(c.participants)) {
        const ids = c.participants.map(String);
        return ids.includes(buyerId) && ids.includes(sellerId);
      }
      return (
        (String(c.id_user_a ?? c.buyerId) === buyerId &&
          String(c.id_user_b ?? c.sellerId) === sellerId) ||
        (String(c.id_user_a ?? c.buyerId) === sellerId &&
          String(c.id_user_b ?? c.sellerId) === buyerId)
      );
    });

    const convId = existingConv ? String(existingConv.id) : generateId('CONV');

    if (!existingConv) {
      existingConv = {
        id: convId,
        id_user_a: buyerId,
        id_user_b: sellerId,
        id_item_terkait: String(confirmTargetItem.id),
        participants: [buyerId, sellerId],
        buyerId,
        sellerId,
        buyerName: currentUser.nama || 'Saya',
        sellerName: confirmTargetItem.sellerName,
        itemId: String(confirmTargetItem.id),
        itemTitle: confirmTargetItem.normalizedTitle,
        itemImage: confirmTargetItem.normalizedImage,
        itemPrice: targetPrice,
        lokasi_cod_disepakati: selectedCodSpot,
        pesan_terakhir: offerMessage,
        lastMessage: offerMessage,
        updatedAt: nowIso,
      };
      conversations.unshift(existingConv);
    } else {
      existingConv.id_item_terkait = String(confirmTargetItem.id);
      existingConv.itemId = String(confirmTargetItem.id);
      existingConv.itemTitle = confirmTargetItem.normalizedTitle;
      existingConv.itemImage = confirmTargetItem.normalizedImage;
      existingConv.itemPrice = targetPrice;
      existingConv.lokasi_cod_disepakati = selectedCodSpot;
      existingConv.pesan_terakhir = offerMessage;
      existingConv.lastMessage = offerMessage;
      existingConv.updatedAt = nowIso;
    }

    const offerId = generateId('OFR');
    offers.unshift({
      id: offerId,
      id_conversation: convId,
      id_penawar: buyerId,
      id_pemilik_target: sellerId,
      id_item_penawar: String(activeMyItem.id),
      id_item_target: String(confirmTargetItem.id),
      participants: [buyerId, sellerId],
      selisih_harga: diff,
      lokasi_cod: selectedCodSpot,
      catatan: barterNote.trim(),
      status: 'pending',
      createdAt: nowIso,
    });

    messages.push({
      id: generateId('MSG'),
      id_conversation: convId,
      conversationId: convId,
      id_pengirim: buyerId,
      senderId: buyerId,
      senderName: currentUser.nama || 'Saya',
      teks: offerMessage,
      text: offerMessage,
      waktu: nowIso,
      createdAt: nowIso,
      status_baca: false,
      type: 'barter_offer',
      barterOffer: {
        offerId,
        offeredItemId: String(activeMyItem.id),
        offeredItemTitle: myOfferTitle,
        offeredItemPrice: myOfferPrice,
        offeredItemImage: myOfferImage,
        targetItemId: String(confirmTargetItem.id),
        targetItemTitle: confirmTargetItem.normalizedTitle,
        targetItemPrice: targetPrice,
        priceDifference: diff,
        codLocation: selectedCodSpot,
        note: barterNote.trim(),
      },
    });

    saveDB({ ...latestDB, conversations, offers, messages });

    pushNotification({
      userId: sellerId,
      tipe: 'barter',
      teks: `${currentUser.nama || 'Pengguna'} mengajukan Smart Barter "${myOfferTitle}" untuk "${confirmTargetItem.normalizedTitle}".`,
      targetPage: 'chat',
      targetId: convId,
    });

    setConfirmTargetItem(null);
    setBarterNote('');
    onNavigate('chat', { conversationId: convId });
  };

  const mySelectedPrice = parseSafePrice(activeMyItem?.harga ?? activeMyItem?.price ?? 0);
  const modalPriceDiff = confirmTargetItem
    ? confirmTargetItem.normalizedPrice - mySelectedPrice
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Smart Barter */}
      <div
        className="rounded-2xl p-5 sm:p-6 text-white shadow-sm"
        style={{ background: 'var(--color-primary, #567257)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20">
            Smart Barter Matching • Area Kampus
          </span>
          <button
            type="button"
            onClick={handleRequestTransientGps}
            disabled={isLocating}
            className="min-h-[36px] px-3 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors touch-manipulation"
          >
            {isLocating
              ? 'Mendeteksi jarak...'
              : transientCoords
              ? '✓ Jarak GPS Aktif'
              : '📍 Hitung Jarak dari Lokasiku'}
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">
          Tukar Barang Tak Terpakai Tanpa Keluar Uang
        </h1>
        <p className="text-xs text-white/85 mt-1 max-w-2xl">
          Pilih barang kos atau kuliah yang jarang dipakai, sistem akan mencocokkannya dengan barang di sekitar kampus dan menghitung estimasi selisih nilainya secara otomatis.
        </p>
      </div>

      {inlineNotice && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
          <span>{inlineNotice}</span>
          <button
            type="button"
            onClick={() => setInlineNotice(null)}
            className="px-2.5 py-1 rounded-lg bg-amber-200/70 font-bold shrink-0 touch-manipulation"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Langkah 1: Pilih Barang Milik Sendiri */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              1. Barang Milikmu yang Ingin Ditukar
            </h2>
            <p className="text-xs text-gray-500">
              Pilih barang untuk menghitung skor kecocokan otomatis
            </p>
          </div>
          {onOpenAddItem && (
            <button
              type="button"
              onClick={onOpenAddItem}
              className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold text-white shrink-0 touch-manipulation"
              style={{ background: 'var(--color-accent, #D97706)' }}
            >
              + Tambah Barang
            </button>
          )}
        </div>

        {!currentUser ? (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Masuk ke akunmu agar sistem dapat mencocokkan barang milikmu dengan pengguna lain.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0 touch-manipulation"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Masuk Akun
            </button>
          </div>
        ) : myItems.length === 0 ? (
          <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200 text-center space-y-2.5">
            <p className="text-xs font-semibold text-amber-900">
              Kamu belum mengunggah barang aktif apa pun.
            </p>
            <p className="text-[11px] text-amber-800">
              Unggah minimal 1 barang (misal: buku kuliah, kipas, atau setrika) untuk mulai fitur Smart Barter.
            </p>
            {onOpenAddItem && (
              <button
                type="button"
                onClick={onOpenAddItem}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center justify-center touch-manipulation"
                style={{ background: 'var(--color-accent, #D97706)' }}
              >
                + Unggah Barang Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {myItems.map((myIt) => {
              const isSelected = String(myIt.id) === String(selectedMyItemId);
              const myPrice = parseSafePrice(myIt.harga ?? myIt.price ?? 0);
              return (
                <button
                  type="button"
                  key={myIt.id}
                  onClick={() => setSelectedMyItemId(String(myIt.id))}
                  className={`snap-start shrink-0 w-56 p-3 rounded-xl border text-left transition-all flex items-center gap-3 touch-manipulation ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <img
                    src={myIt.foto || '/assets/seed-images/placeholder.svg'}
                    alt={myIt.nama || myIt.title}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {myIt.nama || myIt.title || myIt.nama_barang}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Rp {myPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Langkah 2: Daftar Rekomendasi Kecocokan */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">
            2. Rekomendasi Kecocokan Terdekat ({matchedCandidates.length})
          </h2>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Semua Area' },
              { id: 'sekaran', label: 'Sekaran' },
              { id: 'patemon', label: 'Patemon' },
              { id: 'gunungpati', label: 'Gunungpati' },
            ].map((area) => (
              <button
                type="button"
                key={area.id}
                onClick={() => setFilterArea(area.id)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors touch-manipulation ${
                  filterArea === area.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {area.label}
              </button>
            ))}
          </div>
        </div>

        {matchedCandidates.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <p className="text-xs text-gray-500">
              Belum ada barang barter yang cocok pada filter area ini. Coba pilih &quot;Semua Area&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchedCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between gap-4"
              >
                <button
                  type="button"
                  onClick={() => onNavigate('product', { productId: String(cand.id) })}
                  className="flex gap-3.5 text-left w-full touch-manipulation group"
                >
                  <img
                    src={cand.normalizedImage}
                    alt={cand.normalizedTitle}
                    className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cand.matchScore}% Match
                      </span>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[11px] text-gray-400 truncate">
                          {cand.normalizedLocation}
                        </span>
                        {cand.distanceLabel && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                            {cand.distanceLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 truncate group-hover:underline">
                      {cand.normalizedTitle}
                    </h3>

                    <p className="text-xs text-gray-500">
                      Pemilik: <strong className="text-gray-700">{cand.sellerName}</strong> • Estimasi Rp{' '}
                      {cand.normalizedPrice.toLocaleString('id-ID')}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {cand.matchReasons.map((r: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onNavigate('product', { productId: String(cand.id) })}
                    className="min-h-[44px] flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 touch-manipulation"
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('login');
                        return;
                      }
                      if (myItems.length === 0) {
                        setInlineNotice(
                          'Unggah minimal 1 barang milikmu terlebih dahulu untuk mengajukan barter.'
                        );
                        if (onOpenAddItem) onOpenAddItem();
                        return;
                      }
                      setConfirmTargetItem(cand);
                    }}
                    className="min-h-[44px] flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm active:scale-[0.98] touch-manipulation"
                    style={{ background: 'var(--color-accent, #D97706)' }}
                  >
                    Ajukan Barter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi & Negosiasi Smart Barter */}
      {confirmTargetItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ajukan Penawaran Smart Barter"
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setConfirmTargetItem(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-4 max-h-[85dvh] overflow-y-auto overscroll-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Ajukan Penawaran Smart Barter</h3>
              <button
                type="button"
                onClick={() => setConfirmTargetItem(null)}
                aria-label="Tutup modal"
                className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 font-bold flex items-center justify-center touch-manipulation"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl">
              <p>
                Barangmu:{' '}
                <strong>
                  {activeMyItem?.nama || activeMyItem?.title || activeMyItem?.nama_barang || 'Barang Saya'}
                </strong>{' '}
                (Rp {mySelectedPrice.toLocaleString('id-ID')})
              </p>
              <p>
                Ditukar dengan: <strong>{confirmTargetItem.normalizedTitle}</strong> (Rp{' '}
                {confirmTargetItem.normalizedPrice.toLocaleString('id-ID')})
              </p>
              <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between font-bold">
                <span>Perkiraan Selisih:</span>
                <span className="text-amber-800">
                  {modalPriceDiff > 0
                    ? `Kamu tambah Rp ${modalPriceDiff.toLocaleString('id-ID')}`
                    : modalPriceDiff < 0
                    ? `Lawan tambah Rp ${Math.abs(modalPriceDiff).toLocaleString('id-ID')}`
                    : 'Impas (Rp 0)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Usulan Area COD Kampus:
              </label>
              <select
                value={selectedCodSpot}
                onChange={(e) => setSelectedCodSpot(e.target.value)}
                className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-emerald-600"
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Pesan Tambahan ke {confirmTargetItem.sellerName} (Opsional):
              </label>
              <input
                type="text"
                value={barterNote}
                onChange={(e) => setBarterNote(e.target.value)}
                placeholder="Contoh: Siap nambah selisih pas COD di kampus..."
                className="w-full px-3 py-2.5 text-base sm:text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTargetItem(null)}
                className="min-h-[44px] flex-1 py-3 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 touch-manipulation"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteSmartBarter}
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