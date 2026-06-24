'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  onClick?: () => void;
}

export default function Toast({ message, type, onClose, onClick }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgStyles = {
    success: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300',
    error: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300',
  };

  const Icon = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
  }[type];

  return (
    <div 
      onClick={onClick}
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 fade-in duration-300 hover:scale-[1.02] active:scale-[0.98] transition-all ${bgStyles[type]} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {Icon}
      <p className="text-xs font-bold tracking-tight">{message}</p>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }} 
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
