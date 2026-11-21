import type { ReactNode } from 'react'

/** Animated mint-and-white background used by the sign-in and password pages. */
export function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-gradient-to-br from-white via-brand-50 to-[#e3f8ef] px-4 py-12">
      {/* drifting mint blobs */}
      <span aria-hidden="true" className="animate-blob pointer-events-none absolute -left-24 -top-24 h-[26rem] w-[26rem] bg-brand-300/45 blur-3xl" />
      <span aria-hidden="true" className="animate-blob pointer-events-none absolute -bottom-32 -right-20 h-[30rem] w-[30rem] bg-teal-200/50 blur-3xl [animation-delay:-6s]" />
      <span aria-hidden="true" className="animate-blob pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 bg-emerald-100/70 blur-3xl [animation-delay:-11s]" />

      {/* slow rotating dashed ring */}
      <span aria-hidden="true" className="animate-spin-slow pointer-events-none absolute h-[38rem] w-[38rem] rounded-full border border-dashed border-brand-300/40" />

      {/* faint dot grid */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(18,144,106,0.12)_1px,transparent_1px)] [background-size:22px_22px]" />

      {/* little floating sparkles */}
      {[
        'left-[12%] top-[22%]',
        'left-[80%] top-[18%] [animation-delay:-1.2s]',
        'left-[20%] top-[78%] [animation-delay:-2.4s]',
        'left-[86%] top-[70%] [animation-delay:-3.1s]',
        'left-[50%] top-[8%] [animation-delay:-0.6s]',
      ].map((pos) => (
        <span key={pos} aria-hidden="true" className={`animate-sparkle pointer-events-none absolute h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_12px_rgba(32,176,130,0.8)] ${pos}`} />
      ))}

      <div className="relative z-10 w-full max-w-[420px]">{children}</div>
    </div>
  )
}

/** Logo mark with a soft pulsing halo, for the top of auth cards. */
export function PulsingMark() {
  return (
    <span className="relative mx-auto grid h-16 w-16 place-items-center">
      <span aria-hidden="true" className="animate-ping-soft absolute inset-0 rounded-2xl bg-brand-400/40" />
      <span className="animate-float relative grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-lg shadow-brand-600/30">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" opacity="0.5" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
        </svg>
      </span>
    </span>
  )
}

/** Frosted white card that pops in. */
export const authCard = 'animate-pop-in rounded-3xl border border-white/80 bg-white/80 p-8 shadow-[0_30px_80px_-30px_rgba(18,144,106,0.45)] backdrop-blur-xl sm:p-10'
