const AuthShell = ({ children }) => (
  <div className="min-h-screen md:h-screen w-full flex flex-col md:flex-row bg-ps-bg font-sans text-ps-ink-1 transition-colors">

    {/* ── Left: Building + Brand Panel ─────────────────────────────── */}
    <div className="relative h-[40vh] md:h-full md:w-1/2 shrink-0 overflow-hidden">
      <img
        src="/brand/building.jpg"
        alt="Polikids Center for Development building"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-[rgba(14,19,34,.78)] via-[rgba(14,19,34,.5)] to-[rgba(37,99,235,.3)]"
      ></div>
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 p-6 text-center md:items-start md:justify-between md:p-12 md:text-left">
        {/* full logo: source JPG is square, its own white bg blends with the card */}
        <div className="rounded-2xl bg-white p-3 sm:p-4 shadow-sm">
          <img
            src="/brand/polikids-logo.jpg"
            alt="Polikids Center for Development logo"
            className="aspect-square object-contain w-24 sm:w-40"
          />
        </div>
        <div className="space-y-2 max-w-xs sm:max-w-sm">
          <h1 className="font-display font-semibold text-3xl tracking-tight text-white">PoliSync</h1>
          <p className="text-sm font-medium text-ps-sky">One secure hub for every session at Polikids.</p>
          <p className="text-sm text-white/75 leading-relaxed">Schedule therapy and classroom sessions, track attendance, and keep teachers, therapists, and parents aligned on every child’s progress.</p>
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
