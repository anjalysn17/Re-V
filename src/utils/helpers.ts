export type ItemGradeLabel =
  | 'Grade A (Seperti Baru)'
  | 'Grade B (Baik)'
  | 'Grade C (Layak Pakai)';

export type ItemTxType = 'jual' | 'barter' | 'keduanya';

/**
 * Mengurai harga menjadi bilangan bulat Rupiah penuh tanpa terpotong titik/koma ribuan.
 */
export function parseSafePrice(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.round(raw));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    // Tangani format desimal murni seperti "150000.00"
    if (/^\d+[.,]\d{1,2}$/.test(trimmed)) {
      const parsed = Number(trimmed.replace(',', '.'));
      return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
    }
    const digits = trimmed.replace(/\D/g, '');
    return digits ? Math.max(0, Number(digits)) : 0;
  }
  return 0;
}

/**
 * Menormalkan label kondisi barang ke 3 standar Grade tanpa salah deteksi "layak pakai" pada Grade B.
 */
export function resolveGrade(raw: unknown): ItemGradeLabel {
  const val = String(raw || '').trim();
  if (!val) return 'Grade B (Baik)';

  // Cek kode Grade eksplisit terlebih dahulu
  if (/\bgrade\s*a\b/i.test(val)) return 'Grade A (Seperti Baru)';
  if (/\bgrade\s*b\b/i.test(val)) return 'Grade B (Baik)';
  if (/\bgrade\s*c\b/i.test(val)) return 'Grade C (Layak Pakai)';

  // Fallback berdasarkan kata kunci deskriptif
  if (/seperti\s*baru|mulus|mint|baru/i.test(val)) return 'Grade A (Seperti Baru)';
  if (/baik|bagus|normal/i.test(val)) return 'Grade B (Baik)';
  if (/layak|minus|lecet/i.test(val)) return 'Grade C (Layak Pakai)';

  return 'Grade B (Baik)';
}

/**
 * Mengecek apakah barang sudah terjual / selesai dibarter.
 */
export function isItemSold(item: any): boolean {
  if (!item) return false;
  const status = String(item.status || '').toLowerCase();
  return (
    item.terjual === true ||
    item.isSold === true ||
    status === 'sold' ||
    status === 'terjual' ||
    status === 'dibarter'
  );
}

/**
 * Mengambil jenis penawaran valid ('jual' | 'barter' | 'keduanya') dengan kompatibilitas legacy.
 */
export function getItemTransactionType(item: any): ItemTxType {
  const candidates = [item?.status, item?.transactionType];
  for (const raw of candidates) {
    const val = String(raw || '').toLowerCase().trim();
    if (val === 'jual_barter' || val === 'keduanya') return 'keduanya';
    if (val === 'jual') return 'jual';
    if (val === 'barter') return 'barter';
  }
  return 'keduanya';
}

/**
 * Menghitung jarak Haversine dalam satuan meter antara dua titik koordinat.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Memformat jarak meter menjadi label "~XXX m" atau "~X.X km".
 */
export function formatDistanceLabel(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '';
  if (meters < 1000) {
    return `~${Math.round(meters)} m`;
  }
  return `~${(meters / 1000).toFixed(1)} km`;
}

/**
 * Menghitung dan langsung memformat jarak antara dua titik koordinat.
 */
export function calculateDistanceLabel(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): string {
  return formatDistanceLabel(calculateDistanceMeters(lat1, lng1, lat2, lng2));
}