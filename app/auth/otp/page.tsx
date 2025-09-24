// app/auth/otp/page.tsx
"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "request" | "verify";

export const dynamic = "force-dynamic";

function OtpPageInner() {
  const router = useRouter();

  const search = useSearchParams();
  const nextRaw = search?.get("next") || "/";

  const next = useMemo(() => {
    try {
      const decoded = decodeURIComponent(nextRaw);
      if (/^https?:\/\//i.test(decoded)) return "/";
      return decoded || "/";
    } catch {
      return "/";
    }
  }, [nextRaw]);

  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // form states
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(""); // token/código do e-mail
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Se já estiver logado, manda para `next`
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) router.replace(next);
    })();
  }, [router, next]);

  async function handleSendEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      // Envia o e-mail de recuperação. O redirectTo só garante que, se o usuário
      // clicar no link, ele volte pra essa página (não vamos usar o link; usaremos o token).
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/otp`
              : undefined,
        }
      );
      if (error) throw error;
      setOk(
        "Enviamos um e-mail com o código. Abra o e-mail, copie o código do link e cole abaixo."
      );
      setStep("verify");
    } catch (e: any) {
      setErr(e?.message ?? "Não foi possível enviar o e-mail agora.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndReset(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      const token = code.trim();

      if (!cleanEmail) throw new Error("Informe o e-mail.");
      if (!token) throw new Error("Informe o código recebido por e-mail.");
      if (!password || password.length < 6)
        throw new Error("A nova senha deve ter pelo menos 6 caracteres.");

      // 1) Valida o token (sem precisar abrir o link)
      const { error: vErr, data: vData } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token,
        type: "recovery", // fluxo de recuperação de senha
      });
      if (vErr) throw vErr;

      // 2) Tendo sessão (ou fator válido), atualizamos a senha
      const { error: uErr } = await supabase.auth.updateUser({
        password,
      });
      if (uErr) throw uErr;

      setOk("Senha alterada com sucesso! Redirecionando…");
      // pequeno delay para UX
      setTimeout(() => router.replace(next), 700);
    } catch (e: any) {
      // Mensagens mais amigáveis para erros comuns
      const msg = String(e?.message || "");
      if (/Token has expired/i.test(msg)) {
        setErr("Código expirado. Peça um novo e-mail.");
      } else if (/Invalid token/i.test(msg)) {
        setErr("Código inválido. Confira e tente novamente.");
      } else if (/Email not found/i.test(msg)) {
        setErr("Não encontramos esse e-mail.");
      } else {
        setErr(msg || "Não foi possível validar o código.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Dica: se o usuário colar o link inteiro do e-mail no campo "código",
  // extraímos o token automaticamente (param ?token=...).
  useEffect(() => {
    if (!code.includes("http")) return;
    try {
      const u = new URL(code.trim());
      const t = u.searchParams.get("token");
      if (t) setCode(t);
    } catch {
      // ignore
    }
  }, [code]);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-md px-5 pt-10">
        <h1 className="text-4xl font-semibold tracking-tight text-black">
          Recover
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Reset your password with a code sent to your email.
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-md px-5">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {/* Tabs simples */}
          <div className="mb-6">
            <div
              role="tablist"
              aria-label="OTP mode"
              className="relative grid grid-cols-2 rounded-xl bg-neutral-100 p-1"
            >
              <span
                aria-hidden
                className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-200 ${
                  step === "request" ? "translate-x-0" : "translate-x-full"
                }`}
              />
              <button
                role="tab"
                aria-selected={step === "request"}
                onClick={() => setStep("request")}
                className={`relative z-10 h-9 rounded-lg text-sm font-semibold transition 
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                  ${
                    step === "request"
                      ? "text-black"
                      : "text-neutral-600 hover:text-neutral-800"
                  }`}
              >
                Send code
              </button>
              <button
                role="tab"
                aria-selected={step === "verify"}
                onClick={() => setStep("verify")}
                className={`relative z-10 h-9 rounded-lg text-sm font-semibold transition 
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20
                  ${
                    step === "verify"
                      ? "text-black"
                      : "text-neutral-600 hover:text-neutral-800"
                  }`}
              >
                Use code
              </button>
            </div>
          </div>

          {step === "request" ? (
            <form onSubmit={handleSendEmail} className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">
                  Email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
                <p className="mt-1 text-[12px] text-neutral-500">
                  Você receberá um e-mail com um <b>código</b>. Se preferir,
                  pode simplesmente colar o <i>link inteiro</i> aqui depois — eu
                  extraio o código automaticamente.
                </p>
              </div>

              {err && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </p>
              )}
              {ok && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  {ok}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Sending…" : "Send recovery email"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyAndReset} className="space-y-4">
              {/* Email */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">
                  Email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>

              {/* Código (token) */}
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">
                  Code
                </label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Cole aqui o código (ou o link inteiro)"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                />
                <p className="mt-1 text-[12px] text-neutral-500">
                  Dica: se colar o <i>link inteiro</i> do e-mail, eu pego o
                  código automaticamente.
                </p>
              </div>

              {/* Nova senha */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-800">
                    New password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 pr-10 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 mr-2 grid w-8 place-items-center rounded-lg text-neutral-500 hover:text-neutral-800"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2 2l20 20M9.88 9.88A3 3 0 0114.12 14.12M10.73 5.08A9.78 9.78 0 0112 5c5.52 0 10 5 10 7-0.34 0.62-1.14 1.67-2.45 2.8M6.1 6.1C3.86 7.66 2.34 9.72 2 12c0 2 4.48 7 10 7 1.17 0 2.3-.2 3.36-.57" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {err && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </p>
              )}
              {ok && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  {ok}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Validating…" : "Set new password"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={() =>
              router.replace(`/auth?next=${encodeURIComponent(nextRaw)}`)
            }
            className="text-xs text-neutral-600 underline"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-50" />}>
      <OtpPageInner />
    </Suspense>
  );
}
