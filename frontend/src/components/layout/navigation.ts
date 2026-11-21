import { BarChart3, BellRing, Boxes, Globe, History, LayoutDashboard, Settings, Target, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/leads', label: 'Leads', icon: Users },
      { to: '/follow-ups', label: 'Follow-ups', icon: BellRing },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/lead-scoring', label: 'Lead Scoring', icon: Target },
      { to: '/website-analysis', label: 'Website Analysis', icon: Globe },
      { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
      { to: '/lead-history', label: 'Lead History', icon: History },
    ],
  },
  {
    title: 'Manage',
    items: [
      { to: '/services', label: 'Services', icon: Boxes },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]
