import React from 'react';
import { Check } from 'lucide-react';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  okText: string;
}

export default function OrderSuccessModal({
  isOpen,
  onClose,
  title,
  message,
  okText
}: OrderSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 max-w-md w-full rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-200 dark:border-emerald-900/50 rounded-full flex items-center justify-center shadow-inner">
          <Check className="w-8 h-8 stroke-[4]" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400 leading-relaxed">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-black text-sm py-3.5 px-6 rounded-full shadow-md shadow-[#5d51e8]/25 transition-transform active:scale-95 cursor-pointer"
        >
          {okText}
        </button>
      </div>
    </div>
  );
}
