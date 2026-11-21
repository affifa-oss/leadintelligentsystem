import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-600/25 hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-600/30',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
}
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm' }
const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', icon, className = '', children, ...rest }: Props) {
  return (
    <button type="button" {...rest} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {icon}
      {children}
    </button>
  )
}

export function ButtonLink({ to, variant = 'primary', size = 'md', icon, children, className = '' }: { to: string; variant?: Variant; size?: Size; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {icon}
      {children}
    </Link>
  )
}
