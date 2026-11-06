const AuthShell = ({ children }) => (
  <div className="itx-scope min-h-screen w-full flex flex-col lg:flex-row bg-[var(--bg-canvas)] text-[var(--ink-primary)]">

    {/* ── Left: brand lockup, muted photo plate, summary ───────────── */}
    <section className="lg:w-[46%] shrink-0 flex flex-col gap-6 p-6 sm:p-8 lg:p-12 lg:justify-between">
      <div className="flex items-center gap-3 sm:gap-5">
        <img
          src="/brand/polikids-logo-removebg-preview.png"
          alt="Polikids Center for Development logo"
          width={500}
          height={499}
          className="h-auto w-24 sm:w-28 shrink-0 dark:invert"
        />
        <p className="sa-wordmark">PoliSync</p>
      </div>

      {/* one neutral token scrim keeps the photograph calm in both modes */}
      <div className="itx-card relative overflow-hidden min-h-[32vh] lg:min-h-0 lg:flex-1">
        <img
          src="/brand/building.jpg"
          alt="Polikids Center for Development building"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[var(--x-scrim)]"></div>
      </div>

      <div className="space-y-3 max-w-md">
        <p className="text-sm text-[var(--ink-body)]">One secure hub for every session at Polikids.</p>
        <p className="hidden md:block text-sm leading-relaxed text-[var(--ink-muted)]">Schedule therapy and classroom sessions with automatic conflict checks, record attendance and notes, and keep teachers, therapists, and parents aligned on every child’s progress.</p>
      </div>
    </section>

    {/* ── Right Form Container ───────────────────────────────────────── */}
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8 lg:justify-center lg:p-12 lg:overflow-y-auto">
      {children}
    </div>

  </div>
);

export default AuthShell;
