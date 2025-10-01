// lib/ui/helpers.ts

// endereço / perfil
export function isSPCity(city: string | null | undefined) {
    const c = (city || "").toLowerCase();
    return c.includes("são paulo") || c.includes("sao paulo");
  }
  export function cepOk(cep: string | null | undefined) {
    return (cep || "").replace(/\D/g, "").length === 8;
  }
  export function hasAddressBasics(p: { street: string | null; number: string | null; cep: string | null } | null) {
    if (!p) return false;
    return !!(p.street && p.number && cepOk(p.cep));
  }
  export function hasContact(p: { name: string | null; whatsapp: string | null } | null) {
    if (!p) return false;
    return !!(p.name && p.whatsapp);
  }
  export function inCoverage(p: { city: string | null; state?: string | null } | null) {
    if (!p) return false;
    const cityOk = isSPCity(p.city);
    const stateOk = (p.state || "").toUpperCase() === "SP";
    return cityOk && stateOk;
  }
  export function profileComplete(p: any) {
    if (!p) return false;
    return hasAddressBasics(p) && hasContact(p) && inCoverage(p);
  }
  
  // sets / util
  export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }
  export function intersects<T>(a: Set<T>, arr: T[]): boolean {
    for (const x of arr) if (a.has(x)) return true;
    return false;
  }
  
  // formatação
  export function formatBRLAlpha(v: number) {
    const cents = Math.round(v * 100) % 100;
    if (cents === 0) {
      return `BRL ${Math.round(v).toLocaleString("pt-BR")}`;
    }
    return `BRL ${v.toFixed(2).replace(".", ",")}`;
  }
  
  // imagens
  export function firstImage(x: string[] | string | null | undefined) {
    return Array.isArray(x) ? x[0] ?? "" : x ?? "";
  }
  
  // categorias
  export function categoriesOf(p: { category?: string | null; categories?: string[] | null }): string[] {
    const one = (p.category || "").trim().toLowerCase();
    const many = (p.categories || []).map((c) => (c || "").trim().toLowerCase());
    const all = (one ? [one] : []).concat(many);
    return Array.from(new Set(all.filter(Boolean)));
  }
  
  // buckets
  export function priceBucket(v: number): string {
    if (v < 200) return "low|0-199";
    if (v < 500) return "mid|200-499";
    return "high|500+";
  }
  export function etaBucket(txt?: string | null): string {
    const s = (txt || "").toLowerCase();
    const m = s.match(/(\d+)\s*(min|mins|minutos)/);
    if (m) {
      const mins = Number(m[1] || 0);
      if (mins <= 60) return "quick|<=60";
      if (mins <= 120) return "std|<=120";
      return "long|>120";
    }
    const h = s.match(/(\d+)\s*h/);
    if (h) {
      const hrs = Number(h[1] || 0);
      if (hrs <= 1) return "quick|<=60";
      if (hrs <= 2) return "std|<=120";
      return "long|>120";
    }
    return "std|<=120";
  }
  
