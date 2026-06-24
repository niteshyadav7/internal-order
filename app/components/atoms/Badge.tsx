import React from 'react';

interface BadgeProps {
  status: string;
  type?: 'user' | 'order';
}

export default function Badge({ status, type = 'user' }: BadgeProps) {
  const getColors = (s: string) => {
    const key = s.toLowerCase();
    if (type === 'user') {
      return {
        approved: 'bg-emerald-50 border-emerald-250 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/55 dark:text-emerald-400',
        pending: 'bg-amber-50 border-amber-250 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/55 dark:text-amber-400',
        rejected: 'bg-rose-50 border-rose-250 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/55 dark:text-rose-400',
      }[key] || 'bg-slate-50 border-slate-200 text-slate-700';
    } else {
      // order status
      return {
        pending: 'bg-amber-50 text-amber-700 border-amber-250 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
        processing: 'bg-indigo-50 text-indigo-700 border-indigo-250 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/50',
        completed: 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
        cancelled: 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50',
      }[key] || 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-block px-2.5 py-1 text-[10px] font-black border rounded-full uppercase tracking-wider ${getColors(status)}`}>
      {status}
    </span>
  );
}
