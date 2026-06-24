import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  text?: string;
  fullscreen?: boolean;
}

export default function Loader({ text = "Loading...", fullscreen = false }: LoaderProps) {
  if (fullscreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-10 w-10 text-[#5d51e8]" />
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3 w-full">
      <Loader2 className="animate-spin h-8 w-8 text-[#5d51e8]" />
      <p className="text-xs font-bold text-slate-400">{text}</p>
    </div>
  );
}
