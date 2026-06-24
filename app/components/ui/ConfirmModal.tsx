'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-sm w-full rounded-[2.2rem] p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Warning Icon Banner */}
        <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 border border-rose-100 dark:border-rose-900/50 rounded-full flex items-center justify-center shadow-inner">
          <AlertTriangle className="w-6 h-6" />
        </div>
        
        {/* Content */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
            {title}
          </h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-550 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs py-3 px-4 rounded-full border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs py-3 px-4 rounded-full shadow-md shadow-rose-600/10 transition-all active:scale-95 cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
