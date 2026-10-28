const AuthShell = ({ children }) => (
  <div className="min-h-screen w-full flex flex-col lg:flex-row bg-ps-bg text-ps-ink-1">

    {/* ── Left: Building + Brand Plate ─────────────────────────────── */}
    <div className="relative min-h-[38vh] lg:w-[46%] shrink-0 overflow-hidden">
      <img
        src="/brand/building.jpg"
        alt="Polikids Center for Development building"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[rgba(11,11,11,0.6)]"></div>
      <div className="relative z-10 h-full flex flex-col justify-between gap-10 p-6 sm:p-8 lg:p-12">
        {/* crown lockup: tight crop on white, sits on a white tile */}
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="shrink-0 bg-white p-3">
            <img
              src="/brand/polikids-logo-lockup.png"
              alt="Polikids Center for Development logo"
              className="h-auto w-28 sm:w-36"
            />
          </div>
          {/* on media, so the wordmark takes the on-photo ink in both modes */}
          <p className="sa-wordmark [--sa-text-primary:var(--color-ps-sky)]">PoliSync</p>
        </div>

        <div className="space-y-3 max-w-md">
          <p className="text-sm sm:text-base text-ps-sky">One secure hub for every session at Polikids.</p>
          <p className="hidden md:block text-sm leading-relaxed text-ps-sky">Schedule therapy and classroom sessions with automatic conflict checks, record attendance and notes, and keep teachers, therapists, and parents aligned on every child’s progress.</p>
        </div>
      </div>
    </div>

    {/* ── Right Form Container ───────────────────────────────────────── */}
    <div className="flex-1 flex flex-col items-center justify-start p-4 sm:p-8 lg:justify-center lg:p-12 lg:overflow-y-auto">
      {children}
    </div>

  </div>
);

export default AuthShell;
