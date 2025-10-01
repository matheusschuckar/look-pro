// lib/data/catalog.ts
import { supabase } from "@/lib/supabaseClient";
import type { Product } from "./types";

export async function fetchCatalog(): Promise<Product[]> {
  // 1) tenta a VIEW com ETA dinâmico por loja
  let r = await supabase
    .from("products_with_eta")
    .select(
      "id,name,store_name,photo_url,eta_text_runtime,price_tag,sizes,store_id,store_slug"
    )
    .limit(60);

  if (!r.error) return (r.data || []) as Product[];

  // 2) fallback: tabela antiga (mantém tudo funcionando)
  const r2 = await supabase
    .from("products")
    .select(
      "id,name,store_name,photo_url,eta_text,price_tag,category,gender,sizes,view_count,categories"
    )
    .eq("is_active", true)
    .limit(60);

  if (r2.error) throw r2.error;
  return (r2.data || []) as Product[];
}
