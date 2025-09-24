"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { addToBag } from "@/lib/bag";
import { bumpView } from "@/lib/metrics";

type Product = {
  id: number;
  name: string;
  store_name: string;
  photo_url: string[] | string | null;
  eta_text: string | null;
  price_tag: number;
  sizes: string[] | null;
};

type CommentView = {
  id: string;
  content: string;
  created_at: string;
  displayName: string;
};

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}
function formatDisplayName(name?: string | null) {
  if (!name) return "Cliente";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)![0].toUpperCase()}.`;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // --- auth id (para like/comentário) ---
  const [userId, setUserId] = useState<string | null>(null);

  // --- likes ---
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likePulse, setLikePulse] = useState(false);

  // --- comentários ---
  const [comments, setComments] = useState<CommentView[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  // carrossel
  const [idx, setIdx] = useState(0);
  const go = (d: number) => {
    if (images.length === 0) return;
    setIdx((p) => (p + d + images.length) % images.length);
  };
  // swipe
  const startX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.changedTouches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (delta > 40) go(-1);
    if (delta < -40) go(+1);
    startX.current = null;
  }

  // toast helper
  const toastT = useRef<number | null>(null);
  const viewedRef = useRef(false);
  function showToast(msg: string) {
    setToast(msg);
    if (toastT.current) clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(null), 2000);
  }
  useEffect(() => {
    return () => {
      if (toastT.current) clearTimeout(toastT.current);
    };
  }, []);

  // carregar produto + user
  useEffect(() => {
    (async () => {
      try {
        const pid = Number(id);
        if (!pid) throw new Error("Produto inválido");

        const { data: u } = await supabase.auth.getUser();
        setUserId(u?.user?.id ?? null);

        const { data, error } = await supabase
          .from("products")
          .select("id,name,store_name,photo_url,eta_text,price_tag,sizes")
          .eq("id", pid)
          .single();
        if (error) throw error;
        setProduct(data as Product);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar produto");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // 🔥 CONTADOR GLOBAL DE VIEWS: incrementa via RPC ao abrir a página
  useEffect(() => {
    if (!product?.id || viewedRef.current) return;
    viewedRef.current = true;

    // métrica local (se você ainda quiser manter histórico local)
    bumpView(product.id);

    // incrementa no Postgres via RPC (com try/catch tipado)
    (async () => {
      try {
        const { error } = await supabase.rpc("increment_product_view", {
          pid: product.id,
        });
        if (error) throw error;
      } catch (e: unknown) {
        console.warn("increment_product_view failed:", e);
      }
    })();
  }, [product?.id]);

  // likes: contagem + status do usuário
  useEffect(() => {
    (async () => {
      const pid = Number(id);
      if (!pid) return;

      const { count } = await supabase
        .from("product_likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", pid);
      setLikeCount(count ?? 0);

      if (userId) {
        const { data } = await supabase
          .from("product_likes")
          .select("product_id")
          .eq("product_id", pid)
          .eq("user_id", userId)
          .maybeSingle();
        setLiked(!!data);
      } else {
        setLiked(false);
      }
    })();
  }, [id, userId]);

  // comentários: listar
  useEffect(() => {
    if (!product?.id) return;
    (async () => {
      try {
        setCommentsLoading(true);
        const { data, error } = await supabase
          .from("product_comments")
          .select("id,content,created_at,user_id,user_profiles(name)")
          .eq("product_id", product.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        const list: CommentView[] = (data || []).map((row: any) => ({
          id: row.id,
          content: row.content,
          created_at: row.created_at,
          displayName: formatDisplayName(row.user_profiles?.name),
        }));
        setComments(list);
      } catch {
        setComments([]);
      } finally {
        setCommentsLoading(false);
      }
    })();
  }, [product?.id]);

  const sizes: string[] = useMemo(() => {
    const raw = product?.sizes ?? [];
    if (!raw || raw.length === 0) return ["U"];
    return raw.map((s) => String(s).toUpperCase());
  }, [product]);

  function handleAddToBag() {
    if (!product) return;
    if (!size) {
      showToast("Selecione um tamanho");
      return;
    }
    addToBag({
      product_id: product.id,
      name: product.name,
      store_name: product.store_name,
      photo_url: images[0] ?? "",
      size,
      unit_price: product.price_tag,
      qty: 1,
    });
    showToast("Adicionado à sacola");
    setTimeout(() => router.push("/bag"), 550);
  }

  async function toggleLike() {
    if (!product) return;
    if (!userId) {
      router.push("/auth");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    const pid = product.id;

    try {
      if (!liked) {
        // otimista
        setLiked(true);
        setLikeCount((c) => c + 1);
        setLikePulse(true);
        setTimeout(() => setLikePulse(false), 220);

        // insere; se já existir (23505), ignoramos
        const { error } = await supabase
          .from("product_likes")
          .insert({ product_id: pid, user_id: userId });
        if (error && !String(error.code).includes("23505")) {
          setLiked(false);
          setLikeCount((c) => Math.max(0, c - 1));
          throw error;
        }
      } else {
        // otimista
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
        const { error } = await supabase
          .from("product_likes")
          .delete()
          .eq("product_id", pid)
          .eq("user_id", userId);
        if (error) {
          setLiked(true);
          setLikeCount((c) => c + 1);
          throw error;
        }
      }
    } catch (e: any) {
      showToast(e?.message ?? "Erro ao curtir");
    } finally {
      setLikeBusy(false);
    }
  }

  async function handlePostComment() {
    const text = newComment.trim();
    if (!text) return;

    try {
      setPosting(true);
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) {
        router.push("/auth");
        return;
      }

      let displayName = "Cliente";
      const { data: prof } = await supabase
        .from("user_profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      displayName = formatDisplayName(prof?.name);

      const { data: inserted, error } = await supabase
        .from("product_comments")
        .insert({
          product_id: product!.id,
          user_id: user.id,
          content: text,
        })
        .select("id,content,created_at")
        .single();
      if (error) throw error;

      setComments((prev) => [
        {
          id: inserted!.id,
          content: inserted!.content,
          created_at: inserted!.created_at,
          displayName,
        },
        ...prev,
      ]);
      setNewComment("");
    } catch (e: any) {
      showToast(e?.message ?? "Não foi possível enviar o comentário");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-md mx-auto">
        <div className="animate-pulse">
          <div className="h-[70vh] bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-200 w-3/4 rounded" />
            <div className="h-4 bg-gray-200 w-1/3 rounded" />
            <div className="h-20 bg-gray-200 w-full rounded" />
          </div>
        </div>
      </main>
    );
  }
  if (err) return <main className="p-4 text-red-600">{err}</main>;
  if (!product) return <main className="p-4">Produto não encontrado.</main>;

  const price = formatBRL(product.price_tag);

  // normaliza para array
  const images: string[] = Array.isArray(product.photo_url)
    ? product.photo_url
    : product.photo_url
    ? [product.photo_url]
    : [];

  return (
    <main className="bg-white text-black max-w-md mx-auto min-h-[100dvh]">
      {/* Imagem principal (carrossel) */}
      <div className="relative">
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          className="absolute left-3 top-3 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border border-white/60 active:scale-95"
        >
          <svg
            width="18"
            height="18"
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
        </button>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: product.name,
                text: product.store_name,
                url: window.location.href,
              });
            } else {
              showToast("Link copiado");
              try {
                navigator.clipboard.writeText(window.location.href);
              } catch {}
            }
          }}
          aria-label="Compartilhar"
          className="absolute right-3 top-3 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border border-white/60 active:scale-95"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            stroke="currentColor"
            fill="none"
          >
            <path
              d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* slides */}
        <div
          className="relative w-full h-[70vh] overflow-hidden bg-gray-100"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {images.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              sem imagem
            </div>
          ) : (
            images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${product.name} ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${
                  i === idx ? "opacity-100" : "opacity-0"
                }`}
              />
            ))
          )}
        </div>

        {/* controles */}
        {images.length > 1 && (
          <>
            <button
              aria-label="Anterior"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border border-white/60 active:scale-95"
            >
              <svg
                width="18"
                height="18"
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
            </button>
            <button
              aria-label="Próximo"
              onClick={() => go(+1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-9 w-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur border border-white/60 active:scale-95"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
              >
                <path
                  d="M9 18l6-6-6-6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === idx ? "bg-white" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* like + contador (mantido) */}
        <div className="absolute right-3 bottom-3 z-20 flex items-center gap-2">
          {userId ? (
            <>
              <button
                aria-label={liked ? "Remover like" : "Dar like"}
                disabled={likeBusy}
                onClick={toggleLike}
                className={`h-11 w-11 rounded-full border border-white/60 bg-white/80 backdrop-blur flex items-center justify-center active:scale-95 transition ${
                  likePulse ? "scale-110" : "scale-100"
                }`}
              >
                {liked ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="#e11d48"
                    stroke="none"
                  >
                    <path d="M12 21s-7.5-4.35-9.5-8.4C1.3 9.6 2.7 6 6.4 6c2 0 3.1 1 3.6 1.7.5-.7 1.6-1.7 3.6-1.7 3.7 0 5.1 3.6 3.9 6.6C19.5 16.65 12 21 12 21z" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M20.8 12.6C18.8 16.65 12 21 12 21s-6.8-4.35-8.8-8.4C2 9.6 3.4 6 7.1 6c2 0 3.1 1 3.6 1.7.5-.7 1.6-1.7 3.6-1.7 3.7 0 5.1 3.6 3.9 6.6Z"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
              <span className="px-2 py-1 rounded-full bg-white/80 backdrop-blur text-xs font-medium border border-white/60">
                {likeCount}
              </span>
            </>
          ) : (
            <>
              <div
                aria-label="Likes"
                className="h-11 w-11 rounded-full border border-white/60 bg-white/60 backdrop-blur flex items-center justify-center opacity-80"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M20.8 12.6C18.8 16.65 12 21 12 21s-6.8-4.35-8.8-8.4C2 9.6 3.4 6 7.1 6c2 0 3.1 1 3.6 1.7.5-.7 1.6-1.7 3.6-1.7 3.7 0 5.1 3.6 3.9 6.6Z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="px-2 py-1 rounded-full bg-white/80 backdrop-blur text-xs font-medium border border-white/60">
                {likeCount}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <section className="px-4 py-4 pb-[120px]">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[22px] leading-6 font-semibold tracking-tight">
            {product.name}
          </h1>
          <div className="text-right">
            <div className="text-[20px] leading-6 font-bold">
              {formatBRL(product.price_tag)}
            </div>
            <div className="text-[11px] text-gray-500">
              {product.eta_text ?? "até 1h"}
            </div>
          </div>
        </div>

        <div className="mt-2 inline-flex items-center gap-2">
          <span className="px-2.5 h-7 rounded-full border border-gray-200 bg-white text-xs font-medium">
            {product.store_name}
          </span>
        </div>

        {/* Seleção de tamanho */}
        <div className="mt-5 rounded-2xl border border-gray-200 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Size</div>
            <button
              type="button"
              className="text-xs text-gray-600 underline"
              onClick={() => showToast("Guia de tamanhos em breve")}
            >
              Size guide
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                aria-pressed={size === s}
                className={`h-10 min-w-12 px-3 rounded-full border text-sm focus:outline-none focus:ring-2 focus:ring-black/15 ${
                  size === s
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {!size && (
            <p className="mt-2 text-xs text-gray-500">
              Selecione um tamanho para adicionar
            </p>
          )}
        </div>

        {/* Comentários */}
        <div className="mt-6">
          <h2 className="text-sm font-semibold tracking-wide">Comentários</h2>

          <div className="mt-3 space-y-3">
            {commentsLoading ? (
              <>
                <div className="animate-pulse h-14 rounded-xl bg-gray-100" />
                <div className="animate-pulse h-14 rounded-xl bg-gray-100" />
              </>
            ) : comments.length === 0 ? (
              <p className="text-xs text-gray-500">
                Seja o primeiro a comentar.
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{c.displayName}</div>
                    <div className="text-[11px] text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Novo comentário */}
          {userId ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newComment.trim()) return;
                handlePostComment();
              }}
              className="mt-4"
            >
              <label htmlFor="new-comment" className="sr-only">
                Novo comentário
              </label>
              <textarea
                id="new-comment"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escreva um comentário (seja gentil ✨)"
                className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Seu nome aparece como primeiro nome + inicial.
                </span>
                <button
                  type="submit"
                  disabled={posting || newComment.trim().length < 2}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {posting ? "Enviando…" : "Publicar"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              Faça login para comentar.
            </div>
          )}
        </div>
      </section>

      {/* CTA fixo no rodapé com área segura */}
      <div className="fixed inset-x-0 bottom-0 z-[120] bg-white border-t">
        <div className="mx-auto max-w-md px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-base font-semibold">
              {formatBRL(product.price_tag)}
            </span>
          </div>
          <button
            onClick={handleAddToBag}
            disabled={!size}
            className={`w-full h-12 rounded-xl text-white text-sm font-semibold active:scale-[0.99] transition ${
              size ? "bg-black" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Adicionar à sacola
          </button>
        </div>
      </div>

      {/* Toast mínimo */}
      {toast && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[130] bg-black text-white text-sm px-3 py-2 rounded-full shadow"
        >
          {toast}
        </div>
      )}

      {/* JSON-LD Product */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            brand: product.store_name,
            image: images[0] ?? "",
            offers: {
              "@type": "Offer",
              priceCurrency: "BRL",
              price: product.price_tag,
              availability: "https://schema.org/InStock",
            },
          }),
        }}
      />
    </main>
  );
}
