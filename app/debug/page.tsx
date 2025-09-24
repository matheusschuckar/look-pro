"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DebugPage() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  return (
    <main className="min-h-screen grid place-items-center">
      <button
        onClick={handleLogout}
        className="px-4 py-2 rounded-xl bg-black text-white"
      >
        Sign out
      </button>
    </main>
  );
}