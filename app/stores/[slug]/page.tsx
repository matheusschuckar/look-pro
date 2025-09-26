"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ===== Tipagens =====
export type Block =
  | { type: "hero"; image?: string; title?: string; subtitle?: string; show_text?: boolean }
  | { type: "bio" }
  | { type: "category_menu"; source?: "product_categories" | "custom"; items?: string[] }
  | { type: "grid"; rows: number; cols: number; filter?: Record<string, any> }
  | { type: "banner"; image: string; title?: string; subtitle?: string; href?: string };

export type StoreLayout = { blocks?: Block[] } | null;

export type Store = {
  id: number;
  slug: string;
  store_name: string; // <- usar store_name, não name
  bio: string | null;
  address: string | null;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  layout: StoreLayout;
};

export type Product = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string[] | string | null;
  eta_text: string | null;
  price_tag: number;
  category?: string | null;
  gender?: "male" | "female" | "unisex" | null;
  sizes?: string[] | string | null;
  featured?: boolean | null;
};

// ===== Utils =====
function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function toSizeList(sizes: Product["sizes"]): string[] {
  if (!sizes) return [];
  const raw = Array.isArray(sizes) ? sizes.join(",") : String(sizes);
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}
function firstImage(x: Product["photo_url"]): string {
  return Array.isArray(x) ? x[0] ?? "" : (x ?? "");
}

// ===== Componente principal =====
export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();

  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filtros do usuário na página
  const [selectedGenders, setSelectedGenders] = useState<Set<"male" | "female">>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // 1) Tentar buscar a loja por slug na tabela stores
        const { data: storeRow, error: storeErr } = await supabase
          .from("stores")
          .select(
            "id, slug, store_name, bio, address, hero_image_url, hero_title, hero_subtitle, layout"
          )
          .eq("slug", slug)
          .maybeSingle<Store>();
        if (storeErr) throw storeErr;

        if (storeRow) {
          // 2a) Produtos por store_name
          const { data: prodRows, error: prodErr } = await supabase
            .from("products")
            .select(
              "id, name, store_name, photo_url, eta_text, price_tag, category, gender, sizes, featured"
            )
            .eq("is_active", true)
            .eq("store_name", storeRow.store_name)
            .limit(1000);
          if (prodErr) throw prodErr;

          if (!cancelled) {
            setStore(storeRow);
            setProducts((prodRows ?? []) as Product[]);
          }
        } else {
          // 2b) Fallback: derivar loja a partir dos produtos (compat com estado atual)
          const { data: prodAll, error: prodErr } = await supabase
            .from("products")
            .select(
              "id, name, store_name, photo_url, eta_text, price_tag, category, gender, sizes, featured"
            )
            .eq("is_active", true)
            .limit(1000);
          if (prodErr) throw prodErr;
          const list = (prodAll ?? []) as Product[];
          const byStore = list.filter((p) => slugify(String(p.store_name || "")) === slug);
          if (!byStore.length) throw new Error("Loja não encontrada");

          const derivedStore: Store = {
            id: -1,
            slug,
            store_name: byStore[0].store_name,
            bio: null,
            address: null,
            hero_image_url: null,
            hero_title: null,
            hero_subtitle: null,
            layout: { blocks: [{ type: "hero" }, { type: "bio" }, { type: "category_menu" }] },
          };
          if (!cancelled) {
            setStore(derivedStore);
            setProducts(byStore);
          }
        }
      } catch (e: any) {
        if (!cancelled) setErr(e.message ?? "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // opções para filtros
  const categoryOptions = useMemo(() => {
    const set = new Set(products.map((p) => (p.category || "").toLowerCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);
  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => toSizeList(p.sizes).forEach((s) => set.add(s)));
    const order = ["PP", "P", "M", "G", "GG"];
    const rest = Array.from(set).filter((s) => !order.includes(s)).sort();
    return [...order.filter((s) => set.has(s)), ...rest];
  }, [products]);

  const anyFilterActive =
    selectedGenders.size > 0 || selectedSizes.size > 0 || selectedCategories.size > 0;

  // aplica filtros globais da UI
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategories.size > 0) {
        const pc = (p.category || "").toLowerCase();
        if (!pc || !selectedCategories.has(pc)) return false;
      }
      if (selectedGenders.size > 0) {
        const g = (p.gender || "").toLowerCase();
        if (!g || !selectedGenders.has(g as "male" | "female")) return false;
      }
      if (selectedSizes.size > 0) {
        const list = toSizeList(p.sizes);
        if (!list.length || !list.some((s) => selectedSizes.has(s))) return false;
      }
      return true;
    });
  }, [products, selectedCategories, selectedGenders, selectedSizes]);

  function toggle<T>(set: Set<T>, val: T) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  }
  function clearAll() {
    setSelectedCategories(new Set());
    setSelectedGenders(new Set());
    setSelectedSizes(new Set());
  }

  // ===== Renderers =====
  function renderHero(block?: Extract<Block, { type: "hero" }>) {
    const image = block?.image || store?.hero_image_url || "";
    const title = block?.title ?? store?.hero_title ?? store?.store_name ?? "";
    const subtitle = block?.subtitle ?? store?.hero_subtitle ?? "";
    const showText = Boolean(block?.show_text) && Boolean(title || subtitle);
    if (!image && !showText) return null;
    return (
      <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        {image ? (
          <img src={image} alt={title || "Hero"} className="w-full h-52 object-cover" />
        ) : null}
        {showText && (
          <div className="p-4">
            {title ? <h2 className="text-xl font-semibold leading-tight">{title}</h2> : null}
            {subtitle ? <p className="text-sm text-gray-600 mt-1">{subtitle}</p> : null}
          </div>
        )}
      </section>
    );
  }

  function renderBio() {
    if (!store) return null;
    const hasBio = Boolean(store.bio);
    const hasAddress = Boolean(store.address);
    if (!hasBio && !hasAddress) return null;
    return (
      <section className="mt-4 rounded-2xl border border-gray-200 p-4">
        {hasBio ? <p className="text-sm text-gray-800">{store.bio}</p> : null}
        {hasAddress ? (
          <p className="text-sm text-gray-600 mt-2">
            <span className="font-medium">Endereço</span> {store.address}
          </p>
        ) : null}
      </section>
    );
  }

  function renderCategoryMenu(block?: Extract<Block, { type: "category_menu" }>) {
    const items =
      block?.source === "custom" && block.items?.length ? block.items : categoryOptions;
    if (!items.length) return null;
    return (
      <section className="mt-3">
        <div className="rounded-2xl border border-gray-200 p-3.5">
          <div className="text-xs text-gray-500 mb-2">Categorias</div>
          <div className="flex flex-wrap gap-2">
            {items.map((c) => {
              const key = c.toLowerCase();
              const active = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategories((s) => toggle(s, key))}
                  className={`h-9 px-3 rounded-full border text-sm capitalize ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  function selectForGrid(filter: Record<string, any> | undefined, max: number): Product[] {
    let list = filtered;
    if (filter?.featured != null) {
      list = list.filter((p) => Boolean(p.featured) === Boolean(filter.featured));
    }
    if (filter?.category) {
      const cat = String(filter.category).toLowerCase();
      list = list.filter((p) => (p.category || "").toLowerCase() === cat);
    }
    return list.slice(0, max);
  }

  function renderGrid(block: Extract<Block, { type: "grid" }>) {
    const rows = Math.max(1, block.rows);
    const cols = Math.max(1, block.cols);
    const limit = rows * cols;
    const items = selectForGrid(block.filter, limit);
    if (!items.length) return null;
    return renderGridFixed(items);
  }

  function renderGridFixed(items: Product[]) {
    if (!items.length) return null;
    return (
      <section className="mt-4">
        <div className="grid grid-cols-2 gap-4">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="rounded-2xl bg-white shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100"
            >
              <div className="relative">
                <span
                  className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow border"
                  style={{ backgroundColor: "#8B5E3C", borderColor: "#6F4A2D" }}
                >
                  {formatBRL(p.price_tag)}
                </span>
                <img src={firstImage(p.photo_url)} alt={p.name} className="w-full h-44 object-cover" />
              </div>
              <div className="p-3">
                {p.category ? (
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
                    {p.category}
                  </p>
                ) : null}
                <p className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</p>
                <p className="text-xs text-gray-500">{p.eta_text ?? "até 1h"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  function renderBanner(b: Extract<Block, { type: "banner" }>) {
    return (
      <section className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
        <Link href={b.href || "#"} className="block">
          <div className="relative">
            <div className="w-full aspect-[3/4] overflow-hidden">{/* retrato: altura > largura */}
              <img src={b.image} alt={b.title || "Banner"} className="w-full h-full object-cover" />
            </div>
            {(b.title || b.subtitle) && (
              <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/40 to-transparent">
                {b.title ? (
                  <h3 className="text-white text-lg font-semibold leading-tight">{b.title}</h3>
                ) : null}
                {b.subtitle ? (
                  <p className="text-white/90 text-sm mt-0.5">{b.subtitle}</p>
                ) : null}
              </div>
            )}
          </div>
        </Link>
      </section>
    );
  }

  function renderBlocks(blocks: Block[]) {
    return blocks.map((b, i) => {
      if (b.type === "hero") return <div key={i}>{renderHero(b)}</div>;
      if (b.type === "bio") return <div key={i}>{renderBio()}</div>;
      if (b.type === "category_menu") return <div key={i}>{renderCategoryMenu(b)}</div>;
      if (b.type === "grid") return <div key={i}>{renderGrid(b)}</div>;
      if (b.type === "banner") return <div key={i}>{renderBanner(b)}</div>;
      return null;
    });
  }

  function renderAutoSequence() {
    const list = filtered;
    if (!list.length) return null;

    // pega os banners do layout (na ordem em que vierem)
    const banners = (store?.layout?.blocks || []).filter((b) => b.type === "banner") as Extract<
      Block,
      { type: "banner" }
    >[];

    const first4 = list.slice(0, 4);
    const next2 = list.slice(4, 6);
    const rest = list.slice(6);

    return (
      <>
        {renderGridFixed(first4)}
        {banners[0] ? renderBanner(banners[0]) : null}
        {renderGridFixed(next2)}
        {banners[1] ? renderBanner(banners[1]) : null}
        {renderGridFixed(rest)}
      </>
    );
  }

  // ===== UI =====
  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-28">
      {/* header */}
      <div className="pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] leading-6 font-bold tracking-tight">{store?.store_name || "Loja"}</h1>
          <p className="text-[12px] text-gray-600">{products.length} {products.length === 1 ? "peça" : "peças"}</p>
        </div>
        <Link
          href="/stores"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm hover:bg-gray-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none">
            <path d="M15 18l-6-6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Lojas
        </Link>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">Erro {err}</p>}
      {loading && <p className="mt-4 text-sm text-gray-600">Carregando…</p>}

      {/* filtros globais ativos (chips) */}
      {!loading && products.length > 0 && (
        <div className="mt-4 space-y-3">
          {(anyFilterActive) && (
            <div className="flex flex-wrap gap-2">
              {[...selectedCategories].map((c) => (
                <span key={`c-${c}`} className="px-3 h-9 rounded-full border text-sm capitalize bg-black text-white border-black">{c}</span>
              ))}
              {[...selectedGenders].map((g) => (
                <span key={`g-${g}`} className="px-3 h-9 rounded-full border text-sm bg-black text-white border-black">{g === "female" ? "Feminino" : "Masculino"}</span>
              ))}
              {[...selectedSizes].map((s) => (
                <span key={`s-${s}`} className="px-3 h-9 rounded-full border text-sm bg-black text-white border-black">{s}</span>
              ))}
              <button onClick={clearAll} className="px-3 h-9 rounded-full border text-sm bg-white text-gray-800 border-gray-200 hover:bg-gray-50">Limpar tudo</button>
            </div>
          )}
        </div>
      )}

      {/* estrutura fixa (hero, bio, menu) + sequência 2x2 -> banner -> 2 -> banner -> resto */}
      {!loading && (
        <div className="mt-4">
          {renderBlocks((store?.layout?.blocks?.length ? store!.layout!.blocks : [])
            .filter((b) => b.type === "hero" || b.type === "bio" || b.type === "category_menu"))}

          {renderAutoSequence()}
        </div>
      )}
    </main>
  );
}
