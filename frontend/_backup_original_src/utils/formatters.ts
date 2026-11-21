import type { LeadPriority, LeadStatus } from '../types';


export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatScoreGrade(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'B':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'C':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'D':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-rose-100 text-rose-800 border-rose-200';
  }
}

export function getStatusBadgeStyles(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'contacted':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'qualified':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'proposal':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'negotiation':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'won':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'lost':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

export function getPriorityBadgeStyles(priority: LeadPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'high':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}
