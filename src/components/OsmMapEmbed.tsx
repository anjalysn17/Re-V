import React from 'react';

export interface MapCoordinates {
  lat: number;
  lng: number;
}

interface OsmMapEmbedProps {
  locationName?: string;
  coordinates?: MapCoordinates | null;
  label?: string;
  height?: number;
  zoomDelta?: number;
  className?: string;
}

// Kamus koordinat area kampus UNNES Sekaran & titik aman COD
const UNNES_COORDINATE_PRESETS: { keywords: string[]; coords: MapCoordinates }[] = [
  {
    keywords: ['gerbang utama', 'sekaran'],
    coords: { lat: -7.0504, lng: 110.3924 },
  },
  {
    keywords: ['fmipa', 'mipa'],
    coords: { lat: -7.0521, lng: 110.3959 },
  },
  {
    keywords: ['ulul albab', 'masjid'],
    coords: { lat: -7.0507, lng: 110.3946 },
  },
  {
    keywords: ['perpustakaan', 'rumah ilmu'],
    coords: { lat: -7.0512, lng: 110.3951 },
  },
  {
    keywords: ['rektorat', 'dumadi'],
    coords: { lat: -7.0509, lng: 110.3938 },
  },
  {
    keywords: ['fakultas teknik', '(ft)', 'teknik'],
    coords: { lat: -7.0528, lng: 110.3976 },
  },
  {
    keywords: ['feb', 'ekonomi', 'ekonomika'],
    coords: { lat: -7.0493, lng: 110.3952 },
  },
  {
    keywords: ['fisip', 'sosial'],
    coords: { lat: -7.0498, lng: 110.3944 },
  },
  {
    keywords: ['fbs', 'bahasa'],
    coords: { lat: -7.0502, lng: 110.3965 },
  },
  {
    keywords: ['fip', 'fipp', 'pendidikan'],
    coords: { lat: -7.0516, lng: 110.3929 },
  },
  {
    keywords: ['fik', 'gor', 'keolahragaan'],
    coords: { lat: -7.0482, lng: 110.3931 },
  },
  {
    keywords: ['fh', 'fk', 'hukum', 'kedokteran'],
    coords: { lat: -7.0489, lng: 110.3967 },
  },
  {
    keywords: ['area fakultas'],
    coords: { lat: -7.0508, lng: 110.3952 },
  },
  {
    keywords: ['indomaret point', 'sekaran raya'],
    coords: { lat: -7.0499, lng: 110.3917 },
  },
  {
    keywords: ['gang pete', 'taman siswa', 'banaran'],
    coords: { lat: -7.0474, lng: 110.3935 },
  },
  {
    keywords: ['patemon', 'ngijo'],
    coords: { lat: -7.0564, lng: 110.3962 },
  },
  {
    keywords: ['kalisegoro', 'trangkil'],
    coords: { lat: -7.0545, lng: 110.3885 },
  },
  {
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

export default function OsmMapEmbed({
  locationName,
  coordinates,
  label,
  height = 180,
  zoomDelta = 0.0035,
  className = '',
}: OsmMapEmbedProps) {
  const coords = resolveLocationCoordinates(locationName, coordinates);
  const { lat, lng } = coords;

  const minLng = (lng - zoomDelta).toFixed(6);
  const minLat = (lat - zoomDelta).toFixed(6);
  const maxLng = (lng + zoomDelta).toFixed(6);
  const maxLat = (lat + zoomDelta).toFixed(6);

  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const marker = `${lat.toFixed(6)},${lng.toFixed(6)}`;

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(marker)}`;

  const osmFullUrl = `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lng.toFixed(
    6
  )}#map=17/${lat.toFixed(6)}/${lng.toFixed(6)}`;

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

      <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-gray-600 font-medium truncate max-w-[60%]">
          📍 {displayTitle}
        </span>
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href={osmFullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-600 hover:text-gray-900 underline"
          >
            Buka OSM
          </a>
          <span className="text-gray-300">|</span>
          <a
            href={gmapsNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-emerald-700 hover:text-emerald-800"
          >
            Rute Maps ↗
          </a>
        </div>
      </div>
    </div>
  );
}