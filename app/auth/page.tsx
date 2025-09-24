'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

// evita SSG nessa rota e previne o "prerender-error" no build
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const router = useRouter();
  const search = useSearchParams();
  const nextRaw = search?.get('next') || '/';

  const next = useMemo(() => {
    try {
      const decoded = decodeURIComponent(nextRaw);
      if (/^https?:\/\//i.test(decoded)) return '/';
      return decoded || '/';
    } catch {
      return '/';
    }
  }, [nextRaw]);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // se já estiver logado, redireciona para next
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) router.replace(next);
    })();
  }, [router, next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data?.user) {
          await supabase
            .from('user_profiles')
            .upsert({ id: data.user.id, email }, { onConflict: 'id' });
        }
        router.replace(`/profile?next=${encodeURIComponent(nextRaw)}`);
      }
    } catch (e: any) {
      setErr(e?.message || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // Paleta warm:
  const SURFACE = '#F9F7F5';       // off-white quente
  const SURFACE_STRONG = '#EFEAE3'; // trilha do tab
  const BORDER = '#E6E1DB';         // borda suave

  return (
    // ==== FUNDO OFF-WHITE QUENTE ====
    <main className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      {/* Header */}
      <div className="mx-auto max-w-md px-5 pt-10">
        <h1 className="text-4xl font-semibold tracking-tight text-black">Look</h1>
        <p className="mt-1 text-sm text-neutral-600">Ready to wear in minutes</p>
      </div>

      {/* Card */}
      <div className="mx-auto mt-6 max-w-md px-5">
        <div
          className="
            rounded-2xl p-6
            shadow-[0_6px_24px_-10px_rgba(0,0,0,0.18)]
          "
          style={{
            backgroundColor: SURFACE,
            border: `1px solid ${BORDER}`,
          }}
        >
          {/* Tabs */}
          <div className="mb-6">
            <div
              role="tablist"
              aria-label="Auth mode"
              className="relative grid grid-cols-2 rounded-xl p-1"
              style={{ backgroundColor: SURFACE_STRONG }}
            >
              <span
                aria-hidden
                className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm transition-transform duration-200 ${
                  mode === 'signin' ? 'translate-x-0' : 'translate-x-full'
                }`}
                style={{ backgroundColor: SURFACE }}
              />
              <button
                role="tab"
                aria-selected={mode === 'signin'}
                onClick={() => setMode('signin')}
                className={`relative z-10 h-9 rounded-lg text-sm font-semibold transition 
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15
                  ${mode === 'signin' ? 'text-black' : 'text-neutral-600 hover:text-neutral-800'}`}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => setMode('signup')}
                className={`relative z-10 h-9 rounded-lg text-sm font-semibold transition 
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15
                  ${mode === 'signup' ? 'text-black' : 'text-neutral-600 hover:text-neutral-800'}`}
              >
                Create account
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Email</label>
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                style={{
                  backgroundColor: SURFACE,
                  border: `1px solid ${BORDER}`,
                }}
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>

            {/* Password + Forgot */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-800">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => router.push('/auth/otp')}
                    className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl pr-10 px-3 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-black/10"
                  style={{
                    backgroundColor: SURFACE,
                    border: `1px solid ${BORDER}`,
                  }}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute inset-y-0 right-0 mr-2 grid w-8 place-items-center rounded-lg text-neutral-500 hover:text-neutral-800"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 2l20 20M9.88 9.88A3 3 0 0114.12 14.12M10.73 5.08A9.78 9.78 0 0112 5c5.52 0 10 5 10 7-0.34 0.62-1.14 1.67-2.45 2.8M6.1 6.1C3.86 7.66 2.34 9.72 2 12c0 2 4.48 7 10 7 1.17 0 2.3-.2 3.36-.57" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] leading-5 text-neutral-500">
            By continuing, you agree to Look’s <span className="underline">Terms</span> and{' '}
            <span className="underline">Privacy</span>.
          </p>
        </div>
      </div>
    </main>
  );
}
