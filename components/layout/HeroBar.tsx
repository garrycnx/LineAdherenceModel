export default function HeroBar() {
  return (
    <div className="hero-bar rounded-xl mb-6 relative overflow-hidden">
      <div className="px-6 py-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-2">
          {/* Back link */}
          <a
            href="https://www.wfmclubs.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/70 hover:text-white transition-colors flex items-center gap-1"
          >
            ← Go back to website
          </a>

          {/* Version badge */}
          <span
            className="text-xs font-semibold text-brand-400 bg-gray-950/60 px-3 py-1 rounded-full border border-brand-500/40 animate-glow"
            style={{ whiteSpace: 'nowrap' }}
          >
            Version 2.0
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
          🗓️ AI Schedules Generator
        </h1>

        {/* Subtitle */}
        <p className="mt-1 text-sm text-white/75">
          Developed by Gurpreet Singh · WFM Club · Powered by Erlang-C &amp; Line Adherence Engine
        </p>
      </div>

      {/* Decorative overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 80% 50%, rgba(72,202,228,0.08) 0%, transparent 60%)',
        }}
      />
    </div>
  );
}
