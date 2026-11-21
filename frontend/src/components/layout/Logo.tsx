export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${light ? 'bg-white/15 ring-1 ring-white/25' : 'bg-brand-600 shadow-md shadow-brand-600/30'}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" opacity="0.45" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className={`text-[15px] font-bold ${light ? 'text-white' : 'text-ink'}`}>
          Lead<span className={light ? 'text-brand-200' : 'text-brand-600'}>Intel</span>
        </p>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${light ? 'text-brand-100/80' : 'text-slate-400'}`}>Lead Intelligence</p>
      </div>
    </div>
  )
}
