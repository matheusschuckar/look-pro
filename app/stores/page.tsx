"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type StoreCard = {
  name: string;
  slug: string;
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

export default function StoresPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("store_name")
          .eq("is_active", true);
        if (error) throw error;

        const uniq = Array.from(
          new Set(
            (data ?? []).map((r: any) => String(r.store_name || "").trim())
          )
        ).filter(Boolean);

        const list = uniq
          .sort((a, b) => a.localeCompare(b))
          .map((name) => ({ name, slug: slugify(name) }));

        setStores(list);
      } catch (e: any) {
        setErr(e.message ?? "Não foi possível carregar as lojas");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh] px-5 pb-28">
      {/* Header */}
      <div className="pt-6 flex items-center justify-between">
        <h1 className="text-[28px] leading-7 font-bold tracking-tight">
          Lojas
        </h1>
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition
                     bg-transparent text-[#141414] border-[#141414] hover:bg-[#141414]/10"
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

      {/* Estados */}
      {err && <p className="mt-4 text-sm text-red-600">Erro: {err}</p>}
      {loading && <p className="mt-4 text-sm text-gray-600">Carregando…</p>}
      {!loading && stores.length === 0 && (
        <p className="mt-8 text-sm text-gray-600">Nenhuma loja encontrada.</p>
      )}

      {/* Grid de lojas */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        {stores.map((s) => (
          <Link
            key={s.slug}
            href={`/stores/${s.slug}?n=${encodeURIComponent(s.name)}`}
            title={s.name}
            className="group rounded-2xl border h-28 transition
                       bg-[#141414] border-[#141414]
                       hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center px-3"
          >
            <div className="text-center text-white">
              <div className="text-[15px] font-semibold line-clamp-2">
                {s.name}
              </div>
              <div
                className="mt-2 inline-flex items-center gap-1 px-3 h-7 rounded-full border text-[11px] font-medium transition"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "white",
                  color: "white",
                }}
              >
                Ver peças
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  style={{ stroke: "white" }}
                >
                  <path
                    d="M9 18l6-6-6-6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
