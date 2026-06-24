import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SearchInput({
  placeholder = "Search...",
  value,
  onChange,
  className = '',
  ...props
}: SearchInputProps) {
  return (
    <div className="relative max-w-sm w-full">
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full pl-10 pr-4 py-1.5 border border-slate-200 dark:border-zinc-800 rounded-full text-xs font-bold outline-none focus:border-[#5d51e8] focus:ring-1 focus:ring-[#5d51e8] bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-slate-100 transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
}
