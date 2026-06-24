import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/10 px-6 py-4 gap-4 w-full">
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        Showing <span className="text-slate-700 dark:text-slate-300">{startItem}</span> to{' '}
        <span className="text-slate-700 dark:text-slate-300">{endItem}</span> of{' '}
        <span className="text-slate-700 dark:text-slate-300">{totalItems}</span> items
      </div>
      
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 border border-slate-200 dark:border-zinc-850 rounded-xl text-slate-500 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          title="First Page"
        >
          <ChevronLeft className="w-4 h-4 stroke-[3]" />
          <ChevronLeft className="w-4 h-4 stroke-[3] -ml-2 inline" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-2 border border-slate-200 dark:border-zinc-850 rounded-xl text-slate-500 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 stroke-[3]" />
        </button>
        
        <span className="text-xs font-black text-slate-600 dark:text-slate-400 px-3 select-none">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        
        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 border border-slate-200 dark:border-zinc-850 rounded-xl text-slate-500 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-2 border border-slate-200 dark:border-zinc-850 rounded-xl text-slate-500 dark:text-slate-450 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100/50 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          title="Last Page"
        >
          <ChevronRight className="w-4 h-4 stroke-[3]" />
          <ChevronRight className="w-4 h-4 stroke-[3] -ml-2 inline" />
        </button>
      </div>
    </div>
  );
}
