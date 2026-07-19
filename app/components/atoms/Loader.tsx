import React from 'react';
import { Loader2, ShoppingBag, ShoppingCart, Search, Check } from 'lucide-react';

interface LoaderProps {
  text?: string;
  fullscreen?: boolean;
  variant?: 'fullscreen' | 'skeleton-grid' | 'skeleton-reels' | 'inline' | 'simple';
}

export default function Loader({ 
  text = "Loading...", 
  fullscreen = false, 
  variant 
}: LoaderProps) {
  // Map old fullscreen prop to variants for backward compatibility
  const activeVariant = variant || (fullscreen ? 'fullscreen' : 'simple');

  // 1. FULLSCREEN BRAND LOADER (Zomato/Swiggy Premium Bouncing Bag & Glow Rings)
  if (activeVariant === 'fullscreen') {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-zinc-950/90 backdrop-blur-md z-[100] transition-opacity duration-300">
        <div className="relative flex items-center justify-center w-32 h-32 mb-6">
          {/* Animated glow rings expanding outwards */}
          <div className="absolute w-24 h-24 rounded-full bg-[#5d51e8]/10 border border-[#5d51e8]/20 animate-pulse-ring" />
          <div className="absolute w-24 h-24 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 animate-pulse-ring [animation-delay:0.7s]" />
          
          {/* Bouncing Premium Logo / Icon Box */}
          <div className="relative w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-[#5d51e8] to-[#8b5cf6] flex items-center justify-center shadow-xl shadow-indigo-500/20 animate-brand-bounce border border-white/20">
            <ShoppingBag className="w-10 h-10 text-white stroke-[1.8]" />
            {/* Thread needle effect representation */}
            <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
          </div>
        </div>

        {/* Text with pulsing letter-spacing waves */}
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-zinc-200 animate-text-wave">
          {text}
        </h4>
        <p className="text-[10px] text-slate-400 dark:text-zinc-550 font-bold mt-1.5 tracking-wide">
          Balaji Storefront Premium
        </p>
      </div>
    );
  }

  // 2. PRODUCT GRID SKELETON (Zomato-like catalog placeholder skeleton cards)
  if (activeVariant === 'skeleton-grid') {
    return (
      <div className="w-full space-y-8 animate-fade-in duration-300">
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-850 rounded-[2rem] overflow-hidden p-6 space-y-4 shadow-sm"
            >
              {/* Image box shimmer */}
              <div className="h-48 rounded-2xl animate-shimmer" />

              <div className="space-y-2">
                {/* Code/Design badge shimmer */}
                <div className="w-1/2 h-4 rounded-lg animate-shimmer" />
                {/* Product Title shimmer */}
                <div className="w-3/4 h-5 rounded-lg animate-shimmer" />
                {/* Product description line 1 shimmer */}
                <div className="w-full h-3.5 rounded-lg animate-shimmer" />
                {/* Product description line 2 shimmer */}
                <div className="w-5/6 h-3.5 rounded-lg animate-shimmer" />
              </div>

              {/* Price and Cart Row shimmer */}
              <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="w-10 h-3 rounded animate-shimmer" />
                  <div className="w-20 h-5 rounded-lg animate-shimmer" />
                </div>
                <div className="w-24 h-9 rounded-xl animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. MOBILE REELS VIEW SKELETON (Zomato-like full page placeholder shimmer)
  if (activeVariant === 'skeleton-reels') {
    return (
      <div className="fixed inset-0 bg-black flex flex-col justify-end p-5 z-30 animate-fade-in">
        {/* Full screen background shimmer */}
        <div className="absolute inset-0 animate-shimmer opacity-20" />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />

        {/* Floating circular left buttons shimmer */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-5 z-40">
          <div className="w-11 h-11 rounded-full animate-shimmer opacity-40" />
          <div className="w-11 h-11 rounded-full animate-shimmer opacity-40" />
        </div>

        {/* Top Product Counter Shimmer */}
        <div className="absolute top-16 right-4 w-16 h-7 rounded-full animate-shimmer opacity-40 z-40" />

        {/* Bottom Details Shimmer */}
        <div className="space-y-4 w-full max-w-[280px] sm:max-w-[400px] z-40 mb-20 text-left">
          {/* Category/Code badge */}
          <div className="w-24 h-5 rounded-lg animate-shimmer opacity-40" />
          {/* Title */}
          <div className="w-48 h-8 rounded-xl animate-shimmer opacity-55" />
          {/* Prices */}
          <div className="w-32 h-6 rounded-lg animate-shimmer opacity-45" />
          {/* Variant circles */}
          <div className="flex gap-2 pt-2">
            <div className="w-9 h-9 rounded-full animate-shimmer opacity-40" />
            <div className="w-9 h-9 rounded-full animate-shimmer opacity-40" />
            <div className="w-9 h-9 rounded-full animate-shimmer opacity-40" />
          </div>
        </div>

        {/* Bottom Add to Cart Button Shimmer */}
        <div className="w-full h-12 rounded-2xl animate-shimmer opacity-55 z-40 mb-3" />
      </div>
    );
  }

  // 4. INLINE LOADER (Small Pulsing Indicator)
  if (activeVariant === 'inline') {
    return (
      <div className="flex items-center gap-2.5 py-3 px-5 rounded-full bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 shadow-sm">
        <div className="relative flex items-center justify-center w-5 h-5">
          <div className="absolute w-3.5 h-3.5 rounded-full bg-[#5d51e8]/20 animate-ping" />
          <Loader2 className="animate-spin w-4 h-4 text-[#5d51e8]" />
        </div>
        <span className="text-[11px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
          {text}
        </span>
      </div>
    );
  }

  // 5. SIMPLE SPINNER LOADER (Default fallback)
  return (
    <div className="py-20 flex flex-col items-center justify-center gap-3 w-full animate-in fade-in duration-200">
      <Loader2 className="animate-spin h-8 w-8 text-[#5d51e8]" />
      {text && <p className="text-xs font-bold text-slate-400 dark:text-zinc-550">{text}</p>}
    </div>
  );
}
