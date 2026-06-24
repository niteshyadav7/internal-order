import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ShoppingCart, Loader2, Check } from 'lucide-react';
import { Product } from '../../lib/db';
import ProductPreview from '../molecules/ProductPreview';

interface ClientProductGridProps {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedIds: Set<string>;
  onToggleProduct: (id: string) => void;
  onPlaceOrder: () => void;
  submittingOrder: boolean;
  lang: 'en' | 'hi';
  t: (key: string) => string;
  profileName: string;
  getProductIcon: (category: string, size?: string) => React.ReactNode;
}

export default function ClientProductGrid({
  products,
  filteredProducts,
  loading,
  searchQuery,
  onSearchChange,
  selectedIds,
  onToggleProduct,
  onPlaceOrder,
  submittingOrder,
  lang,
  t,
  profileName,
  getProductIcon
}: ClientProductGridProps) {
  const [visibleCount, setVisibleCount] = useState(12);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible limit back to 12 when search query changes
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery]);

  // Infinite Scroll logic via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 12, filteredProducts.length));
      }
    }, {
      rootMargin: '200px', // start loading before the user reaches the absolute bottom
    });

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [filteredProducts.length]);

  const paginatedProducts = filteredProducts.slice(0, visibleCount);

  return (
    <>
      {/* User Welcome Block & Search */}
      <div className="bg-gradient-to-r from-[#5d51e8]/10 via-[#5d51e8]/5 to-transparent border border-[#5d51e8]/20 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Welcome, {profileName || 'Valued User'}
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
              Search and select the items you need to order.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-2.5 rounded-full shadow-sm w-fit self-start sm:self-center">
            <MapPin className="w-4 h-4 text-[#5d51e8]" />
            <span className="text-xs font-extrabold text-slate-650 dark:text-zinc-300">
              E-Commerce Store
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-lg">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for smartphones, laptops, clothing..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full text-sm font-semibold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 shadow-sm"
          />
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#5d51e8]" />
          <p className="text-sm font-bold text-slate-400">Loading catalog...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <p className="text-slate-500 dark:text-zinc-400 font-bold">
            {t('noProductsText')}
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <p className="text-slate-500 dark:text-zinc-400 font-bold">
            No products match your search.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product) => {
              const isSelected = selectedIds.has(product.id || '');
              const name = product.nameEn;
              const desc = product.descEn;

              return (
                <div 
                  key={product.id}
                  onClick={() => onToggleProduct(product.id || '')}
                  className={`group relative bg-white dark:bg-zinc-900 rounded-[2rem] border-2 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer ${
                    isSelected 
                      ? 'border-[#5d51e8] ring-4 ring-[#5d51e8]/10' 
                      : 'border-slate-100 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Card Image Banner using ProductPreview molecule but styled */}
                  <div className="h-48 bg-slate-100 dark:bg-zinc-850 relative overflow-hidden flex items-center justify-center">
                    <ProductPreview
                      imageUrl={product.imageUrl}
                      name={name}
                      category={product.category}
                      className="w-full h-full rounded-none border-none shadow-none"
                    />

                    {/* Gradient Overlay for visual beauty */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80" />
                    
                    {/* Select Indicator */}
                    <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                      isSelected 
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] scale-110 shadow-lg' 
                        : 'bg-black/30 border-white/60 text-transparent group-hover:border-white'
                    }`}>
                      <Check className="w-4 h-4 stroke-[4]" />
                    </div>

                    {/* Category Label (floating) */}
                    <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl px-3 py-1 flex items-center gap-1.5 z-10">
                      {getProductIcon(product.category, "w-3.5 h-3.5")}
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-6 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug group-hover:text-[#5d51e8] transition-colors line-clamp-1">
                        {name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold line-clamp-2 leading-relaxed">
                        {desc}
                      </p>
                    </div>

                    {/* Price and Action Section */}
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {t('priceLabel')}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-slate-950 dark:text-white">
                            ₹{product.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-extrabold text-slate-400">
                            / {product.unit}
                          </span>
                        </div>
                      </div>

                      {/* Select/Selected status pill */}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all ${
                        isSelected 
                          ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/20' 
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 group-hover:bg-[#5d51e8]/10 group-hover:text-[#5d51e8]'
                      }`}>
                        {isSelected ? (lang === 'en' ? 'Selected' : 'चयनित') : (lang === 'en' ? 'Add' : 'जोड़ें')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < filteredProducts.length && (
            <div ref={sentinelRef} className="py-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#5d51e8]" />
              <p className="text-xs font-bold text-slate-400 dark:text-zinc-550">
                {lang === 'en' ? 'Loading more products...' : 'अधिक उत्पाद लोड हो रहे हैं...'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Sticky Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 shadow-2xl z-40 transition-transform duration-300 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Selected stats */}
            <div className="flex items-center gap-3">
              <div className="bg-[#5d51e8] text-white p-2.5 rounded-2xl">
                <ShoppingCart className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                  {t('selectedItems').replace('{count}', selectedIds.size.toString())}
                </h4>
                <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500">
                  {lang === 'en' ? 'Click Order to send request for selected items' : 'चयनित वस्तुओं को मंगाने के लिए नीचे आर्डर भेजें पर क्लिक करें'}
                </p>
              </div>
            </div>

            {/* Submit Options */}
            <div className="w-full md:w-auto">
              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={submittingOrder}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#5d51e8] hover:bg-[#4b3fd3] disabled:bg-indigo-300 text-white font-black text-sm py-3.5 px-8 rounded-full shadow-lg shadow-[#5d51e8]/25 active:scale-95 transition-transform cursor-pointer"
              >
                {submittingOrder ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>{t('submitOrderBtn')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
