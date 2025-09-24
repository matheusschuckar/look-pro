// app/test/page.tsx
"use client";
import { supabase } from "@/lib/supabaseClient";

export default function TestPage() {
  console.log("Supabase client OK?", !!supabase);
  return <main className="p-4">Teste OK</main>;
}
