const AuthShell = ({ children }) => (
  <div className="min-h-screen md:h-screen w-full flex flex-col md:flex-row bg-ps-bg font-sans text-ps-ink-1 transition-colors">

    {/* ── Left: Building + Brand Panel ─────────────────────────────── */}
    <div className="relative min-h-[40vh] md:h-full md:w-1/2 shrink-0 overflow-hidden">
      <img
        src="/brand/building.jpg"
        alt="Polikids Center for Development building"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[rgba(14,19,34,.82)] via-[rgba(14,19,34,.58)] to-[rgba(37,99,235,.3)]"
      ></div>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[rgba(14,19,34,.6)] via-[rgba(14,19,34,.15)] to-transparent"
      ></div>
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 md:gap-16 p-6 text-center md:items-start md:justify-start md:p-12 md:text-left">
        {/* full logo: source JPG is square, its own white bg blends with the card */}
        <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm">
          <img
            src="/brand/polikids-logo.jpg"
            alt="Polikids Center for Development logo"
            className="aspect-square object-contain w-20 sm:w-32"
          />
        </div>
        <div className="space-y-3 w-full max-w-2xl">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl md:text-4xl lg:text-5xl tracking-tight text-white">PoliSync</h1>
          <p className="text-sm sm:text-base md:text-lg font-medium text-ps-sky">One secure hub for every session at Polikids.</p>
          <p className="hidden md:block text-base md:text-lg lg:text-xl text-white/90 leading-relaxed">Schedule therapy and classroom sessions with automatic conflict checks, record attendance and notes, and keep teachers, therapists, and parents aligned on every child’s progress.</p>
        </div>
      </div>
    </div>

    {/* ── Right Form Container ───────────────────────────────────────── */}
    <div className="flex-1 md:w-1/2 flex items-center justify-center p-4 sm:p-8 md:p-12 md:overflow-y-auto">
      {children}
    </div>

  </div>
);

export default AuthShell;
