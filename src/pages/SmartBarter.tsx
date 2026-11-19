import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as dbService from '../services/db';
import { addOrderTransaction } from './OrdersPage';

interface SmartBarterProps {
  onNavigate: (page: string, params?: any, extraParam?: string) => void;
  onOpenAddItem?: () => void;
  onCartUpdated?: () => void;
}

const COD_LOCATIONS = [
  'Gerbang Utama UNNES (Sekaran)',
  'Taman FMIPA UNNES',
  'Masjid Ulul Albab UNNES',
  'Kawasan Kos Sekaran',
  'Kawasan Kos Patemon',
];

export default function SmartBarter({ onNavigate, onOpenAddItem }: SmartBarterProps) {
  const { currentUser, openAuthModal } = useAuth() as any;

  const [selectedMyItemId, setSelectedMyItemId] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('all');
  const [selectedCodSpot, setSelectedCodSpot] = useState<string>(COD_LOCATIONS[0]);
  const [confirmTargetItem, setConfirmTargetItem] = useState<any | null>(null);
  const [successBanner, setSuccessBanner] = useState<string>('');

  const db = dbService.getDB() as any;
  const allItems: any[] = db.items || [];
  const allUsers: any[] = db.users || [];

  // Barang milik akun yang sedang login
  const myItems = useMemo(() => {
    if (!currentUser) return [];
    return allItems.filter((it) => {
      const ownerId = it.id_user ?? it.sellerId ?? it.ownerId;
      return String(ownerId) === String(currentUser.id);
    });
  }, [allItems, currentUser]);

  // Pilih otomatis barang pertama milik user saat halaman dibuka
  useEffect(() => {
    if (myItems.length > 0 && !selectedMyItemId) {
      setSelectedMyItemId(String(myItems[0].id));
    }
  }, [myItems, selectedMyItemId]);

  const activeMyItem = useMemo(() => {
    return myItems.find((it) => String(it.id) === String(selectedMyItemId)) || null;
  }, [myItems, selectedMyItemId]);

  // Kandidat barang milik mahasiswa/warga sekitar kampus yang bisa dibarter
  const matchedCandidates = useMemo(() => {
    const myPrice = Number(activeMyItem?.price ?? activeMyItem?.harga ?? 50000);
    const myCategory = (activeMyItem?.category || activeMyItem?.kategori || '').toLowerCase();
    const myLocation = (
      activeMyItem?.location ||
      activeMyItem?.lokasi ||
      currentUser?.lokasi ||
      'Sekaran'
    ).toLowerCase();

    return allItems
      .filter((it) => {
        const ownerId = it.id_user ?? it.sellerId ?? it.ownerId;
        if (currentUser && String(ownerId) === String(currentUser.id)) return false;

        const mode = (
          it.transactionType ||
          it.tipe_transaksi ||
          it.mode ||
          'both'
        ).toLowerCase();
        const allowsBarter =
          mode.includes('barter') || mode === 'both' || Boolean(it.canBarter);
        if (!allowsBarter) return false;

        if (filterArea !== 'all') {
          const itemLoc = (it.location || it.lokasi || 'sekaran').toLowerCase();
          if (!itemLoc.includes(filterArea.toLowerCase())) return false;
        }

        return true;
      })
      .map((it) => {
        const targetPrice = Number(it.price ?? it.harga ?? 50000);
        const targetCategory = (it.category || it.kategori || '').toLowerCase();
        const targetLocation = (it.location || it.lokasi || 'Sekaran').toLowerCase();

        // Hitung skor kecocokan Smart Barter (60% - 98%)
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

        if (targetLocation.includes('sekaran') || targetLocation.includes(myLocation)) {
          score += 8;
          reasons.push('Radius terdekat kampus');
        }

        if (myCategory && targetCategory && myCategory !== targetCategory) {
          score += 4;
          reasons.push('Saling melengkapi kebutuhan');
        }

        const seller = allUsers.find(
          (u) => String(u.id) === String(it.id_user ?? it.sellerId ?? it.ownerId)
        );

        return {
          ...it,
          normalizedTitle: it.title || it.nama_barang || 'Barang Kampus',
          normalizedPrice: targetPrice,
          normalizedCategory: it.category || it.kategori || 'Umum',
          normalizedLocation: it.location || it.lokasi || 'Sekaran, Gunungpati',
          normalizedImage: it.image || it.foto || '/assets/seed-images/placeholder.svg',
          sellerId: it.id_user ?? it.sellerId ?? it.ownerId ?? 'seller-default',
          sellerName:
            seller?.nama || seller?.name || it.sellerName || it.ownerName || 'Mahasiswa UNNES',
          matchScore: Math.min(score, 98),
          matchReasons: reasons.length > 0 ? reasons : ['Tersedia untuk barter lokal'],
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [allItems, allUsers, activeMyItem, currentUser, filterArea]);

  const handleExecuteSmartBarter = () => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!confirmTargetItem) return;

    const myOfferTitle = activeMyItem
      ? activeMyItem.title || activeMyItem.nama_barang
      : 'Barang Milik Saya';

    // 1. Catat transaksi barter ke OrdersPage
    addOrderTransaction({
      userId: currentUser.id,
      sellerId: String(confirmTargetItem.sellerId),
      sellerName: confirmTargetItem.sellerName,
      itemTitle: confirmTargetItem.normalizedTitle,
      itemImage: confirmTargetItem.normalizedImage,
      type: 'barter',
      barterOfferTitle: myOfferTitle,
      codLocation: selectedCodSpot,
    });

    // 2. Buat ruang percakapan di db agar langsung muncul di ChatPage
    const latestDB = dbService.getDB() as any;
    const conversations: any[] = latestDB.conversations || [];
    const messages: any[] = latestDB.messages || [];

    const buyerId = String(currentUser.id);
    const sellerId = String(confirmTargetItem.sellerId);
    const convId = `conv-${Date.now()}`;
    const offerMessage = `[Smart Barter ${confirmTargetItem.matchScore}% Match] Halo ${confirmTargetItem.sellerName}, saya ingin menukar "${myOfferTitle}" milik saya dengan "${confirmTargetItem.normalizedTitle}". Titik COD: ${selectedCodSpot}.`;

    conversations.unshift({
      id: convId,
      participants: [buyerId, sellerId],
      buyerId,
      sellerId,
      buyerName: currentUser.nama || currentUser.name || 'Saya',
      sellerName: confirmTargetItem.sellerName,
      itemId: confirmTargetItem.id,
      itemTitle: confirmTargetItem.normalizedTitle,
      itemImage: confirmTargetItem.normalizedImage,
      lastMessage: offerMessage,
      updatedAt: new Date().toISOString(),
    });

    messages.push({
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: buyerId,
      senderName: currentUser.nama || currentUser.name || 'Saya',
      text: offerMessage,
      createdAt: new Date().toISOString(),
    });

    const updatedDB = { ...latestDB, conversations, messages };
    if (typeof (dbService as any).saveDB === 'function') {
      (dbService as any).saveDB(updatedDB);
    }
    localStorage.setItem('rev_db', JSON.stringify(updatedDB));

    setConfirmTargetItem(null);
    setSuccessBanner(
      `Pengajuan Smart Barter untuk "${confirmTargetItem.normalizedTitle}" berhasil dicatat!`
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header Smart Barter */}
      <div
        className="rounded-2xl p-5 sm:p-6 text-white shadow-sm"
        style={{ background: 'var(--color-primary, #567257)' }}
      >
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 mb-2">
          Smart Barter Matching • Area UNNES
        </span>
        <h1 className="text-xl sm:text-2xl font-bold">
          Tukar Barang Tak Terpakai Tanpa Keluar Uang
        </h1>
        <p className="text-xs text-white/85 mt-1 max-w-2xl">
          Pilih barang kos atau kuliah yang nganggur di tempatmu, sistem akan mencocokkannya dengan barang yang kamu butuhkan di sekitar kampus.
        </p>
      </div>

      {/* Banner Sukses setelah Ajukan Barter */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs font-semibold text-emerald-800">{successBanner}</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onNavigate('orders')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white"
            >
              Lihat di Transaksi
            </button>
            <button
              onClick={() => onNavigate('chat')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-300 text-emerald-800 bg-white"
            >
              Buka Chat
            </button>
          </div>
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
              onClick={onOpenAddItem}
              className="px-3 py-2 rounded-xl text-xs font-bold text-white shrink-0"
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
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white shrink-0"
              style={{ background: 'var(--color-primary, #567257)' }}
            >
              Masuk Akun
            </button>
          </div>
        ) : myItems.length === 0 ? (
          <div className="p-5 rounded-xl bg-amber-50/60 border border-amber-200 text-center space-y-2">
            <p className="text-xs font-semibold text-amber-900">
              Kamu belum mengunggah barang apa pun.
            </p>
            <p className="text-[11px] text-amber-800">
              Unggah minimal 1 barang (misal: buku kuliah, kipas, atau setrika) untuk mulai fitur Smart Barter.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {myItems.map((myIt) => {
              const isSelected = String(myIt.id) === String(selectedMyItemId);
              return (
                <button
                  key={myIt.id}
                  onClick={() => setSelectedMyItemId(String(myIt.id))}
                  className={`snap-start shrink-0 w-56 p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <img
                    src={myIt.image || myIt.foto || '/assets/seed-images/placeholder.svg'}
                    alt={myIt.title || myIt.nama_barang}
                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {myIt.title || myIt.nama_barang}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Rp {Number(myIt.price ?? myIt.harga ?? 0).toLocaleString('id-ID')}
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

          {/* Filter Radius Area Kampus */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Semua Area' },
              { id: 'sekaran', label: 'Sekaran' },
              { id: 'patemon', label: 'Patemon' },
              { id: 'gunungpati', label: 'Gunungpati' },
            ].map((area) => (
              <button
                key={area.id}
                onClick={() => setFilterArea(area.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
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
              Belum ada barang barter yang cocok pada filter area ini. Coba pilih "Semua Area".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {matchedCandidates.map((cand) => (
              <div
                key={cand.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="flex gap-3.5">
                  <img
                    src={cand.normalizedImage}
                    alt={cand.normalizedTitle}
                    onClick={() => onNavigate('product', String(cand.id))}
                    className="w-20 h-20 rounded-xl object-cover bg-gray-100 shrink-0 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {cand.matchScore}% Match
                      </span>
                      <span className="text-[11px] text-gray-400 truncate">
                        {cand.normalizedLocation}
                      </span>
                    </div>

                    <h3
                      onClick={() => onNavigate('product', String(cand.id))}
                      className="text-sm font-bold text-gray-900 truncate cursor-pointer hover:underline"
                    >
                      {cand.normalizedTitle}
                    </h3>

                    <p className="text-xs text-gray-500">
                      Pemilik: <strong className="text-gray-700">{cand.sellerName}</strong>
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
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => onNavigate('product', String(cand.id))}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Detail
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        openAuthModal('login');
                        return;
                      }
                      if (myItems.length === 0) {
                        alert('Unggah minimal 1 barang milikmu terlebih dahulu untuk melakukan barter.');
                        if (onOpenAddItem) onOpenAddItem();
                        return;
                      }
                      setConfirmTargetItem(cand);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm"
                    style={{ background: 'var(--color-accent, #D97706)' }}
                  >
                    Tukar Sekarang
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Konfirmasi Smart Barter */}
      {confirmTargetItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Smart Barter</h3>
              <button
                onClick={() => setConfirmTargetItem(null)}
                className="text-gray-400 hover:text-gray-700 font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl">
              <p>
                Barangmu:{' '}
                <strong>
                  {activeMyItem?.title || activeMyItem?.nama_barang || 'Barang Saya'}
                </strong>
              </p>
              <p>
                Ditukar dengan: <strong>{confirmTargetItem.normalizedTitle}</strong> (
                {confirmTargetItem.sellerName})
              </p>
              <p className="text-emerald-700 font-semibold">
                Skor Kecocokan: {confirmTargetItem.matchScore}%
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Pilih Titik Pertemuan Aman (COD):
              </label>
              <select
                value={selectedCodSpot}
                onChange={(e) => setSelectedCodSpot(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-600"
              >
                {COD_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmTargetItem(null)}
                className="flex-1 py-3 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteSmartBarter}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-white"
                style={{ background: 'var(--color-primary, #567257)' }}
              >
                Kirim & Catat Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}