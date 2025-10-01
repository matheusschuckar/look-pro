"use client";

import Link from "next/link";
// import Image from "next/image"; // descomentaria se for usar <Image />
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import ProductCard from "../components/ProductCard";
import FiltersModal from "../components/FiltersModal";
import ChipsRow from "../components/ChipsRow";
import BannersCarousel from "../components/BannersCarousel";
import {
  EditorialTallBanner,
  SelectionHeroBanner,
  BannersTriplet,
} from "../components/HomeBanners";
import HeaderBar from "../components/HeaderBar";
import AppDrawer from "../components/AppDrawer";
import type { Product, Profile } from "@/lib/data/types";
import { fetchCatalog } from "@/lib/data/catalog";
import type { KeyStat } from "@/lib/prefs"; // para o tipo do norm()


import {
  getPrefs,          // compat (usado por partes do código)
  getPrefsV2,        // novo
  bumpCategory,
  bumpStore,
  bumpGender,
  bumpSize,
  bumpPriceBucket,
  bumpEtaBucket,
  bumpProduct,
  decayAll,
} from "@/lib/prefs";
import { getViewsMap } from "@/lib/metrics";
import {
  hasAddressBasics,
  hasContact,
  inCoverage,
  intersects,
  categoriesOf,
  priceBucket,
  etaBucket,
} from "@/lib/ui/helpers";

import { HOME_CAROUSEL, INLINE_BANNERS } from "@/lib/ui/homeContent";



// ruído determinístico por produto + seed da sessão
function noiseFor(id: number, seed: number) {
  let x = (id ^ seed) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5; // xorshift32
  return (x >>> 0) / 4294967295; // 0..1
}

export default function Home() {
  const router = useRouter();
  const [rankSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [views, setViews] = useState<Record<string, number>>({}); // mapa de views locais

  // carrega views do localStorage e observa mudanças entre abas
  useEffect(() => {
    setViews(getViewsMap());
    function onStorage(e: StorageEvent) {
      if (e.key === "look.metrics.v1.views" && e.newValue) {
        try {
          setViews(JSON.parse(e.newValue));
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const [query, setQuery] = useState("");

  // Drawer lateral
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bloqueia scroll quando drawer ou modal estiverem abertos
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => {
    const anyOverlay = drawerOpen || filterOpen;
    const prev = document.documentElement.style.overflow;
    if (anyOverlay) document.documentElement.style.overflow = "hidden";
    else document.documentElement.style.overflow = prev || "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [drawerOpen, filterOpen]);

  // Banners (config movida para lib/ui/homeContent)
const banners = HOME_CAROUSEL;


  // ===========================
  // Auth + Data unified (catálogo para todos, sem redirecionar guest)
  // ===========================
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();

        if (!u.user) {
          // Visitante: catálogo público (usa VIEW com ETA dinâmico + fallback)
const data = await fetchCatalog();
setProducts(data);
setProfile(null);

        } else {
          // Logado: perfil + mesmo catálogo
          let profResp = await supabase
            .from("user_profiles")
            .select(
              "id,name,whatsapp,street,number,complement,city,state,cep,status"
            )
            .eq("id", u.user.id)
            .single();

          if (profResp.error && /state/i.test(String(profResp.error.message))) {
            profResp = await supabase
              .from("user_profiles")
              .select(
                "id,name,whatsapp,street,number,complement,city,cep,status"
              )
              .eq("id", u.user.id)
              .single();
            if (profResp.data) (profResp.data as any).state = null;
          }
          if (profResp.error) throw profResp.error;

          const prof = profResp.data as Profile;
          setProfile(prof);

          const data = await fetchCatalog();
          setProducts(data);

        }
      } catch (e: any) {
        const msg = String(e?.message || "");
        console.error("[Home] load error:", msg);
        setErr(msg || "Erro inesperado");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtros
  // Deriva categorias dinamicamente dos produtos (category + categories[])
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) categoriesOf(p).forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [products]);

  const allCategories = dynamicCategories; // compat com o restante do código

  const [chipCategory, setChipCategory] = useState<string>("Tudo");

  const [activeTab, setActiveTab] = useState<
    "genero" | "tamanho" | "categorias"
  >("genero");

  const [selectedGenders, setSelectedGenders] = useState<
    Set<"male" | "female">
  >(new Set());
  const [selectedSizes, setSelectedSizes] = useState<
    Set<"PP" | "P" | "M" | "G" | "GG">
  >(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );

  const clearFilters = () => {
    setSelectedGenders(new Set());
    setSelectedSizes(new Set());
    setSelectedCategories(new Set());
    setChipCategory("Tudo");
  };

  const anyActiveFilter =
    selectedGenders.size > 0 ||
    selectedSizes.size > 0 ||
    selectedCategories.size > 0 ||
    chipCategory !== "Tudo";

  // --- filtered ---
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return products.filter((p) => {
      // texto
      if (q) {
        const cats = categoriesOf(p);
        const matchText =
          p.name.toLowerCase().includes(q) ||
          p.store_name.toLowerCase().includes(q) ||
          cats.some((c) => c.includes(q));

        if (!matchText) return false;
      }

      // categorias (modal > chip)
      const cats = categoriesOf(p);

      if (selectedCategories.size > 0) {
        // ao menos uma das selecionadas precisa estar nas categorias do produto
        const hit = cats.some((c) => selectedCategories.has(c));
        if (!hit) return false;
      } else if (chipCategory !== "Tudo") {
        if (!cats.includes(chipCategory.toLowerCase())) return false;
      }

      // gênero
      if (selectedGenders.size > 0) {
        const pg = (p.gender || "").toLowerCase();
        if (!pg || !selectedGenders.has(pg as "male" | "female")) return false;
      }

      // tamanho
      if (selectedSizes.size > 0) {
        const raw = Array.isArray(p.sizes)
          ? (p.sizes as string[]).join(",")
          : p.sizes ?? "";
        const list = String(raw)
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean) as Array<"PP" | "P" | "M" | "G" | "GG">;

        if (!list.length || !intersects(selectedSizes, list)) return false;
      }

      return true;
    });
  }, [
    products,
    query,
    chipCategory,
    selectedCategories,
    selectedGenders,
    selectedSizes,
  ]);

  // ===== Novo ranking multi-sinal com exploração =====
const EPSILON = 0.08;            // chance de explorar (mostrar trending/aleatório)
const JITTER = 0.08;             // ruído pequeno e determinístico
const HF_DAYS = 14;              // meia-vida usada no decay local
  // roda o decay só no cliente (evita tocar localStorage no SSR)
  useEffect(() => {
    try {
      decayAll(HF_DAYS);
    } catch {}
  }, []);

// pesos por feature (ajuste fino conforme perceber o comportamento)
const W = {
  CAT: 1.00,
  STORE: 0.65,
  GENDER: 0.45,
  SIZE: 0.35,   // útil quando usuário costuma escolher tamanhos
  PRICE: 0.30,
  ETA: 0.25,
  PRODUCT: 0.20, // memoriza afinidade pontual
  TREND: 0.15,   // “popularidade” local (views) ou view_count
};

const filteredRanked = useMemo<Product[]>(() => {
  // aplica um decay leve a cada montagem/uso (barato e mantém prefs frescas)

  // lê V2 + fallback V1 (compat)
  const p2 = getPrefsV2();
  const p1 = getPrefs();

  // normalizadores por feature
  function norm(map: Record<string, KeyStat> | Record<string, number>) {
    const vals = Object.values(map).map((v: any) => typeof v === "number" ? v : (v?.w ?? 0));
    const max = vals.length ? Math.max(1, ...vals) : 1;
    return { map, max };
  }

  const nCat = norm(p2.cat);     // decaído
  const nStore = norm(p2.store);
  const nGender = norm(p2.gender);
  const nSize = norm(p2.size);
  const nPrice = norm(p2.price);
  const nEta = norm(p2.eta);
  const nProd = norm(p2.product);

  // fallback de popularidade: usa views locais e/ou view_count do produto
  const localViews = views || {}; // já vem do seu state
  const trendingMax = Object.values(localViews).length
    ? Math.max(1, ...Object.values(localViews))
    : 1;

  // exploração?
  const explore = Math.random() < EPSILON;

  const scored = filtered.map((p) => {
    const cats = categoriesOf(p);
    const mainCat = cats[0] || (p as any).category || "";
    const storeKey = (p.store_name || "").toLowerCase();
    const genderKey = (p.gender || "").toLowerCase();
    const priceKey = priceBucket(p.price_tag);
    const etaTxt = (p as any).eta_text_runtime ?? (p as any).eta_text ?? null;
    const etaKey = etaBucket(etaTxt);
    const prodKey = String(p.id);

    // pega o valor decaído da V2 (se existirem) OU V1 como fallback adicional
    const fromMap = (nm: ReturnType<typeof norm>, key: string, alsoV1?: Record<string, number>) => {
      const k = (key || "").toLowerCase();
      const v2 = (nm.map as any)[k];
      const raw = typeof v2 === "number" ? v2 : v2?.w ?? 0;
      const legacy = alsoV1 ? (alsoV1[k] || 0) : 0;
      const v = Math.max(raw, legacy);
      return v / Math.max(1, nm.max);
    };

    const fCat = fromMap(nCat, mainCat, p1.cat);
    const fStore = fromMap(nStore, storeKey, p1.store);
    const fGender = fromMap(nGender, genderKey);
    const fSize = 0; // (na Home não há seleção de tamanho; deixamos 0 aqui)
    const fPrice = fromMap(nPrice, priceKey);
    const fEta = fromMap(nEta, etaKey);
    const fProd = fromMap(nProd, prodKey);

    // popularidade/trending
    const local = (localViews[String(p.id)] || 0) / trendingMax;
    const remote = typeof p.view_count === "number" ? p.view_count : 0;
    const trend = Math.max(local, remote > 0 ? Math.min(remote / 50, 1) : 0); // normaliza grosseiro

    // ruído determinístico por produto
    const noise = noiseFor(p.id, rankSeed) * JITTER;

    // score de exploração? se sim, reduzimos impacto das prefs e aumentamos trend
    const weightTrend = explore ? W.TREND * 2.2 : W.TREND;

    const score =
      W.CAT * fCat +
      W.STORE * fStore +
      W.GENDER * fGender +
      W.SIZE * fSize +
      W.PRICE * fPrice +
      W.ETA * fEta +
      W.PRODUCT * fProd +
      weightTrend * trend +
      noise;

    return { p, score };
  });

  // ordena por score
  scored.sort((a, b) => b.score - a.score);

  // pequena injeção de exploração: move alguns itens do meio pro topo aleatoriamente
  if (explore && scored.length > 8) {
    const injected = [...scored];
    for (let k = 0; k < Math.min(6, Math.floor(scored.length / 8)); k++) {
      const idx = 4 + Math.floor(Math.random() * Math.min(24, injected.length - 5));
      const [item] = injected.splice(idx, 1);
      injected.splice(2 * k + 1, 0, item);
    }
    return injected.map((x) => x.p);
  }

  return scored.map((x) => x.p);
}, [filtered, views, rankSeed]);


  const locationLabel = profile?.city
    ? `${profile.city}${profile?.state ? `, ${profile.state}` : ""}`
    : "São Paulo, SP";

  async function handleLogout() {
    try {
      // fecha o drawer imediatamente
      setDrawerOpen(false);
      await supabase.auth.signOut();

      // zera o profile para o header trocar para “Login” imediatamente
      setProfile(null);
    } finally {
      router.replace("/");
    }
  }
    // agenda uma tarefa fora do ciclo de render (evita re-render na batida do clique)
    const idle = (cb: () => void) => {
      const ric: any =
        (typeof window !== "undefined" && (window as any).requestIdleCallback) ||
        null;
      if (ric) ric(cb, { timeout: 500 });
      else setTimeout(cb, 0);
    };
  
    // registra interação sem setState (grava prefs + views direto no storage)
    function recordInteraction(p: Product) {
      try {
        const cats = categoriesOf(p);
        const mainCat = cats[0] || "";
        if (mainCat) bumpCategory(mainCat, 1.2);
        bumpStore(p.store_name || "", 1);
        if (p.gender) bumpGender(p.gender, 0.8);
        bumpPriceBucket(priceBucket(p.price_tag), 0.6);
        const etaTxt = (p as any).eta_text_runtime ?? (p as any).eta_text ?? null;
        bumpEtaBucket(etaBucket(etaTxt), 0.5);
        bumpProduct(p.id, 0.25);
  
        // views locais: atualiza direto no localStorage (sem setViews → sem flicker)
        const KEY = "look.metrics.v1.views";
        const raw = localStorage.getItem(KEY);
        const map = raw ? JSON.parse(raw) : {};
        const k = String(p.id);
        map[k] = (map[k] || 0) + 1;
        localStorage.setItem(KEY, JSON.stringify(map));
      } catch {}
    }
  

  // card de produto reaproveitando seu JSX atual
  
  // ===== fim dos helpers =====

  // Render
  return (
    <main
      className="canvas text-black max-w-md mx-auto min-h-screen px-5 with-bottom-nav !bg-[var(--background)]"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Header com faixa marrom (refinado) */}
      <HeaderBar
  loading={loading}
  profile={profile}
  onOpenMenu={() => setDrawerOpen(true)}
/>

      {/* Drawer */}
      <AppDrawer
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  onLogout={handleLogout}
/>

      {/* Cards de orientação — apenas para logado */}
      {profile && !hasAddressBasics(profile) && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900">
          <div className="text-sm font-medium">Complete seu endereço</div>
          <p className="mt-1 text-xs text-neutral-700 leading-5">
            Precisamos do CEP, rua e número para mostrar as opções da sua
            região.
          </p>
          <div className="mt-3">
            <Link
              href="/address"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Atualizar endereço
            </Link>
          </div>
        </div>
      )}

      {profile && hasAddressBasics(profile) && !hasContact(profile) && (
        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-neutral-900">
          <div className="text-sm font-medium">Finalize seu cadastro</div>
          <p className="mt-1 text-xs text-neutral-700 leading-5">
            Adicione seu nome e WhatsApp para facilitar o atendimento.
          </p>
          <div className="mt-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800"
            >
              Completar dados
            </Link>
          </div>
        </div>
      )}

      {profile && hasAddressBasics(profile) && !inCoverage(profile) && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <div className="text-sm font-medium">
            Ainda não atendemos sua região
          </div>
          <p className="mt-1 text-xs text-amber-800/90 leading-5">
            Por enquanto entregamos somente na cidade de São Paulo (SP). Se você
            tiver um endereço em São Paulo, pode cadastrá-lo para visualizar os
            produtos.
          </p>
          <div className="mt-3 flex gap-2">
            <Link
              href="/address"
              className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white"
            >
              Trocar endereço
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800"
            >
              Meu cadastro
            </Link>
          </div>
        </div>
      )}

      {/* Search + localização — liberado para todos */}
      {!loading && (
        <div className="mt-4 flex gap-2">
          <div className="flex-1 relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="M20 20l-3.5-3.5" strokeWidth="2" />
              </svg>
            </span>
            <input
              aria-label="Search products"
              type="search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-[22px] border border-warm chip pl-9 pr-3 h-11 text-[14px] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="shrink-0">
            <div className="inline-flex items-center gap-1 rounded-[22px] border border-warm chip px-3 h-11 text-[12px] text-gray-700">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="11" r="3" strokeWidth="2" />
              </svg>
              <span className="whitespace-nowrap max-w-[140px] truncate">
                {locationLabel}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Estados */}
      {loading && <p className="mt-6 text-sm text-gray-600">Carregando…</p>}
      {err && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900">
          <div className="text-sm font-medium">
            Não foi possível carregar seus dados
          </div>
          <p className="mt-1 text-xs text-red-800/90 leading-5">
            {String(err)}
          </p>
        </div>
      )}

      {/* Banner carrossel — liberado para todos */}
      {!loading && <BannersCarousel banners={banners} />}

      {/* Chips / Filtros — liberados para todos */}
      {!loading && (
  <ChipsRow
    anyActiveFilter={anyActiveFilter}
    chipCategory={chipCategory}
    setChipCategory={setChipCategory}
    selectedCategories={selectedCategories}
    selectedGenders={selectedGenders}
    selectedSizes={selectedSizes}
    allCategories={allCategories}
    clearFilters={() => {
      clearFilters();
      setChipCategory("Tudo");
    }}
    openFilter={() => setFilterOpen(true)}
    onBumpCategory={(c, w) => bumpCategory(c, w)}
onToggleGender={(g) =>
  setSelectedGenders((prev) => {
    const wasActive = prev.has(g);
    const next = new Set(prev);
    if (wasActive) {
      next.delete(g);
    } else {
      next.add(g);
      bumpGender(g, 1.0); // reforça preferências quando ativa
    }
    return next;
  })
}
/>

)}

          {/* Modal de filtros */}
          <FiltersModal
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allCategories={allCategories}
            selectedGenders={selectedGenders}
            setSelectedGenders={setSelectedGenders}
            selectedSizes={selectedSizes}
            setSelectedSizes={setSelectedSizes}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            clearAll={() => {
              clearFilters();
              setChipCategory("Tudo");
            }}
            onApply={() => {
              selectedCategories.forEach((c) => bumpCategory(c, 0.5));
              selectedGenders.forEach((g) => bumpGender(g, 0.5));
              selectedSizes.forEach((s) => bumpSize(s, 0.3));
              setFilterOpen(false);
            }}
          />

      {/* Grid de produtos — com banners intercalados */}
      {!loading && (
        <div className="mt-5 grid grid-cols-2 gap-4 pb-6">
          {(() => {
            const items: React.ReactNode[] = [];
            const list = filteredRanked;
            let i = 0;

            // helper para empurrar N produtos
            const pushProducts = (count: number) => {
              for (let k = 0; k < count && i < list.length; k++, i++) {
                items.push(
                  <ProductCard
                    key={`p-${list[i].id}`}
                    p={list[i]}
                    onTap={(p) => idle(() => recordInteraction(p))}
                  />
                );                
              }
            }; 

            // 1) 2 linhas x 2 colunas = 4 produtos
            pushProducts(4);

            // 2) banner retangular com altura maior (editorial), largura total
items.push(
  <EditorialTallBanner
    key="banner-editorialTall"
    banner={INLINE_BANNERS.editorialTall}
  />
);

            // 3) mais 4 produtos
            pushProducts(4);

            // 4) banner Fasano (quadrado, sem corte e com borda igual aos demais)
items.push(
  <SelectionHeroBanner
    key="banner-selectionHero"
    banner={INLINE_BANNERS.selectionHero}
  />
);
            // 5) mais 4 produtos
            pushProducts(4);

            // 6) três banners baixos, landscape, na mesma linha
items.push(
  <BannersTriplet
    key="banner-triplet"
    items={INLINE_BANNERS.landscapeTriplet}
  />
);

            // 7) segue com os produtos restantes
            pushProducts(Number.MAX_SAFE_INTEGER);

            // fallback se nenhum produto
            if (items.length === 0) {
              items.push(
                <p
                  key="empty"
                  className="col-span-2 mt-4 text-sm text-gray-600"
                >
                  Nenhum produto encontrado com os filtros atuais.
                </p>
              );
            }

            return items;
          })()}
        </div>
      )}

      {/* 👇 Spacer para dar um respiro acima da bottom nav */}
      <div className="h-4" />
    </main>
  );
}
