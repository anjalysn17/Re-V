import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { API_ENABLED, getToken } from '../services/api';
import { addOrderTransaction } from './OrdersPage';
import {
  POPULAR_COD_SPOTS,
  UNNES_LOCATIONS,
  haversineDistanceKm,
} from '../constants/locations';
import OsmMapEmbed from '../components/OsmMapEmbed';

interface ChatPageProps {
  openConversationId?: string;
  onNavigate?: (page: string, params?: any) => void;
}

const QUICK_REPLIES = [
  'Halo, barang ini masih tersedia?',
  'Bisa barter dengan barang di profilku?',
  'Bisa COD di Gerbang Utama UNNES Sekaran?',
  'Boleh minta foto detail kondisinya?',
];

export default function ChatPage({ openConversationId, onNavigate }: ChatPageProps) {
  const { currentUser, openAuthModal } = useAuth() as any;
  const [selectedConvId, setSelectedConvId] = useState<string | null>(openConversationId || null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecommendingCod, setIsRecommendingCod] = useState(false);
  const [codError, setCodError] = useState('');
  const [, setTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const go = (page: string, params?: any) => {
    if (onNavigate) onNavigate(page, params);
    else if ((window as any).revNavigate) (window as any).revNavigate(page, params);
  };

  useEffect(() => {
    if (openConversationId) {
      setSelectedConvId(openConversationId);
    }
  }, [openConversationId]);

  // Dengarkan pembaruan DB agar pesan baru / penawaran barter langsung tampil tanpa refresh
  useEffect(() => {
    const syncView = () => setTick((t) => t + 1);
    window.addEventListener('rev-db-updated', syncView);
    window.addEventListener('storage', syncView);
    return () => {
      window.removeEventListener('rev-db-updated', syncView);
      window.removeEventListener('storage', syncView);
    };
  }, []);

  const db = dbService.getDB() as any;
  const allConversations: any[] = db.conversations || [];
  const allUsers: any[] = db.users || [];
  const allItems: any[] = db.items || [];
  const globalMessages: any[] = db.messages || [];

  const uid = currentUser ? String(currentUser.id) : '';

  const myConversations = allConversations
    .filter((conv: any) => {
      if (!uid) return false;
      if (Array.isArray(conv.participants)) {
        return conv.participants.map(String).includes(uid);
      }
      return (
        String(conv.id_user_a ?? conv.buyerId ?? conv.buyer_id ?? conv.senderId ?? '') === uid ||
        String(conv.id_user_b ?? conv.sellerId ?? conv.seller_id ?? conv.receiverId ?? '') === uid
      );
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  useEffect(() => {
    if (!selectedConvId && myConversations.length > 0 && window.innerWidth >= 768) {
      setSelectedConvId(String(myConversations[0].id));
    }
  }, [myConversations.length, selectedConvId]);

  const persistDB = (updatedDB: any) => {
    dbService.saveDB(updatedDB);
    setTick((prev) => prev + 1);
  };

  const resolvePartner = (conv: any) => {
    let partnerId = '';
    if (Array.isArray(conv.participants)) {
      partnerId = String(conv.participants.find((p: any) => String(p) !== uid) || '');
    } else {
      const aId = String(conv.id_user_a ?? conv.buyerId ?? conv.buyer_id ?? conv.senderId ?? '');
      const bId = String(conv.id_user_b ?? conv.sellerId ?? conv.seller_id ?? conv.receiverId ?? '');
      partnerId = aId === uid ? bId : aId;
    }

    const foundUser = allUsers.find((u: any) => String(u.id) === partnerId);
    const partnerName =
      foundUser?.nama ||
      foundUser?.name ||
      (String(conv.sellerId ?? conv.seller_id) === uid
        ? conv.buyerName || conv.senderName
        : conv.sellerName || conv.receiverName) ||
      'Mahasiswa UNNES';

    return {
      id: partnerId,
      name: partnerName,
      avatar: foundUser?.foto_profil || foundUser?.avatar || '',
      isVerified: Boolean(foundUser?.is_verified),
    };
  };

  const resolveConversationItem = (conv: any) => {
    const targetItemId = conv.itemId ?? conv.id_item_terkait ?? conv.id_barang ?? conv.productId;
    if (!targetItemId) return null;
    return allItems.find((it: any) => String(it.id) === String(targetItemId)) || null;
  };

  const getConversationMessages = (conv: any) => {
    const inlineMsgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
    const flatMsgs: any[] = globalMessages.filter(
      (m: any) =>
        String(m.conversationId ?? m.id_conversation ?? m.id_percakapan ?? m.chatId) ===
        String(conv.id)
    );

    const mergedMap = new Map<string, any>();
    [...inlineMsgs, ...flatMsgs].forEach((m: any, idx: number) => {
      const key = String(m.id || `${m.createdAt || m.waktu || idx}-${m.text || m.teks || m.content}`);
      mergedMap.set(key, m);
    });

    return Array.from(mergedMap.values()).sort((a: any, b: any) => {
      const tA = new Date(a.createdAt || a.waktu || a.timestamp || 0).getTime();
      const tB = new Date(b.createdAt || b.waktu || b.timestamp || 0).getTime();
      return tA - tB;
    });
  };

  const activeConversation = myConversations.find(
    (c: any) => String(c.id) === String(selectedConvId)
  );
  const activeMessages = activeConversation ? getConversationMessages(activeConversation) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedConvId]);

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Pesan & Negosiasi</h2>
          <p className="text-xs text-gray-500 mb-6">
            Masuk ke akunmu untuk bernegosiasi barter maupun menentukan titik temu COD bersama penjual.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="w-full py-3 rounded-xl text-xs font-bold text-white touch-manipulation"
            style={{ background: 'var(--color-primary, #567257)' }}
          >
            Masuk Akun
          </button>
        </div>
      </div>
    );
  }

  const handleSendMessage = (customText?: string, extraMeta?: Record<string, any>) => {
    const content = (customText ?? messageText).trim();
    if (!content || !activeConversation) return;

    const latestDB = dbService.getDB() as any;
    const nowIso = new Date().toISOString();
    const newMsg = {
      id: dbService.generateId('MSG'),
      id_conversation: activeConversation.id,
      id_percakapan: activeConversation.id,
      conversationId: activeConversation.id,
      id_pengirim: currentUser.id,
      senderId: currentUser.id,
      senderName: currentUser.nama || currentUser.name || 'Saya',
      teks: content,
      text: content,
      content,
      waktu: nowIso,
      createdAt: nowIso,
      status_baca: false,
      ...(extraMeta || {}),
    };

    const updatedConversations = (latestDB.conversations || []).map((conv: any) => {
      if (String(conv.id) !== String(activeConversation.id)) return conv;
      const existingMsgs = Array.isArray(conv.messages) ? conv.messages : [];
      return {
        ...conv,
        messages: [...existingMsgs, newMsg],
        pesan_terakhir: content,
        lastMessage: content,
        updatedAt: nowIso,
      };
    });

    const updatedGlobalMessages = Array.isArray(latestDB.messages)
      ? [...latestDB.messages, newMsg]
      : [newMsg];

    persistDB({
      ...latestDB,
      conversations: updatedConversations,
      messages: updatedGlobalMessages,
    });

    const partner = resolvePartner(activeConversation);
    if (partner.id) {
      dbService.pushNotification({
        userId: partner.id,
        tipe: 'chat',
        teks: `${currentUser.nama || currentUser.name || 'Pengguna'}: ${content}`,
        link_page: 'chat',
        target_id: String(activeConversation.id),
      });
    }

    if (!customText) setMessageText('');
  };

  // Hitung rekomendasi titik COD via Geolocation Browser -> API (/api/chat/recommend-cod) atau fallback Haversine lokal
  const handleRecommendCodSpot = () => {
    if (!activeConversation || isRecommendingCod) return;
    setCodError('');

    if (!('geolocation' in navigator)) {
      setCodError('Browser tidak mendukung fitur lokasi GPS.');
      return;
    }

    setIsRecommendingCod(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const myCoord = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          };

          const latestDB = dbService.getDB() as any;
          const conv = (latestDB.conversations || []).find(
            (c: any) => String(c.id) === String(activeConversation.id)
          );
          if (!conv) return;

          const userAId = String(conv.id_user_a ?? conv.buyerId ?? conv.participants?.[0] ?? uid);
          const isUserA = userAId === uid;

          const coordA = isUserA ? myCoord : conv.koordinat_a;
          const coordB = !isUserA ? myCoord : conv.koordinat_b;

          // Simpan koordinat secara privat hanya pada percakapan ini (tidak bocor ke publik)
          const updatedConvsWithCoord = (latestDB.conversations || []).map((c: any) =>
            String(c.id) === String(conv.id)
              ? {
                  ...c,
                  ...(isUserA ? { koordinat_a: myCoord } : { koordinat_b: myCoord }),
                }
              : c
          );
          persistDB({ ...latestDB, conversations: updatedConvsWithCoord });

          const relatedItem = resolveConversationItem(conv);
          const itemName =
            relatedItem?.nama || relatedItem?.title || conv.itemTitle || 'Barang Mahasiswa';
          const itemCategory = relatedItem?.kategori || 'Umum';

          let recPayload: any = null;
          const apiBase = (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '');

          if (API_ENABLED && apiBase) {
            try {
              const token = getToken();
              const res = await fetch(`${apiBase}/api/chat/recommend-cod`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  coordA,
                  coordB,
                  itemName,
                  itemCategory,
                }),
              });
              if (res.ok) {
                recPayload = await res.json();
              }
            } catch {
              /* fallback ke kalkulasi Haversine lokal */
            }
          }

          if (!recPayload) {
            const ptA = coordA || myCoord;
            const ptB = coordB || myCoord;
            const hasBoth = Boolean(coordA && coordB);
            const midLat = (ptA.lat + ptB.lat) / 2;
            const midLng = (ptA.lng + ptB.lng) / 2;
            const userDistanceKm = hasBoth
              ? Number(haversineDistanceKm(ptA.lat, ptA.lng, ptB.lat, ptB.lng).toFixed(2))
              : null;

            const candidatePool = POPULAR_COD_SPOTS.length ? POPULAR_COD_SPOTS : UNNES_LOCATIONS;
            const rankedSpots = candidatePool
              .map((spot) => ({
                id: spot.id,
                name: spot.name,
                lat: spot.lat,
                lng: spot.lng,
                desc: spot.description,
                distMidKm: Number(haversineDistanceKm(midLat, midLng, spot.lat, spot.lng).toFixed(2)),
                distAKm: coordA
                  ? Number(haversineDistanceKm(coordA.lat, coordA.lng, spot.lat, spot.lng).toFixed(2))
                  : null,
                distBKm: coordB
                  ? Number(haversineDistanceKm(coordB.lat, coordB.lng, spot.lat, spot.lng).toFixed(2))
                  : null,
              }))
              .sort((a, b) => a.distMidKm - b.distMidKm)
              .slice(0, 3);

            const topSpot = rankedSpots[0];
            recPayload = {
              source: 'haversine-local',
              userDistanceKm,
              spots: rankedSpots,
              recommendedSpot: topSpot,
              advice: hasBoth
                ? `Jarak kalian sekitar ${userDistanceKm} km. Titik tengah paling adil dan aman untuk COD adalah ${topSpot.name} (${topSpot.desc}).`
                : `Lokasi kamu sudah dibagikan. Rekomendasi titik COD terdekat dari posisimu adalah ${topSpot.name} (${topSpot.desc}).`,
            };
          }

          const top = recPayload.recommendedSpot;
          handleSendMessage(
            `📍 Rekomendasi Titik COD: ${top.name} (±${top.distMidKm} km dari titik tengah). ${recPayload.advice}`,
            {
              type: 'cod_recommendation',
              codMeta: recPayload,
            }
          );
        } finally {
          setIsRecommendingCod(false);
        }
      },
      (err) => {
        setIsRecommendingCod(false);
        if (err.code === err.PERMISSION_DENIED) {
          setCodError('Izin lokasi ditolak. Aktifkan izin lokasi di browser untuk rekomendasi titik COD.');
        } else {
          setCodError('Gagal mendapatkan lokasi GPS perangkat. Coba lagi.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectCodSpotFromCard = (
    spotName: string,
    spotCoords?: { lat: number; lng: number }
  ) => {
    if (!activeConversation) return;
    const latestDB = dbService.getDB() as any;
    const updatedConvs = (latestDB.conversations || []).map((c: any) =>
      String(c.id) === String(activeConversation.id)
        ? {
            ...c,
            lokasi_cod_disepakati: spotName,
            codLocation: spotName,
            ...(spotCoords ? { codCoordinates: spotCoords } : {}),
          }
        : c
    );
    persistDB({ ...latestDB, conversations: updatedConvs });
    handleSendMessage(`📌 Saya setuju titik temu COD di: ${spotName}`);
  };

  // Menyepakati transaksi dari obrolan & mencatatnya ke riwayat OrdersPage
  const handleConfirmDealFromChat = () => {
    if (!activeConversation) return;
    const latestDB = dbService.getDB() as any;
    const freshConv = (latestDB.conversations || []).find(
      (c: any) => String(c.id) === String(activeConversation.id)
    );
    if (!freshConv || freshConv.dealConfirmed) return;

    const partner = resolvePartner(freshConv);
    const relatedItem = resolveConversationItem(freshConv);

    // Cari tawaran barter terakhir di obrolan jika ada
    const msgs = getConversationMessages(freshConv);
    const lastBarterMsg = [...msgs].reverse().find((m: any) => m.barterOffer || m.offerMeta);
    const barterData = lastBarterMsg?.barterOffer || lastBarterMsg?.offerMeta;

    const isBarter = Boolean(
      barterData ||
        freshConv.type === 'barter' ||
        freshConv.barterOfferItem ||
        freshConv.offeredItemTitle
    );

    const itemId = String(
      barterData?.targetItemId ??
        relatedItem?.id ??
        freshConv.itemId ??
        freshConv.id_barang ??
        ''
    );

    const itemTitle =
      barterData?.targetItemTitle ||
      barterData?.targetItemName ||
      relatedItem?.nama ||
      relatedItem?.title ||
      freshConv.itemTitle ||
      'Barang Kesepakatan Chat';

    const itemOwnerId = String(
      relatedItem?.id_pemilik ?? relatedItem?.ownerId ?? freshConv.sellerId ?? partner.id
    );
    const isCurrentUserSeller = itemOwnerId === uid;

    const buyerId = isCurrentUserSeller ? partner.id : uid;
    const buyerName = isCurrentUserSeller
      ? partner.name
      : currentUser.nama || currentUser.name || 'Pembeli';
    const sellerId = isCurrentUserSeller ? uid : partner.id;
    const sellerName = isCurrentUserSeller
      ? currentUser.nama || currentUser.name || 'Penjual'
      : partner.name;

    const agreedCod =
      freshConv.lokasi_cod_disepakati ||
      freshConv.codLocation ||
      barterData?.codLocation ||
      relatedItem?.lokasi ||
      'Gerbang Utama UNNES (Sekaran)';

    addOrderTransaction({
      buyerId,
      buyerName,
      sellerId,
      sellerName,
      itemId,
      itemTitle,
      itemImage: relatedItem?.foto || relatedItem?.image || freshConv.itemImage,
      type: isBarter ? 'barter' : 'beli',
      price: Number(
        barterData?.targetItemPrice ??
          relatedItem?.harga ??
          relatedItem?.price ??
          freshConv.itemPrice ??
          0
      ),
      barterOfferTitle:
        barterData?.offeredItemTitle ||
        barterData?.offeredItemName ||
        freshConv.offeredItemTitle ||
        'Barang Sesuai Kesepakatan Chat',
      codLocation: agreedCod,
      ...(freshConv.codCoordinates ? { codCoordinates: freshConv.codCoordinates } : {}),
    });

    const updatedConversations = (latestDB.conversations || []).map((conv: any) =>
      String(conv.id) === String(freshConv.id)
        ? { ...conv, dealConfirmed: true }
        : conv
    );
    persistDB({ ...latestDB, conversations: updatedConversations });

    handleSendMessage(
      `✅ Transaksi disepakati! Pesanan "${itemTitle}" (COD: ${agreedCod}) sudah tercatat di menu Transaksi.`
    );
  };

  const filteredConversations = myConversations.filter((conv: any) => {
    if (!searchTerm.trim()) return true;
    const partner = resolvePartner(conv);
    const item = resolveConversationItem(conv);
    const q = searchTerm.toLowerCase();
    return (
      partner.name.toLowerCase().includes(q) ||
      String(item?.nama || item?.title || conv.itemTitle || '')
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[72vh]">
        {/* KOLOM KIRI: Daftar Percakapan */}
        <div
          className={`md:col-span-4 border-r border-gray-100 flex flex-col ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 space-y-3">
            <h1 className="text-base font-bold text-gray-900">Obrolan ({myConversations.length})</h1>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama atau barang..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-bold text-gray-700 mb-1">Belum Ada Obrolan</p>
                <p className="text-xs text-gray-500 mb-4">
                  Mulai chat penjual atau ajukan barter dari halaman detail barang.
                </p>
                <button
                  type="button"
                  onClick={() => go('home')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white touch-manipulation"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Jelajahi Barang
                </button>
              </div>
            ) : (
              filteredConversations.map((conv: any) => {
                const partner = resolvePartner(conv);
                const item = resolveConversationItem(conv);
                const msgs = getConversationMessages(conv);
                const lastMsg =
                  msgs[msgs.length - 1]?.text ||
                  msgs[msgs.length - 1]?.teks ||
                  conv.lastMessage ||
                  'Mulai percakapan...';
                const isSelected = String(conv.id) === String(selectedConvId);

                return (
                  <button
                    type="button"
                    key={conv.id}
                    onClick={() => setSelectedConvId(String(conv.id))}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition-colors hover:bg-gray-50 touch-manipulation ${
                      isSelected ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: 'var(--color-primary, #567257)' }}
                    >
                      {partner.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-gray-900 truncate">{partner.name}</p>
                        {conv.dealConfirmed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            Deal ✓
                          </span>
                        )}
                      </div>
                      {(item || conv.itemTitle) && (
                        <p className="text-[11px] font-medium text-emerald-700 truncate">
                          📦 {item?.nama || item?.title || conv.itemTitle}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lastMsg}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Ruang Percakapan Aktif */}
        <div
          className={`md:col-span-8 flex flex-col bg-gray-50/40 ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {!activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <p className="text-sm font-semibold text-gray-600">Pilih obrolan untuk mulai bernegosiasi</p>
              <p className="text-xs mt-1">
                Diskusikan kondisi barang, kesepakatan barter, dan lokasi COD aman di sekitar kampus.
              </p>
            </div>
          ) : (
            <>
              {/* Header Ruang Chat */}
              {(() => {
                const partner = resolvePartner(activeConversation);
                const relatedItem = resolveConversationItem(activeConversation);
                return (
                  <div className="bg-white border-b border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedConvId(null)}
                          className="md:hidden px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 touch-manipulation"
                        >
                          ←
                        </button>
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                          style={{ background: 'var(--color-primary, #567257)' }}
                        >
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-gray-900 truncate">{partner.name}</p>
                            {partner.isVerified && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                                UNNES
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">
                            {activeConversation.lokasi_cod_disepakati
                              ? `📍 COD: ${activeConversation.lokasi_cod_disepakati}`
                              : 'Negosiasi & Koordinasi COD'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleRecommendCodSpot}
                          disabled={isRecommendingCod}
                          title="Bagikan lokasi GPS & cari titik tengah COD cerdas"
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 touch-manipulation"
                        >
                          {isRecommendingCod ? 'Mencari...' : '📍 Titik COD'}
                        </button>

                        {!activeConversation.dealConfirmed ? (
                          <button
                            type="button"
                            onClick={handleConfirmDealFromChat}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 touch-manipulation"
                            style={{ background: 'var(--color-primary, #567257)' }}
                          >
                            Sepakati Deal
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => go('orders')}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 touch-manipulation"
                          >
                            Transaksi ✓
                          </button>
                        )}
                      </div>
                    </div>

                    {codError && (
                      <div className="px-4 py-1.5 bg-red-50 border-t border-red-100 text-[11px] text-red-600 flex items-center justify-between">
                        <span>{codError}</span>
                        <button
                          type="button"
                          onClick={() => setCodError('')}
                          className="font-bold ml-2 touch-manipulation"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Banner Barang yang Dibahas */}
                    {(relatedItem || activeConversation.itemTitle) && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={
                              relatedItem?.foto ||
                              relatedItem?.image ||
                              activeConversation.itemImage ||
                              '/assets/seed-images/placeholder.svg'
                            }
                            alt="Produk"
                            className="w-9 h-9 rounded-lg object-cover bg-white border border-gray-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {relatedItem?.nama ||
                                relatedItem?.title ||
                                activeConversation.itemTitle}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {Number(relatedItem?.harga || relatedItem?.price || 0) > 0
                                ? `Rp ${Number(relatedItem?.harga || relatedItem?.price).toLocaleString('id-ID')}`
                                : 'Mode Pertukaran / Barter'}
                            </p>
                          </div>
                        </div>
                        {relatedItem && (
                          <button
                            type="button"
                            onClick={() => go('product', { productId: relatedItem.id })}
                            className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0 touch-manipulation"
                          >
                            Lihat Barang
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Daftar Gelembung Pesan */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[50vh] md:max-h-[54vh]">
                {activeMessages.length === 0 ? (
                  <p className="text-center text-xs text-gray-400 py-8">
                    Belum ada pesan. Kirim sapaan atau pilih template pesan di bawah untuk memulai.
                  </p>
                ) : (
                  activeMessages.map((msg: any, index: number) => {
                    const sender = String(
                      msg.senderId ?? msg.id_pengirim ?? msg.sender_id ?? msg.id_user ?? ''
                    );
                    const isMine = sender === uid;
                    const text = msg.text || msg.teks || msg.content || '';
                    const barterOffer = msg.barterOffer || msg.offerMeta;
                    const codMeta = msg.codMeta;
                    const timeStr =
                      msg.createdAt || msg.waktu || msg.timestamp
                        ? new Date(msg.createdAt || msg.waktu || msg.timestamp).toLocaleTimeString(
                            'id-ID',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )
                        : '';

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        {/* Kartu Pengajuan Barter & Selisih Harga Otomatis */}
                        {barterOffer && (
                          <div className="max-w-[88%] sm:max-w-[78%] mb-1.5 rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-xs space-y-2 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-amber-200/70 pb-1.5">
                              <span className="font-bold text-amber-900">⇄ Penawaran Barter</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold">
                                Kalkulasi Otomatis
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                              <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                                <span className="text-gray-500 block">Barang Ditawarkan:</span>
                                <span className="font-bold text-gray-900">
                                  {barterOffer.offeredItemTitle || barterOffer.offeredItemName}
                                </span>
                                <span className="text-amber-800 font-semibold block">
                                  Rp {Number(barterOffer.offeredItemPrice || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <div className="bg-white/80 p-2 rounded-xl border border-amber-100">
                                <span className="text-gray-500 block">Barang Target:</span>
                                <span className="font-bold text-gray-900">
                                  {barterOffer.targetItemTitle || barterOffer.targetItemName}
                                </span>
                                <span className="text-emerald-800 font-semibold block">
                                  Rp {Number(barterOffer.targetItemPrice || 0).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>

                            {(() => {
                              const diff = Number(
                                barterOffer.priceDifference ?? barterOffer.priceDiff ?? 0
                              );
                              return (
                                <div className="p-2 rounded-xl bg-white border border-amber-200 flex items-center justify-between font-bold text-[11px]">
                                  <span className="text-gray-700">Selisih Harga:</span>
                                  <span className="text-amber-900">
                                    {diff > 0
                                      ? `Penawar nambah Rp ${diff.toLocaleString('id-ID')}`
                                      : diff < 0
                                      ? `Penjual nambah Rp ${Math.abs(diff).toLocaleString('id-ID')}`
                                      : 'Impas (Rp 0)'}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* Kartu Rekomendasi Titik COD (Haversine + Gemini + OSM) */}
                        {codMeta && codMeta.recommendedSpot && (
                          <div className="max-w-[92%] sm:max-w-[82%] mb-1.5 rounded-2xl bg-white border border-blue-200 p-3.5 text-xs space-y-2.5 shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-1.5">
                              <span className="font-bold text-blue-900">
                                📍 Rekomendasi Titik COD
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                                {codMeta.source?.includes('gemini') ? 'AI + Haversine' : 'Haversine'}
                              </span>
                            </div>

                            <p className="text-gray-700 leading-relaxed">{codMeta.advice}</p>

                            <OsmMapEmbed
                              locationName={codMeta.recommendedSpot.name}
                              coordinates={{
                                lat: codMeta.recommendedSpot.lat,
                                lng: codMeta.recommendedSpot.lng,
                              }}
                              height={150}
                            />

                            {Array.isArray(codMeta.spots) && codMeta.spots.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <p className="text-[10px] font-bold text-gray-500 uppercase">
                                  Pilih & Sepakati Titik Temu:
                                </p>
                                {codMeta.spots.map((sp: any) => (
                                  <button
                                    key={sp.id}
                                    type="button"
                                    onClick={() =>
                                      handleSelectCodSpotFromCard(sp.name, {
                                        lat: sp.lat,
                                        lng: sp.lng,
                                      })
                                    }
                                    className="w-full text-left p-2 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors flex items-center justify-between gap-2 touch-manipulation"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-bold text-gray-900 truncate">{sp.name}</p>
                                      <p className="text-[10px] text-gray-500 truncate">{sp.desc}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                                      {sp.distMidKm} km →
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div
                          className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'text-white rounded-br-sm'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'
                          }`}
                          style={isMine ? { background: 'var(--color-primary, #567257)' } : undefined}
                        >
                          <p className="whitespace-pre-wrap break-words">{text}</p>
                        </div>
                        {timeStr && (
                          <span className="text-[10px] text-gray-400 mt-0.5 px-1">{timeStr}</span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Template Pesan Cepat (Quick Reply) */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex gap-1.5 overflow-x-auto">
                {QUICK_REPLIES.map((qr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSendMessage(qr)}
                    className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 whitespace-nowrap shrink-0 transition-colors touch-manipulation"
                  >
                    {qr}
                  </button>
                ))}
              </div>

              {/* Input Kirim Pesan */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-white border-t border-gray-100 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Tulis pesan negosiasi atau titik COD..."
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-opacity shrink-0 touch-manipulation"
                  style={{ background: 'var(--color-primary, #567257)' }}
                >
                  Kirim
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}