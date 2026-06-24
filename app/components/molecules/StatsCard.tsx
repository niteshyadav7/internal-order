import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  colorClass?: string;
  activeBorderClass?: string;
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  active,
  onClick,
  colorClass = "text-[#5d51e8] bg-indigo-50 dark:bg-indigo-950/20",
  activeBorderClass = "border-[#5d51e8] ring-2 ring-[#5d51e8]/20 dark:border-[#5d51e8]"
}: StatsCardProps) {
  const isButton = !!onClick;
  const classes = `text-left bg-white dark:bg-zinc-900 border rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all duration-200 w-full ${
    isButton ? 'cursor-pointer hover:border-slate-350 dark:hover:border-zinc-700' : ''
  } ${
    active
      ? activeBorderClass
      : 'border-slate-200/80 dark:border-zinc-800'
  }`;

  const content = (
    <>
      <div className={`p-3 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400">{label}</p>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{value}</h3>
      </div>
    </>
  );

  if (isButton) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes}>
      {content}
    </div>
  );
}
