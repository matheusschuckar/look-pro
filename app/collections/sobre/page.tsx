"use client";

import Link from "next/link";

export default function SobrePage() {
  return (
    <main className="canvas text-black max-w-md mx-auto min-h-screen with-bottom-nav !bg-[var(--background)]">
      {/* Header fixo no topo */}
      <div className="pt-6 px-5">
        <h1 className="text-[32px] leading-8 font-bold tracking-tight">Look</h1>
        <p className="mt-1 text-[13px] text-gray-600">
          Ready to wear in minutes
        </p>
      </div>

      {/* Banner em largura total com seta sobreposta */}
      <div className="relative w-full h-80 overflow-hidden mt-4 shadow-soft border-b border-warm">
        <img
          src="https://images.unsplash.com/photo-1678460737180-01465207e6ef?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Banner Sobre"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* overlays */}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* seta de voltar */}
        <Link
          href="/"
          className="absolute top-5 left-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-black/40 backdrop-blur-sm shadow-sm active:scale-95 transition"
          aria-label="Voltar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-white"
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Conteúdo */}
      <section className="px-5 mt-6">
        <div className="h-px w-12 bg-[color:var(--warm,#d9655b)] rounded-full" />

        <h2 className="mt-3 text-xl font-bold tracking-wide uppercase">
          SOBRE A LOOK
        </h2>

        <p className="mt-0.5 text-[15px] font-bold italic text-gray-800">
          O primeiro delivery de moda do mundo que une rapidez e curadoria de
          excelência.
        </p>

        <div className="mt-3 space-y-3 text-gray-700 text-sm leading-6">
          <p>
            Na Look, acreditamos que a moda deve acompanhar o ritmo da vida
            contemporânea sem perder a essência da curadoria refinada. Por isso,
            criamos o{" "}
            <span className="font-semibold">
              primeiro delivery de moda do mundo com curadoria refinada
            </span>
            : rápido, preciso e pensado para o seu estilo.
          </p>
          <p>
            Cada peça é escolhida com rigor, priorizando qualidade,
            autenticidade e relevância. Não se trata apenas de vestir, mas de
            traduzir identidade com praticidade e elegância, diretamente ao seu
            alcance.
          </p>
          <p>
            Com a Look, o luxo se reinventa em forma de agilidade: moda entregue
            em minutos, para que você viva o presente com estilo e confiança.
          </p>
        </div>
      </section>

      {/* Pilares */}
      <section className="mt-6 grid grid-cols-2 gap-3 px-5">
        <div className="surface rounded-2xl border border-warm shadow-soft p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-strong)] border border-warm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M20 7l-8 10L4 9"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="text-sm font-semibold">Curadoria</div>
          </div>
          <p className="mt-2 text-xs text-gray-600 leading-5">
            Seleção feita a dedo, de marcas e peças que importam.
          </p>
        </div>

        <div className="surface rounded-2xl border border-warm shadow-soft p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-strong)] border border-warm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M13 3L4 14h7l-1 7 9-11h-7l1-7z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="text-sm font-semibold">Rapidez</div>
          </div>
          <p className="mt-2 text-xs text-gray-600 leading-5">
            Entregas em minutos, no ritmo da sua agenda.
          </p>
        </div>

        <div className="surface rounded-2xl border border-warm shadow-soft p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-strong)] border border-warm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M20 12H4" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M6 12a6 6 0 0112 0"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="text-sm font-semibold">Receba em casa</div>
          </div>
          <p className="mt-2 text-xs text-gray-600 leading-5">
            Esqueça o trânsito. Receba no conforto da sua casa.
          </p>
        </div>

        <div className="surface rounded-2xl border border-warm shadow-soft p-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--surface-strong)] border border-warm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M12 2v6M6 12h12"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M4 14c2 4 6 6 8 6s6-2 8-6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="text-sm font-semibold">Inteligente</div>
          </div>
          <p className="mt-2 text-xs text-gray-600 leading-5">
            Decisões melhores, compras precisas, menos desperdício.
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mt-7 rounded-2xl surface border border-warm shadow-soft p-4 mx-5">
        <div className="text-sm font-semibold">Como funciona</div>
        <ol className="mt-3 space-y-3 text-sm text-gray-700">
          <li className="flex gap-3">
            <StepIcon>1</StepIcon>
            <div>
              <div className="font-medium">Escolha</div>
              <p className="text-gray-600 text-xs leading-5">
                Selecione peças e combinações no app.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <StepIcon>2</StepIcon>
            <div>
              <div className="font-medium">Compre</div>
              <p className="text-gray-600 text-xs leading-5">
                Finalize o pedido de forma simples e segura.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <StepIcon>3</StepIcon>
            <div>
              <div className="font-medium">Receba</div>
              <p className="text-gray-600 text-xs leading-5">
                Entrega em até 1 hora, direto no endereço cadastrado.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <StepIcon>4</StepIcon>
            <div>
              <div className="font-medium">Vista-se</div>
              <p className="text-gray-600 text-xs leading-5">
                Aproveite suas novas peças imediatamente, no seu estilo.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <div className="h-6" />
    </main>
  );
}

function StepIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-warm bg-[color:var(--surface)] text-[13px] font-semibold shadow-soft">
      {children}
    </span>
  );
}
