export type LocationZone =
  | 'Dalam Kampus UNNES'
  | 'Area Kos & Sekitar Sekaran'
  | 'Gunungpati & Semarang Kota';

export interface CampusLocation {
  id: string;
  name: string;
  shortName: string;
  zone: LocationZone;
  description: string;
  lat: number;
  lng: number;
  isPopularCod?: boolean;
}

export const DEFAULT_LOCATION_ID = 'unnes-gerbang-utama';

export const LOCATION_ZONES: LocationZone[] = [
  'Dalam Kampus UNNES',
  'Area Kos & Sekitar Sekaran',
  'Gunungpati & Semarang Kota',
];

export const UNNES_LOCATIONS: CampusLocation[] = [
  // --- Dalam Kampus UNNES ---
  {
    id: 'unnes-gerbang-utama',
    name: 'Gerbang Utama UNNES (Sekaran)',
    shortName: 'Gerbang Utama',
    zone: 'Dalam Kampus UNNES',
    description: 'Area depan gerbang utama & bundaran Sekaran',
    lat: -7.0504,
    lng: 110.3924,
    isPopularCod: true,
  },
  {
    id: 'unnes-perpustakaan',
    name: 'Perpustakaan Pusat (Rumah Ilmu)',
    shortName: 'Perpus Pusat',
    zone: 'Dalam Kampus UNNES',
    description: 'Lobi depan / taman Perpustakaan Pusat UNNES',
    lat: -7.0512,
    lng: 110.3951,
    isPopularCod: true,
  },
  {
    id: 'unnes-rektorat-dumadi',
    name: 'Rektorat & Lapangan Dumadi',
    shortName: 'Lap. Dumadi',
    zone: 'Dalam Kampus UNNES',
    description: 'Sekitar Gedung Rektorat & Lapangan Prof. Dumadi',
    lat: -7.0509,
    lng: 110.3938,
    isPopularCod: true,
  },
  {
    id: 'unnes-ft',
    name: 'Fakultas Teknik (FT)',
    shortName: 'FT UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Dekanat FT, Gedung E, atau Kantin Teknik',
    lat: -7.0528,
    lng: 110.3976,
    isPopularCod: true,
  },
  {
    id: 'unnes-fmipa',
    name: 'Fakultas MIPA (FMIPA)',
    shortName: 'FMIPA UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung D / Taman FMIPA UNNES',
    lat: -7.0521,
    lng: 110.3959,
  },
  {
    id: 'unnes-feb',
    name: 'Fakultas Ekonomika & Bisnis (FEB)',
    shortName: 'FEB UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung L / Parkiran FEB UNNES',
    lat: -7.0493,
    lng: 110.3952,
  },
  {
    id: 'unnes-fisip',
    name: 'Fakultas Ilmu Sosial & Ilmu Politik (FISIP)',
    shortName: 'FISIP UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung C / Area FISIP UNNES',
    lat: -7.0498,
    lng: 110.3944,
  },
  {
    id: 'unnes-fbs',
    name: 'Fakultas Bahasa & Seni (FBS)',
    shortName: 'FBS UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung B / Pendopo FBS UNNES',
    lat: -7.0502,
    lng: 110.3965,
  },
  {
    id: 'unnes-fipp',
    name: 'Fakultas Ilmu Pendidikan & Psikologi (FIPP)',
    shortName: 'FIPP UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung A / Area FIPP UNNES',
    lat: -7.0516,
    lng: 110.3929,
  },
  {
    id: 'unnes-fik',
    name: 'Fakultas Ilmu Keolahragaan (FIK) / GOR',
    shortName: 'FIK / GOR',
    zone: 'Dalam Kampus UNNES',
    description: 'Area GOR FIK & Lapangan Atletik',
    lat: -7.0482,
    lng: 110.3931,
  },
  {
    id: 'unnes-fh-fk',
    name: 'Fakultas Hukum (FH) & Kedokteran (FK)',
    shortName: 'FH / FK UNNES',
    zone: 'Dalam Kampus UNNES',
    description: 'Gedung K / Kampus Hukum & Kedokteran',
    lat: -7.0489,
    lng: 110.3967,
  },

  // --- Area Kos & Sekitar Sekaran ---
  {
    id: 'kos-sekaran-gang-pete',
    name: 'Sekaran & Gang Pete',
    shortName: 'Sekaran / Gg. Pete',
    zone: 'Area Kos & Sekitar Sekaran',
    description: 'Area kos Jl. Sekaran Raya, Gang Pete, dan sekitarnya',
    lat: -7.0518,
    lng: 110.3908,
    isPopularCod: true,
  },
  {
    id: 'kos-banaran-taman-siswa',
    name: 'Banaran & Jl. Taman Siswa',
    shortName: 'Banaran',
    zone: 'Area Kos & Sekitar Sekaran',
    description: 'Area kos Banaran, Kalimasada, & Jl. Taman Siswa',
    lat: -7.0468,
    lng: 110.3945,
    isPopularCod: true,
  },
  {
    id: 'kos-patemon-ngijo',
    name: 'Patemon & Ngijo',
    shortName: 'Patemon / Ngijo',
    zone: 'Area Kos & Sekitar Sekaran',
    description: 'Area kos Patemon, Mangunsari, & Ngijo',
    lat: -7.0564,
    lng: 110.3962,
  },
  {
    id: 'kos-kalisegoro-trangkil',
    name: 'Kalisegoro & Trangkil',
    shortName: 'Kalisegoro',
    zone: 'Area Kos & Sekitar Sekaran',
    description: 'Area kos Kalisegoro, Trangkil, & sekitar gerbang belakang',
    lat: -7.0545,
    lng: 110.3885,
  },

  // --- Gunungpati & Semarang Kota ---
  {
    id: 'area-gunungpati',
    name: 'Alun-Alun / Pasar Gunungpati',
    shortName: 'Gunungpati',
    zone: 'Gunungpati & Semarang Kota',
    description: 'Pusat Kecamatan Gunungpati dan sekitarnya',
    lat: -7.0936,
    lng: 110.3653,
  },
  {
    id: 'area-sampangan-gajahmungkur',
    name: 'Sampangan & Gajahmungkur',
    shortName: 'Sampangan',
    zone: 'Gunungpati & Semarang Kota',
    description: 'Area Jl. Menoreh, Sampangan, & Gajahmungkur',
    lat: -7.0155,
    lng: 110.3973,
  },
  {
    id: 'area-semarang-kota',
    name: 'Semarang Kota (Simpang Lima / Banyumanik)',
    shortName: 'Semarang Kota',
    zone: 'Gunungpati & Semarang Kota',
    description: 'Area Semarang Tengah, Tembalang, atau Banyumanik',
    lat: -6.9904,
    lng: 110.4229,
  },
];

export const POPULAR_COD_SPOTS: CampusLocation[] = UNNES_LOCATIONS.filter(
  (loc) => loc.isPopularCod
);

export function getGroupedLocations(): {
  zone: LocationZone;
  locations: CampusLocation[];
}[] {
  return LOCATION_ZONES.map((zone) => ({
    zone,
    locations: UNNES_LOCATIONS.filter((loc) => loc.zone === zone),
  }));
}

export function findLocation(idOrName?: string | null): CampusLocation | undefined {
  if (!idOrName) return undefined;
  const normalized = idOrName.trim().toLowerCase();
  if (!normalized) return undefined;

  // 1. Pencocokan persis (id, name, shortName)
  const exact = UNNES_LOCATIONS.find(
    (loc) =>
      loc.id.toLowerCase() === normalized ||
      loc.name.toLowerCase() === normalized ||
      loc.shortName.toLowerCase() === normalized
  );
  if (exact) return exact;

  // 2. Pencocokan kata kunci (misal "Sekaran, Gunungpati" atau "Patemon, Gunungpati")
  if (normalized === 'kampus unnes') {
    return UNNES_LOCATIONS.find((loc) => loc.id === DEFAULT_LOCATION_ID);
  }

  return UNNES_LOCATIONS.find((loc) => {
    const primaryKeyword = loc.shortName.split('/')[0].trim().toLowerCase();
    return (
      (primaryKeyword.length >= 3 && normalized.includes(primaryKeyword)) ||
      loc.name.toLowerCase().includes(normalized)
    );
  });
}

export function formatLocationLabel(
  idOrName?: string | null,
  fallback = 'Kampus UNNES Sekaran'
): string {
  if (!idOrName || !idOrName.trim()) return fallback;
  const found = findLocation(idOrName);
  return found ? found.name : idOrName;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Mengubah jarak dalam kilometer menjadi label yang mudah dibaca ("~350 m" atau "~1.4 km").
 */
export function formatDistanceLabel(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return '';
  if (distanceKm < 1) {
    const meters = Math.max(10, Math.round((distanceKm * 1000) / 10) * 10);
    return `~${meters} m`;
  }
  return `~${distanceKm.toFixed(1)} km`;
}

/**
 * Menghitung estimasi jarak antara lokasi pengguna (koordinat GPS privat atau area profil)
 * dengan titik area barang/COD yang dipublikasikan.
 */
export function estimateLocationDistance(
  originLocation?: string | null,
  targetLocation?: string | null,
  originCoords?: { lat: number; lng: number } | null
): { distanceKm: number; label: string } | null {
  const targetLoc = findLocation(targetLocation);
  if (!targetLoc) return null;

  if (
    originCoords &&
    typeof originCoords.lat === 'number' &&
    Number.isFinite(originCoords.lat) &&
    typeof originCoords.lng === 'number' &&
    Number.isFinite(originCoords.lng)
  ) {
    const km = haversineDistanceKm(originCoords.lat, originCoords.lng, targetLoc.lat, targetLoc.lng);
    return { distanceKm: km, label: formatDistanceLabel(km) };
  }

  const originLoc = findLocation(originLocation);
  if (!originLoc) return null;

  const km = haversineDistanceKm(originLoc.lat, originLoc.lng, targetLoc.lat, targetLoc.lng);
  return { distanceKm: km, label: formatDistanceLabel(km) };
}

/**
 * Mencari area preset kampus terdekat dari koordinat GPS perangkat
 * agar koordinat presisi pengguna tidak tersimpan ke data publik barang.
 */
export function findNearestCampusLocation(lat: number, lng: number): CampusLocation {
  let nearest = UNNES_LOCATIONS[0];
  let minDistance = Infinity;

  for (const loc of UNNES_LOCATIONS) {
    const dist = haversineDistanceKm(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = loc;
    }
  }

  return nearest;
}

export function getOsmEmbedUrl(lat: number, lng: number, delta = 0.004): string {
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`;
}

export function getGoogleMapsUrl(location: Pick<CampusLocation, 'lat' | 'lng'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}