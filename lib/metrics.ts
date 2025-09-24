// lib/metrics.ts
const VIEWS_KEY = "look.metrics.v1.views"; // { [productId: string]: number }

type ViewsMap = Record<string, number>;

function readViews(): ViewsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? (JSON.parse(raw) as ViewsMap) : {};
  } catch {
    return {};
  }
}

function writeViews(map: ViewsMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEWS_KEY, JSON.stringify(map));
}

export function getViewsMap(): ViewsMap {
  return readViews();
}

export function getViews(productId: number): number {
  const map = readViews();
  return map[String(productId)] || 0;
}

export function bumpView(productId: number) {
  const id = String(productId);
  const map = readViews();
  map[id] = (map[id] || 0) + 1;
  writeViews(map);

  // dispara event p/ outras abas/componentes reagirem (opcional)
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: VIEWS_KEY,
        newValue: JSON.stringify(map),
      })
    );
  } catch {}
}
