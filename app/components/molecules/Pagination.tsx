import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100]
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const maxPages = Math.max(1, totalPages);

  const [inputPage, setInputPage] = React.useState<string>(String(currentPage));

  React.useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
      onPageChange(pageNum);
    } else {
      setInputPage(String(currentPage));
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-950/10 px-6 py-4 gap-4 w-full text-xs">
      {/* Left: Summary & Items per page selector */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <div>
          Showing <span className="text-slate-700 dark:text-slate-300 font-extrabold">{startItem}</span> to{' '}
          <span className="text-slate-700 dark:text-slate-300 font-extrabold">{endItem}</span> of{' '}
          <span className="text-slate-700 dark:text-slate-300 font-extrabold">{totalItems}</span> items
        </div>

        <div className="flex items-center gap-1.5 normal-case font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-2.5 py-1 rounded-xl shadow-sm">
          <span className="text-slate-400 font-bold text-[10px] uppercase">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) {
                onPageSizeChange(newSize);
              }
              onPageChange(1);
            }}
            className="bg-transparent font-black text-xs text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-100 font-bold">
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Right: Direct page jump input + Pagination buttons */}
      <div className="flex items-center gap-3">
        {/* Direct page jump input */}
        <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
          <span>Go to page:</span>
          <input
            type="number"
            min={1}
            max={maxPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={handlePageInputSubmit}
            className="w-12 px-2 py-1 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-[#5d51e8]"
          />
          <span className="text-slate-400 font-bold">/ {maxPages}</span>
        </form>

        {/* Arrow buttons */}
        <div className="flex items-center gap-1">
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
    </div>
  );
}
