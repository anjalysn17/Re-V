import React from 'react';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

interface OsmMapEmbedProps {
  locationName?: string;
  coordinates?: MapCoordinates | null;
  userCoordinates?: MapCoordinates | null;
  label?: string;
  height?: number;
  zoomDelta?: number;
  className?: string;
}

// Kamus koordinat area kampus UNNES Sekaran & titik aman COD
export const UNNES_COORDINATE_PRESETS: {
  name: string;
  keywords: string[];
  coords: MapCoordinates;
}[] = [
  {
    name: 'Gerbang Utama UNNES Sekaran',
    keywords: ['gerbang utama', 'sekaran'],
    coords: { lat: -7.0504, lng: 110.3924 },
  },
  {
    name: 'FMIPA UNNES',
    keywords: ['fmipa', 'mipa'],
    coords: { lat: -7.0521, lng: 110.3959 },
  },
  {
    name: 'Masjid Ulul Albab UNNES',
    keywords: ['ulul albab', 'masjid'],
    coords: { lat: -7.0507, lng: 110.3946 },
  },
  {
    name: 'Perpustakaan Pusat / Rumah Ilmu',
    keywords: ['perpustakaan', 'rumah ilmu'],
    coords: { lat: -7.0512, lng: 110.3951 },
  },
  {
    name: 'Rektorat / Lapangan Dumadi',
    keywords: ['rektorat', 'dumadi'],
    coords: { lat: -7.0509, lng: 110.3938 },
  },
  {
    name: 'Fakultas Teknik (FT)',
    keywords: ['fakultas teknik', '(ft)', 'teknik'],
    coords: { lat: -7.0528, lng: 110.3976 },
  },
  {
    name: 'Fakultas Ekonomika dan Bisnis (FEB)',
    keywords: ['feb', 'ekonomi', 'ekonomika'],
    coords: { lat: -7.0493, lng: 110.3952 },
  },
  {
    name: 'FISIP UNNES',
    keywords: ['fisip', 'sosial'],
    coords: { lat: -7.0498, lng: 110.3944 },
  },
  {
    name: 'Fakultas Bahasa dan Seni (FBS)',
    keywords: ['fbs', 'bahasa'],
    coords: { lat: -7.0502, lng: 110.3965 },
  },
  {
    name: 'FIPP / Ilmu Pendidikan',
    keywords: ['fip', 'fipp', 'pendidikan'],
    coords: { lat: -7.0516, lng: 110.3929 },
  },
  {
    name: 'FIK / GOR UNNES',
    keywords: ['fik', 'gor', 'keolahragaan'],
    coords: { lat: -7.0482, lng: 110.3931 },
  },
  {
    name: 'FH / FK UNNES',
    keywords: ['fh', 'fk', 'hukum', 'kedokteran'],
    coords: { lat: -7.0489, lng: 110.3967 },
  },
  {
    name: 'Area Fakultas Kampus',
    keywords: ['area fakultas'],
    coords: { lat: -7.0508, lng: 110.3952 },
  },
  {
    name: 'Indomaret Point Sekaran Raya',
    keywords: ['indomaret point', 'sekaran raya'],
    coords: { lat: -7.0499, lng: 110.3917 },
  },
  {
    name: 'Gang Pete / Taman Siswa / Banaran',
    keywords: ['gang pete', 'taman siswa', 'banaran'],
    coords: { lat: -7.0474, lng: 110.3935 },
  },
  {
    name: 'Patemon / Ngijo',
    keywords: ['patemon', 'ngijo'],
    coords: { lat: -7.0564, lng: 110.3962 },
  },
  {
    name: 'Kalisegoro / Trangkil',
    keywords: ['kalisegoro', 'trangkil'],
    coords: { lat: -7.0545, lng: 110.3885 },
  },
  {
    name: 'Gunungpati',
    keywords: ['gunungpati'],
    coords: { lat: -7.0936, lng: 110.3653 },
  },
];

// Default fallback: Gerbang Utama UNNES Sekaran
export const DEFAULT_UNNES_COORDS: MapCoordinates = {
  lat: -7.0504,
  lng: 110.3924,
};

export function resolveLocationCoordinates(
  locationName?: string,
  explicitCoords?: MapCoordinates | null
): MapCoordinates {
  if (
    explicitCoords &&
    typeof explicitCoords.lat === 'number' &&
    typeof explicitCoords.lng === 'number' &&
    Number.isFinite(explicitCoords.lat) &&
    Number.isFinite(explicitCoords.lng)
  ) {
    return explicitCoords;
  }

  if (locationName && locationName.trim()) {
    const normalized = locationName.toLowerCase();
    const matched = UNNES_COORDINATE_PRESETS.find((preset) =>
      preset.keywords.some((kw) => normalized.includes(kw))
    );
    if (matched) return matched.coords;
  }

  return DEFAULT_UNNES_COORDS;
}

export function calculateHaversineMeters(
  origin: MapCoordinates,
  target: MapCoordinates
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(target.lat - origin.lat);
  const dLng = toRad(target.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.lat)) *
      Math.cos(toRad(target.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceLabel(
  origin?: MapCoordinates | null,
  target?: MapCoordinates | null
): string | null {
  if (!origin || !target) return null;
  if (
    !Number.isFinite(origin.lat) ||
    !Number.isFinite(origin.lng) ||
    !Number.isFinite(target.lat) ||
    !Number.isFinite(target.lng)
  ) {
    return null;
  }

  const meters = calculateHaversineMeters(origin, target);
  if (meters < 1000) {
    return `~${Math.max(10, Math.round(meters))} m`;
  }
  return `~${(meters / 1000).toFixed(1)} km`;
}

export default function OsmMapEmbed({
  locationName,
  coordinates,
  userCoordinates,
  label,
  height = 180,
  zoomDelta = 0.0035,
  className = '',
}: OsmMapEmbedProps) {
  const coords = resolveLocationCoordinates(locationName, coordinates);
  const { lat, lng } = coords;

  const distanceText = formatDistanceLabel(userCoordinates, coords);

  const minLng = (lng - zoomDelta).toFixed(6);
  const minLat = (lat - zoomDelta).toFixed(6);
  const maxLng = (lng + zoomDelta).toFixed(6);
  const maxLat = (lat + zoomDelta).toFixed(6);

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const marker = `${lat.toFixed(6)},${lng.toFixed(6)}`;

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(marker)}`;

  const osmFullUrl = `https://www.openstreetmap.org/?mlat=${lat.toFixed(
    6
  )}&mlon=${lng.toFixed(6)}#map=17/${lat.toFixed(6)}/${lng.toFixed(6)}`;

  const gmapsNavUrl = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(
    6
  )},${lng.toFixed(6)}`;

  const displayTitle = label || locationName || 'Kampus UNNES Sekaran';

  return (
    <div
      className={`rounded-xl border border-gray-200 overflow-hidden bg-gray-50 ${className}`}
    >
      <div className="relative w-full" style={{ height }}>
        <iframe
          title={`Peta Lokasi - ${displayTitle}`}
          src={embedUrl}
          className="w-full h-full border-0 block"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-gray-700 font-medium truncate">
            📍 {displayTitle}
          </span>
          {distanceText && (
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
              {distanceText}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={osmFullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[36px] px-2.5 py-1.5 rounded-lg inline-flex items-center font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 touch-manipulation transition-colors"
          >
            Buka OSM
          </a>
          <span className="text-gray-300 select-none">|</span>
          <a
            href={gmapsNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[36px] px-2.5 py-1.5 rounded-lg inline-flex items-center font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100 touch-manipulation transition-colors"
          >
            Rute Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}