"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Product = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string;
  eta_text: string | null;
  price_tag: number;
};

type LikeRow = { product_id: number; created_at: string };
type LikeCountMap = Record<number, number>;

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export default function SavedPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [likeRows, setLikeRows] = useState<LikeRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [likeCounts, setLikeCounts] = useState<LikeCountMap>({});
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set()); // unlikes em voo

  // user (sem redirecionar visitante)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      setLoading(false); // importante: libera a renderização mesmo sem login
    })();
  }, []);

  // fetch likes + products (apenas logado)
  useEffect(() => {
    (async () => {
      if (!userId) return;
      setLoading(true);
      setErr(null);
      try {
        // 1) pegar ids salvos
        const { data: likes, error: lErr } = await supabase
          .from("product_likes")
          .select("product_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (lErr) throw lErr;
        const rows: LikeRow[] = likes ?? [];
        setLikeRows(rows);

        const ids = rows.map((r) => r.product_id);
        if (ids.length === 0) {
          setProducts([]);
          setLikeCounts({});
          setLoading(false);
          return;
        }

        // 2) buscar produtos via IN
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("id,name,store_name,photo_url,eta_text,price_tag")
          .in("id", ids);
        if (pErr) throw pErr;

        // manter a ordem dos likes (mais recentes primeiro)
        const orderMap = new Map(ids.map((id, i) => [id, i]));
        const ordered = (prods ?? []).sort(
          (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
        );
        setProducts(ordered as Product[]);

        // 3) contagens
        const counts = await countPerProducts(ids);
        setLikeCounts(counts);
      } catch (e: any) {
        setErr(e?.message ?? "Não foi possível carregar seus salvos");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  async function countPerProducts(ids: number[]): Promise<LikeCountMap> {
    const map: LikeCountMap = {};
    await Promise.all(
      ids.map(async (pid) => {
        const { count } = await supabase
          .from("product_likes")
          .select("*", { count: "exact", head: true })
          .eq("product_id", pid);
        map[pid] = count ?? 0;
      })
    );
    return map;
  }

  // unlike otimista
  async function handleUnlike(pid: number) {
    if (!userId) {
      router.push(`/auth?next=${encodeURIComponent("/saved")}`);
      return;
    }
    if (busyIds.has(pid)) return;

    const busyNext = new Set(busyIds);
    busyNext.add(pid);
    setBusyIds(busyNext);

    const prevProds = products;
    const prevRows = likeRows;
    const prevCount = likeCounts[pid] ?? 0;

    // otimista
    setProducts((arr) => arr.filter((p) => p.id !== pid));
    setLikeRows((arr) => arr.filter((r) => r.product_id !== pid));
    setLikeCounts((m) => ({ ...m, [pid]: Math.max(0, (m[pid] ?? 0) - 1) }));

    try {
      const { error } = await supabase
        .from("product_likes")
        .delete()
        .eq("product_id", pid)
        .eq("user_id", userId);
      if (error) throw error;
    } catch (e) {
      // rollback
      setProducts(prevProds);
      setLikeRows(prevRows);
      setLikeCounts((m) => ({ ...m, [pid]: prevCount }));
    } finally {
      const s = new Set(busyIds);
      s.delete(pid);
      setBusyIds(s);
    }
  }

  const empty = userId && !loading && products.length === 0;

  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-28">
      {/* header */}
      <div className="pt-6 flex items-center justify-between">
        <h1 className="text-[28px] leading-7 font-bold tracking-tight">
          Saved
        </h1>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-sm hover:bg-gray-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Voltar
        </Link>
      </div>

      {err && <p className="mt-4 text-sm text-red-600">Erro: {err}</p>}
      {loading && <p className="mt-4 text-sm text-gray-600">Carregando…</p>}

      {/* Visitante (sem login): mensagem para logar */}
      {!loading && !userId && (
        <div className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-center">
          <p className="text-sm text-neutral-800">
            Faça <span className="font-semibold">login</span> para ver os
            produtos salvos.
          </p>
          <Link
            href={`/auth?next=${encodeURIComponent("/saved")}`}
            className="mt-3 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
          >
            Fazer login
          </Link>
        </div>
      )}

      {/* Logado mas sem itens */}
      {empty && (
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-600">Você ainda não salvou nada.</p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-semibold text-white"
          >
            Descobrir peças
          </Link>
        </div>
      )}

      {/* Logado com itens */}
      {userId && !loading && products.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-4">
          {products.map((p) => {
            const pid = p.id;
            const count = likeCounts[pid] ?? 0;
            const busy = busyIds.has(pid);
            const price = formatBRL(p.price_tag);

            return (
              <div
                key={pid}
                className="rounded-2xl bg-white shadow-md overflow-hidden border border-gray-100"
              >
                <div className="relative">
                  <Link href={`/product/${pid}`} className="block">
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-full h-44 object-cover"
                    />
                  </Link>

                  {/* badge preço */}
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[11px] font-medium shadow border border-gray-200">
                    {price}
                  </span>

                  {/* like + count */}
                  <div className="absolute left-2 top-2 flex items-center gap-1.5">
                    <button
                      onClick={() => handleUnlike(pid)}
                      disabled={busy}
                      aria-label="Remover dos salvos"
                      className={`h-7 w-7 rounded-full bg-white/90 backdrop-blur border border-gray-200 flex items-center justify-center active:scale-95 ${
                        busy ? "opacity-60 cursor-wait" : ""
                      }`}
                      title="Remover dos salvos"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="#e11d48"
                        stroke="none"
                      >
                        <path d="M12 21s-7.5-4.35-9.5-8.4C1.3 9.6 2.7 6 6.4 6c2 0 3.1 1 3.6 1.7.5-.7 1.6-1.7 3.6-1.7 3.7 0 5.1 3.6 3.9 6.6C19.5 16.65 12 21 12 21z" />
                      </svg>
                    </button>
                    <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[11px] font-medium border border-gray-200">
                      {count}
                    </span>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">
                    {p.store_name}
                  </p>
                  <Link href={`/product/${pid}`}>
                    <p className="text-sm font-semibold leading-tight line-clamp-2">
                      {p.name}
                    </p>
                  </Link>
                  <p className="text-xs text-gray-500">
                    {p.eta_text ?? "até 1h"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
