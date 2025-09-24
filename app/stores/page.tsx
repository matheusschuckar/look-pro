"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

export default function StoresPage() {
  const [stores, setStores] = useState<StoreCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // pega todos os store_name distintos dos produtos ativos
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
      <div className="pt-6 flex items-center justify-between">
        <h1 className="text-[28px] leading-7 font-bold tracking-tight">
          Stores
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

      {!loading && stores.length === 0 && (
        <p className="mt-8 text-sm text-gray-600">Nenhuma loja encontrada.</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        {stores.map((s) => (
          <Link
            key={s.slug}
            href={`/stores/${s.slug}?n=${encodeURIComponent(s.name)}`}
            className="group rounded-2xl border border-gray-200 bg-white h-28 shadow-sm hover:shadow transition overflow-hidden flex items-center justify-center"
            title={s.name}
          >
            {/* “logo” placeholder com iniciais */}
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center">
                <div className="text-2xl font-bold tracking-wide">
                  {initials(s.name)}
                </div>
                <div className="mt-1 text-[11px] text-gray-600 line-clamp-1 px-3">
                  {s.name}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
