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

/**
 * Mengelompokkan lokasi berdasarkan zona untuk kebutuhan dropdown (<optgroup>).
 */
export function getGroupedLocations(): {
  zone: LocationZone;
  locations: CampusLocation[];
}[] {
  return LOCATION_ZONES.map((zone) => ({
    zone,
    locations: UNNES_LOCATIONS.filter((loc) => loc.zone === zone),
  }));
}

/**
 * Mencari data lokasi berdasarkan ID maupun nama lokasi (kompatibel jika data lama menyimpan string nama langsung).
 */
export function findLocation(idOrName?: string | null): CampusLocation | undefined {
  if (!idOrName) return undefined;
  const normalized = idOrName.trim().toLowerCase();
  return UNNES_LOCATIONS.find(
    (loc) =>
      loc.id.toLowerCase() === normalized ||
      loc.name.toLowerCase() === normalized ||
      loc.shortName.toLowerCase() === normalized
  );
}

/**
 * Menampilkan label lokasi yang rapi untuk kartu barang atau detail transaksi.
 */
export function formatLocationLabel(
  idOrName?: string | null,
  fallback = 'Kampus UNNES Sekaran'
): string {
  if (!idOrName || !idOrName.trim()) return fallback;
  const found = findLocation(idOrName);
  return found ? found.name : idOrName;
}

/**
 * Membuat tautan Google Maps untuk titik temu COD.
 */
export function getGoogleMapsUrl(location: CampusLocation): string {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
}