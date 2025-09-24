"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string;
  eta_text: string | null;
  price_tag: number;
  category?: string | null;
  gender?: "male" | "female" | "unisex" | null;
  sizes?: string[] | string | null;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const storeNameFromQuery = search.get("n") || "";

  const [storeName, setStoreName] = useState<string>(storeNameFromQuery);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  // filtros
  const [selectedGenders, setSelectedGenders] = useState<Set<"male" | "female">>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        // Busca todos os produtos ativos e depois filtra por slug de store_name no client.
        // (Fazemos assim para não depender de acentos/variações no PostgREST)
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,name,store_name,photo_url,eta_text,price_tag,category,gender,sizes"
          )
          .eq("is_active", true)
          .limit(500);
        if (error) throw error;

        const list = (data ?? []) as Product[];
        const filteredByStore = list.filter((p) => slugify(String(p.store_name || "")) === slug);

        // se não veio nome por query, derive do primeiro produto
        if (!storeNameFromQuery && filteredByStore[0]?.store_name) {
          setStoreName(filteredByStore[0].store_name);
        }

        setProducts(filteredByStore);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar a loja");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, storeNameFromQuery]);

  // derivar listas únicas para filtros
  const categoryOptions = useMemo(() => {
    const set = new Set(
      products
        .map((p) => (p.category || "").toLowerCase())
        .filter(Boolean)
    );
    return Array.from(set).sort();
  }, [products]);

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => toSizeList(p.sizes).forEach((s) => set.add(s)));
    // limitar aos clássicos primeiro
    const order = ["PP", "P", "M", "G", "GG"];
    const rest = Array.from(set).filter((s) => !order.includes(s)).sort();
    return [...order.filter((s) => set.has(s)), ...rest];
  }, [products]);

  const anyFilterActive =
    selectedGenders.size > 0 || selectedSizes.size > 0 || selectedCategories.size > 0;

  // aplicar filtros
  const shown = useMemo(() => {
    return products.filter((p) => {
      // categorias
      if (selectedCategories.size > 0) {
        const pc = (p.category || "").toLowerCase();
        if (!pc || !selectedCategories.has(pc)) return false;
      }
      // gênero
      if (selectedGenders.size > 0) {
        const g = (p.gender || "").toLowerCase();
        if (!g || !selectedGenders.has(g as "male" | "female")) return false;
      }
      // tamanho
      if (selectedSizes.size > 0) {
        const list = toSizeList(p.sizes);
        if (!list.length || !list.some((s) => selectedSizes.has(s))) return false;
      }
      return true;
    });
  }, [products, selectedCategories, selectedGenders, selectedSizes]);

  // helpers UI
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

  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-28">
      {/* header */}
      <div className="pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] leading-6 font-bold tracking-tight">{storeName || "Loja"}</h1>
          <p className="text-[12px] text-gray-600">
            {products.length} {products.length === 1 ? "peça" : "peças"}
          </p>
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

      {err && <p className="mt-4 text-sm text-red-600">Erro: {err}</p>}
      {loading && <p className="mt-4 text-sm text-gray-600">Carregando…</p>}

      {/* filtros */}
      {!loading && products.length > 0 && (
        <div className="mt-4 space-y-3">
          {anyFilterActive && (
            <div className="flex flex-wrap gap-2">
              {[...selectedCategories].map((c) => (
                <span key={`c-${c}`} className="px-3 h-9 rounded-full border text-sm capitalize bg-black text-white border-black">
                  {c}
                </span>
              ))}
              {[...selectedGenders].map((g) => (
                <span key={`g-${g}`} className="px-3 h-9 rounded-full border text-sm bg-black text-white border-black">
                  {g === "female" ? "Feminino" : "Masculino"}
                </span>
              ))}
              {[...selectedSizes].map((s) => (
                <span key={`s-${s}`} className="px-3 h-9 rounded-full border text-sm bg-black text-white border-black">
                  {s}
                </span>
              ))}
              <button
                onClick={clearAll}
                className="px-3 h-9 rounded-full border text-sm bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
              >
                Limpar tudo
              </button>
            </div>
          )}

          {/* linhas de seleção */}
          <div className="rounded-2xl border border-gray-200 p-3.5">
            {/* categorias */}
            {categoryOptions.length > 0 && (
              <>
                <div className="text-xs text-gray-500 mb-2">Categorias</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categoryOptions.map((c) => {
                    const active = selectedCategories.has(c);
                    return (
                      <button
                        key={c}
                        onClick={() => setSelectedCategories((s) => toggle(s, c))}
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
              </>
            )}

            {/* gênero */}
            <div className="text-xs text-gray-500 mb-2">Gênero</div>
            <div className="flex gap-2 mb-3">
              {[
                { id: "female", label: "Feminino" },
                { id: "male", label: "Masculino" },
              ].map((g) => {
                const active = selectedGenders.has(g.id as "female" | "male");
                return (
                  <button
                    key={g.id}
                    onClick={() =>
                      setSelectedGenders((s) => toggle(s, g.id as "female" | "male"))
                    }
                    className={`h-9 px-3 rounded-full border text-sm ${
                      active
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            {/* tamanhos */}
            <div className="text-xs text-gray-500 mb-2">Tamanho</div>
            <div className="flex flex-wrap gap-2">
              {sizeOptions.map((s) => {
                const active = selectedSizes.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => setSelectedSizes((set) => toggle(set, s))}
                    className={`h-9 px-3 rounded-full border text-sm ${
                      active
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* grid */}
      {!loading && (
        <>
          {shown.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">
              Nenhuma peça com os filtros atuais.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {shown.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="rounded-2xl bg-white shadow-md overflow-hidden hover:shadow-lg transition border border-gray-100"
                >
                  <div className="relative">
                    <span className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium shadow border border-gray-200">
                      {formatBRL(p.price_tag)}
                    </span>
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-44 object-cover"
                    />
                  </div>
                  <div className="p-3">
                    {p.category ? (
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
                        {p.category}
                      </p>
                    ) : null}
                    <p className="text-sm font-semibold leading-tight line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500">{p.eta_text ?? "até 1h"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}