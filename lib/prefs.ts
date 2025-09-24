// lib/prefs.ts
export type Counter = Record<string, number>;
export type Prefs = { cat: Counter; store: Counter };

const KEY = "look.prefs.v2";              // novo namespace
const LEGACY_KEY = "look.prefs.v1";       // compat c/ versão antiga (só categorias)

function sanitizeKey(x?: string | null) {
  return (x ?? "").toLowerCase().trim();
}

function read(): Prefs {
  if (typeof window === "undefined") return { cat: {}, store: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Prefs;

    // fallback: migrar do v1 (objeto simples de categorias)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const cat = JSON.parse(legacy) as Counter;
      const prefs: Prefs = { cat, store: {} };
      localStorage.setItem(KEY, JSON.stringify(prefs));
      return prefs;
    }
  } catch {}
  return { cat: {}, store: {} };
}

function write(p: Prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function getPrefs(): Prefs {
  return read();
}

export function bumpCategory(cat?: string | null) {
  const k = sanitizeKey(cat);
  if (!k) return;
  const p = read();
  p.cat[k] = (p.cat[k] || 0) + 1;
  write(p);
}

export function bumpStore(store?: string | null) {
  const k = sanitizeKey(store);
  if (!k) return;
  const p = read();
  p.store[k] = (p.store[k] || 0) + 1;
  write(p);
}