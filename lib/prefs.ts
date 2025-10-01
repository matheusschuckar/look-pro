// src/lib/prefs.ts
// ===============================================
// Prefs V2 — sinais com decaimento temporal
// Armazena preferências em localStorage, por feature:
// - categoria, loja, gênero, tamanho, faixa de preço, eta (entrega)
// - também aceita "produto" para boost fino
// Cada key guarda { w: number, t: number } (peso, timestamp).
// Normalização é feita por max por feature.
// ===============================================

type KeyStat = { w: number; t: number };
type BucketMap = Record<string, KeyStat>;

export type PrefsV2 = {
  __v: 2;
  cat: BucketMap;
  store: BucketMap;
  gender: BucketMap;
  size: BucketMap;
  price: BucketMap; // ex: "low|0-199" | "mid|200-499" | "high|500+"
  eta: BucketMap;   // ex: "quick|<=60" | "std|<=120" | "long|>120"
  product: BucketMap; // productId -> peso
};

const STORAGE_KEY_V2 = "look.prefs.v2";
const LEGACY_KEY_V1 = "look.prefs.v1"; // manter compatível para migrar

// ======= parâmetros =======
const DEFAULT_HALF_LIFE_DAYS = 14; // meia-vida
const DEFAULT_BUMP = 1.0;
const MAX_W = 50; // clamp pra não explodir

function now() { return Date.now(); }
function days(ms: number) { return ms / (1000 * 60 * 60 * 24); }
function clamp(n: number, min = 0, max = MAX_W) {
  return Math.max(min, Math.min(max, n));
}

// decaimento exponencial pelo tempo decorrido vs half-life
function applyDecayTo(w: number, lastT: number, halfLifeDays = DEFAULT_HALF_LIFE_DAYS) {
  const elapsedDays = days(now() - (lastT || now()));
  const lambda = Math.log(2) / Math.max(halfLifeDays, 0.1);
  return w * Math.exp(-lambda * elapsedDays);
}

function empty(): PrefsV2 {
  return {
    __v: 2,
    cat: {},
    store: {},
    gender: {},
    size: {},
    price: {},
    eta: {},
    product: {},
  };
}

function loadV2(): PrefsV2 {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return maybeMigrateV1();
    const obj = JSON.parse(raw);
    if (obj?.__v === 2) return obj as PrefsV2;
    return maybeMigrateV1();
  } catch {
    return maybeMigrateV1();
  }
}

function maybeMigrateV1(): PrefsV2 {
  // v1 tinha shape: { cat: Record<string, number>, store: Record<string, number> }
  try {
    const raw = localStorage.getItem(LEGACY_KEY_V1);
    if (!raw) return empty();
    const v1 = JSON.parse(raw) || {};
    const out = empty();
    if (v1.cat) {
      for (const [k, w] of Object.entries(v1.cat)) {
        out.cat[(k || "").toLowerCase()] = { w: clamp(Number(w) || 0), t: now() };
      }
    }
    if (v1.store) {
      for (const [k, w] of Object.entries(v1.store)) {
        out.store[(k || "").toLowerCase()] = { w: clamp(Number(w) || 0), t: now() };
      }
    }
    localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(out));
    return out;
  } catch {
    return empty();
  }
}

function saveV2(p: PrefsV2) {
  try {
    if (typeof window === "undefined") return; // SSR: não há localStorage
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(p));
  } catch {
    // se o storage estiver indisponível (ex.: privacy mode), apenas ignore
  }
}

function decayAllFeature(map: BucketMap, halfLifeDays = DEFAULT_HALF_LIFE_DAYS) {
  const nowT = now();
  for (const k of Object.keys(map)) {
    const s = map[k];
    const decayed = applyDecayTo(s.w, s.t, halfLifeDays);
    if (decayed < 0.01) delete map[k];
    else map[k] = { w: decayed, t: nowT };
  }
}

export function decayAll(halfLifeDays = DEFAULT_HALF_LIFE_DAYS) {
  const p = loadV2();
  decayAllFeature(p.cat, halfLifeDays);
  decayAllFeature(p.store, halfLifeDays);
  decayAllFeature(p.gender, halfLifeDays);
  decayAllFeature(p.size, halfLifeDays);
  decayAllFeature(p.price, halfLifeDays);
  decayAllFeature(p.eta, halfLifeDays);
  decayAllFeature(p.product, halfLifeDays);
  saveV2(p);
  return p;
}

// bump genérico
function bump(map: BucketMap, key: string, amt = DEFAULT_BUMP) {
  const k = (key || "").trim().toLowerCase();
  if (!k) return;
  const s = map[k] || { w: 0, t: 0 };
  const decayed = applyDecayTo(s.w, s.t);
  map[k] = { w: clamp(decayed + amt), t: now() };
}

// ====== API pública (sintaxe amigável) ======
export function getPrefsV2(): PrefsV2 {
  return loadV2();
}

// compat: retorna estrutura antiga esperada por algum código legado
export function getPrefs(): { cat: Record<string, number>; store: Record<string, number> } {
  const p = loadV2();
  const cat: Record<string, number> = {};
  const store: Record<string, number> = {};
  for (const [k, s] of Object.entries(p.cat)) cat[k] = applyDecayTo(s.w, s.t);
  for (const [k, s] of Object.entries(p.store)) store[k] = applyDecayTo(s.w, s.t);
  return { cat, store };
}

function write(fn: (p: PrefsV2) => void) {
  const p = loadV2();
  fn(p);
  saveV2(p);
}

export function bumpCategory(cat: string, amt = 1) {
  write((p) => bump(p.cat, cat, amt));
}
export function bumpStore(storeName: string, amt = 1) {
  write((p) => bump(p.store, storeName, amt));
}
export function bumpGender(g: "male" | "female" | string, amt = 1) {
  write((p) => bump(p.gender, g, amt));
}
export function bumpSize(s: string, amt = 1) {
  write((p) => bump(p.size, s, amt));
}
export function bumpPriceBucket(bucket: string, amt = 1) {
  write((p) => bump(p.price, bucket, amt));
}
export function bumpEtaBucket(bucket: string, amt = 1) {
  write((p) => bump(p.eta, bucket, amt));
}
export function bumpProduct(productId: number | string, amt = 0.5) {
  write((p) => bump(p.product, String(productId), amt));
}
