// Lapisan koneksi ke backend (Railway).
// PAKEM: bila VITE_API_URL kosong -> API_ENABLED=false -> aplikasi berjalan 100% localStorage
// seperti sebelumnya (tidak ada satu pun request jaringan).

const DB_KEY = 'jualbeliDB';
const ORDERS_KEY = 'rev_orders';
const TOKEN_KEY = 'rev_token';
const CURRENT_USER_KEY = 'currentUser';

export const API_URL: string = String(import.meta.env.VITE_API_URL ?? '')
  .trim()
  .replace(/\/+$/, '');
export const API_ENABLED: boolean = API_URL.length > 0;

// Urutan penting: conversations harus sebelum messages (server memeriksa peserta percakapan),
// dan settings di akhir untuk menyimpan konfigurasi sistem seperti SET-flash_barter.
const SYNC_ORDER = [
  'users',
  'items',
  'conversations',
  'offers',
  'messages',
  'notifications',
  'cart',
  'orders',
  'settings',
] as const;
type CollectionName = (typeof SYNC_ORDER)[number];

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------- Token ----------
export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string): void => {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* abaikan */
  }
};
export const clearToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
};

function handleExpired(): void {
  clearToken();
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    /* abaikan */
  }
  window.dispatchEvent(new Event('rev-auth-expired'));
}

// ---------- HTTP ----------
async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api${path}`, { ...init, headers, signal: ctrl.signal });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      if (res.status === 401 && token && !path.startsWith('/auth/login')) handleExpired();
      throw new ApiError(res.status, body.message || `Permintaan gagal (${res.status})`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Auth & OTP ----------
export interface AuthResult {
  token: string;
  user: Record<string, unknown>;
}
export const apiLogin = (identifier: string, password: string) =>
  request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });

export const apiSendOtp = (email: string, mode: 'register' | 'verify-existing' = 'register') =>
  request<{ ok: boolean; message: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, mode }),
  });

export const apiVerifyOtp = (email: string, code: string) =>
  request<{ ok: boolean; verified: boolean; message: string; user?: Record<string, unknown> | null }>(
    '/auth/verify-otp',
    {
      method: 'POST',
      body: JSON.stringify({ email, code, otp: code }),
    }
  );

export const apiRegister = (data: {
  nama: string;
  email: string;
  password: string;
  lokasi?: string;
  otp?: string;
  code?: string;
}) =>
  request<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...data, code: data.code ?? data.otp, otp: data.otp ?? data.code }),
  });

export const apiMe = () => request<{ user: Record<string, unknown> }>('/auth/me');

// ---------- Rekomendasi Lokasi COD (Haversine + Gemini AI) ----------
export interface CodSpotRecommendation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  desc: string;
  distMidKm: number;
  distAKm: number | null;
  distBKm: number | null;
}

export interface RecommendCodResponse {
  source?: string;
  userDistanceKm?: number | null;
  midpoint?: { lat: number; lng: number } | null;
  spots?: CodSpotRecommendation[];
  recommendations?: CodSpotRecommendation[];
  recommendedSpot?: CodSpotRecommendation;
  advice?: string;
}

export const apiSuggestCod = (payload: {
  conversationId?: string;
  itemId?: string;
  buyerLocation?: { lat: number; lng: number } | null;
  sellerLocation?: { lat: number; lng: number } | null;
  coordA?: { lat: number; lng: number } | null;
  coordB?: { lat: number; lng: number } | null;
  itemName?: string;
  itemCategory?: string;
}) =>
  request<RecommendCodResponse>(
    '/chat/suggest-cod',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    20000
  );

// Alias kompatibilitas bila komponen memanggil apiRecommendCod
export const apiRecommendCod = apiSuggestCod;

// ---------- Sync ----------
type Rec = Record<string, unknown> & { id?: unknown };
type Snapshot = Map<string, string>;
interface Op {
  c: CollectionName;
  op: 'upsert' | 'delete';
  id: string;
  data?: Rec;
  json?: string;
}

let snapshot: Record<CollectionName, Snapshot> | null = null;
let hydrated = false;
let flushing = false;
let lastVersion = '';
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

let chain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const p = chain.then(fn, fn);
  chain = p.catch(() => undefined);
  return p;
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLocal(): Record<CollectionName, Rec[]> {
  const db = readJSON<Record<string, unknown>>(DB_KEY, {});
  const out = {} as Record<CollectionName, Rec[]>;
  for (const c of SYNC_ORDER) {
    if (c === 'orders') {
      const src = readJSON<unknown>(ORDERS_KEY, []);
      out[c] = Array.isArray(src) ? (src as Rec[]) : [];
    } else if (c === 'settings') {
      const list: Rec[] = Array.isArray(db.settings) ? [...(db.settings as Rec[])] : [];
      if (db.flash_barter && typeof db.flash_barter === 'object') {
        const fb = db.flash_barter as Rec;
        const fbRecord: Rec = { ...fb, id: 'SET-flash_barter' };
        const idx = list.findIndex((item) => item && String(item.id) === 'SET-flash_barter');
        if (idx >= 0) list[idx] = fbRecord;
        else list.push(fbRecord);
      }
      out[c] = list;
    } else {
      const src = db[c];
      out[c] = Array.isArray(src) ? (src as Rec[]) : [];
    }
  }
  return out;
}

function clean(c: CollectionName, rec: Rec): Rec {
  if (c !== 'users') return rec;
  const { password: _password, ...rest } = rec as Rec & { password?: unknown };
  return rest;
}

function buildSnapshot(cols: Record<CollectionName, Rec[]>): Record<CollectionName, Snapshot> {
  const snap = {} as Record<CollectionName, Snapshot>;
  for (const c of SYNC_ORDER) {
    const m: Snapshot = new Map();
    for (const rec of cols[c]) {
      if (rec && rec.id !== undefined && rec.id !== null) m.set(String(rec.id), JSON.stringify(clean(c, rec)));
    }
    snap[c] = m;
  }
  return snap;
}

function computeOps(): Op[] {
  if (!snapshot) return [];
  const cols = readLocal();
  const ops: Op[] = [];
  for (const c of SYNC_ORDER) {
    const seen = new Set<string>();
    for (const rec of cols[c]) {
      if (!rec || rec.id === undefined || rec.id === null) continue;
      const id = String(rec.id);
      seen.add(id);
      const json = JSON.stringify(clean(c, rec));
      if (snapshot[c].get(id) !== json) ops.push({ c, op: 'upsert', id, data: JSON.parse(json) as Rec, json });
    }
    for (const id of snapshot[c].keys()) {
      if (!seen.has(id)) ops.push({ c, op: 'delete', id });
    }
  }
  return ops;
}

interface SyncResult {
  c: string;
  id: string;
  op: string;
  status: string;
  message?: string;
}

async function runFlush(): Promise<void> {
  if (!API_ENABLED || !snapshot || !getToken()) return;
  const ops = computeOps();
  if (ops.length === 0) return;

  flushing = true;
  try {
    let realign = false;
    for (let i = 0; i < ops.length; i += 200) {
      const chunk = ops.slice(i, i + 200);
      const res = await request<{ results: SyncResult[] }>(
        '/sync',
        {
          method: 'POST',
          body: JSON.stringify({ ops: chunk.map(({ c, op, id, data }) => ({ c, op, id, data })) }),
        },
        30000
      );
      chunk.forEach((o, idx) => {
        const r = res.results[idx];
        if (r && r.status === 'ok') {
          if (o.op === 'delete') snapshot![o.c].delete(o.id);
          else snapshot![o.c].set(o.id, o.json as string);
        } else {
          realign = true;
          console.warn('[sync] ditolak server:', o.c, o.id, r?.message);
        }
      });
    }
    if (realign) await doPull();
  } finally {
    flushing = false;
  }
}

async function doPull(): Promise<void> {
  const data = await request<Record<string, unknown>>('/db');
  const cols = {} as Record<CollectionName, Rec[]>;
  for (const c of SYNC_ORDER) cols[c] = Array.isArray(data[c]) ? (data[c] as Rec[]) : [];

  // Sinkronkan konfigurasi Flash Barter baik dari field langsung maupun koleksi settings
  const settingsFb = cols.settings.find((item) => item && String(item.id) === 'SET-flash_barter');
  const resolvedFlashBarter =
    data.flash_barter && typeof data.flash_barter === 'object'
      ? (data.flash_barter as Rec)
      : settingsFb ?? null;

  if (resolvedFlashBarter) {
    const fbWithId: Rec = { ...resolvedFlashBarter, id: 'SET-flash_barter' };
    const idx = cols.settings.findIndex((item) => item && String(item.id) === 'SET-flash_barter');
    if (idx >= 0) cols.settings[idx] = fbWithId;
    else cols.settings.push(fbWithId);
  }

  const { orders, ...dbCollections } = cols;
  const dbOnly: Record<string, unknown> = {
    ...dbCollections,
    ...(resolvedFlashBarter ? { flash_barter: { ...resolvedFlashBarter, id: 'SET-flash_barter' } } : {}),
  };

  try {
    localStorage.setItem(DB_KEY, JSON.stringify(dbOnly));
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('[sync] gagal menulis cache (kuota localStorage penuh?)', err);
  }
  snapshot = buildSnapshot(cols);
  lastVersion = typeof data.version === 'string' ? data.version : '';
  hydrated = true;

  window.dispatchEvent(new Event('rev-orders-updated'));
  window.dispatchEvent(new Event('rev-db-updated'));
}

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    enqueue(runFlush).catch((err) => {
      if (err instanceof ApiError && err.status === 401) return;
      console.warn('[sync] gagal kirim, coba lagi 5 detik:', err instanceof Error ? err.message : err);
      setTimeout(schedulePush, 5000);
    });
  }, 300);
}

export function notifyLocalChange(): void {
  if (API_ENABLED && hydrated) schedulePush();
}

export function flushNow(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  return enqueue(runFlush);
}

export function pullAll(): Promise<void> {
  return enqueue(async () => {
    await runFlush();
    await doPull();
  });
}

export function resetLocalCacheForApi(): void {
  try {
    localStorage.removeItem(DB_KEY);
    localStorage.removeItem(ORDERS_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    /* abaikan */
  }
  snapshot = null;
  hydrated = false;
}

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    if (document.hidden || !hydrated || pushTimer || flushing) return;
    try {
      const v = await request<{ version: string }>('/db/version', {}, 8000);
      if (v.version !== lastVersion) await pullAll();
    } catch {
      /* jaringan putus: coba lagi di putaran berikutnya */
    }
  }, 5000);
}

export async function bootstrapBackend(): Promise<void> {
  if (!API_ENABLED) return;
  try {
    await Promise.race([
      pullAll(),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000)),
    ]);
  } catch (err) {
    console.warn('[sync] server belum bisa dijangkau, memakai cache lokal:', err instanceof Error ? err.message : err);
  }
  startPolling();
}