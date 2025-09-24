// lib/bag.ts
export type BagItem = {
  product_id: number;
  name: string;
  store_name: string;
  photo_url: string;
  size: string;
  unit_price: number; // preço unitário já com % da Look embutida
  qty: number;        // quantidade
};

const KEY = "look_bag_v1";

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getBag(): BagItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<BagItem[]>(localStorage.getItem(KEY), []);
}

function saveBag(items: BagItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function addToBag(item: BagItem) {
  const bag = getBag();
  const i = bag.findIndex(
    (x) => x.product_id === item.product_id && x.size === item.size
  );
  if (i >= 0) {
    bag[i].qty += item.qty;
  } else {
    bag.push(item);
  }
  saveBag(bag);
  return bag;
}

export function removeFromBag(index: number) {
  const bag = getBag();
  bag.splice(index, 1);
  saveBag(bag);
  return bag;
}

export function updateQty(index: number, qty: number) {
  const bag = getBag();
  bag[index].qty = Math.max(1, qty);
  saveBag(bag);
  return bag;
}

export function clearBag() {
  saveBag([]);
}

export function bagTotals(items: BagItem[]) {
  const subtotal = items.reduce((s, it) => s + it.unit_price * it.qty, 0);
  return { subtotal };
}