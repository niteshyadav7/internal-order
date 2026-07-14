import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ShoppingCart, Loader2, Check, SlidersHorizontal, RotateCcw, X } from 'lucide-react';
import { Product, getPriceRange } from '../../lib/db';
import ProductPreview from '../molecules/ProductPreview';
import ProductDetailSheet from './ProductDetailSheet';

interface ClientProductGridProps {
  products: Product[];
  filteredProducts: Product[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedIds: Set<string>;
  onToggleProduct: (id: string, variantName?: string, imageUrl?: string) => void;
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

  // States for detail modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Dynamically calculate maximum price in catalog
  const absoluteMaxPrice = products.length > 0 
    ? Math.max(...products.map(p => p.price)) 
    : 150000;

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceFilter, setPriceFilter] = useState(absoluteMaxPrice);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Reset price range when products list changes
  useEffect(() => {
    if (products.length > 0) {
      setPriceFilter(Math.max(...products.map(p => p.price)));
    }
  }, [products]);

  // Combined product filtering logic
  const finalFilteredProducts = products.filter(product => {
    // 1. Search Query Filter
    const name = lang === 'en' ? product.nameEn : product.nameHi;
    const desc = lang === 'en' ? product.descEn : product.descHi;
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Category Filter
    const matchesCategory = 
      selectedCategory === 'All' || 
      product.category.toLowerCase() === selectedCategory.toLowerCase();

    // 3. Price Filter
    const matchesPrice = product.price <= priceFilter;

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Reset page limit when filters/search changes
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedCategory, priceFilter]);

  // Infinite Scroll logic via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 12, finalFilteredProducts.length));
      }
    }, {
      rootMargin: '200px',
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
  }, [finalFilteredProducts.length]);

  const paginatedProducts = finalFilteredProducts.slice(0, visibleCount);

  const handleCardClick = (product: Product) => {
    setDetailProduct(product);
    setIsDetailOpen(true);
  };

  return (
    <>
      {/* User Welcome Block & Search */}
      <div className="bg-gradient-to-br from-[#5d51e8]/10 via-[#5d51e8]/5 to-transparent border border-[#5d51e8]/15 rounded-2xl sm:rounded-3xl p-4 sm:p-8 space-y-5 sm:space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left space-y-1 sm:space-y-1.5">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-slate-905 dark:text-white leading-none">
              {lang === 'en' ? 'Welcome Back,' : 'स्वागत है,'} {profileName || (lang === 'en' ? 'Valued Partner' : 'साझेदार')} 👋
            </h2>
            <p className="text-xs sm:text-sm font-extrabold text-slate-400 dark:text-zinc-500">
              {lang === 'en' ? 'Explore and add products to your active order request below.' : 'नीचे अपनी सक्रिय ऑर्डर सूची में उत्पाद जोड़ें।'}
            </p>
          </div>
        </div>

        {/* Search & Filter Inline Wrapper */}
        <div className="flex items-center gap-2">
          {/* Main Search input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-600 outline-none focus:border-[#5d51e8] shadow-sm transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`p-3 border rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-sm transition-all cursor-pointer ${
              showFiltersPanel
                ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-[#5d51e8]/20'
                : 'bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-805 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-800'
            }`}
            title="Toggle filter controls"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">
              {showFiltersPanel ? (lang === 'en' ? 'Close Filters' : 'फ़िल्टर बंद करें') : (lang === 'en' ? 'Filters' : 'फ़िल्टर')}
            </span>
          </button>
        </div>

        {/* Expandable filter controls panel */}
        {showFiltersPanel && (
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left animate-in slide-in-from-top duration-200">
            {/* Price range filter */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-black text-slate-500 uppercase tracking-wider">
                <span>{lang === 'en' ? 'Max Budget' : 'अधिकतम मूल्य'}</span>
                <span className="text-[#5d51e8] dark:text-indigo-400">₹{priceFilter.toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min={0}
                max={absoluteMaxPrice}
                step={50}
                value={priceFilter}
                onChange={(e) => setPriceFilter(Number(e.target.value))}
                className="w-full accent-[#5d51e8] cursor-pointer"
              />
            </div>

            {/* Reset controls button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setPriceFilter(absoluteMaxPrice);
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Reset Filters' : 'फ़िल्टर रीसेट करें'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Categories scroll area */}
        <div className="pt-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            {['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty & Care', 'Furniture & Decor', 'Fitness'].map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-md shadow-[#5d51e8]/20'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:border-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  {cat !== 'All' && getProductIcon(cat, "w-3.5 h-3.5")}
                  <span>{cat === 'All' ? (lang === 'en' ? 'All Catalog' : 'सभी उत्पाद') : cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main product listings */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#5d51e8]" />
          <p className="text-xs font-bold text-slate-400 dark:text-zinc-550">
            {lang === 'en' ? 'Fetching products catalog...' : 'सामग्री सूची लोड हो रही है...'}
          </p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl">
          <p className="text-sm font-bold text-slate-400 dark:text-zinc-550">
            No products match selected filters or search.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedProducts.map((product) => {
              const isSelected = selectedIds.has(product.id || '');
              const name = product.nameEn;
              const desc = product.descEn;
              const firstImageUrl = product.images && product.images.length > 0
                ? product.images[0].url
                : product.imageUrl;

              return (
                <div 
                  key={product.id}
                  onClick={() => handleCardClick(product)}
                  className={`group relative bg-white dark:bg-zinc-900 rounded-[2rem] border-2 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer text-left ${
                    isSelected 
                      ? 'border-[#5d51e8] ring-4 ring-[#5d51e8]/10' 
                      : 'border-slate-100 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Card Image Banner using ProductPreview molecule but styled */}
                  <div className="h-48 bg-slate-100 dark:bg-zinc-850 relative overflow-hidden flex items-center justify-center">
                    <ProductPreview
                      imageUrl={firstImageUrl}
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
                    <div className="space-y-1 text-left">
                      {(product.code || product.design) && (
                        <div className="inline-flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-[#5d51e8] dark:text-indigo-300 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider mb-1 border border-indigo-100/50 dark:border-indigo-900/30">
                          Code: {product.code || 'N/A'} | Design: {product.design || 'N/A'}
                        </div>
                      )}
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-snug group-hover:text-[#5d51e8] transition-colors line-clamp-1">
                        {name}
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold line-clamp-2 leading-relaxed">
                        {desc}
                      </p>
                    </div>

                    {/* Price and Action Section */}
                    <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          {t('priceLabel')}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs sm:text-sm font-black text-slate-955 dark:text-white">
                            {getPriceRange(product.price)}
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
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-655 dark:text-zinc-300 group-hover:bg-[#5d51e8]/10 group-hover:text-[#5d51e8]'
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

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        product={detailProduct}
        isSelected={detailProduct ? selectedIds.has(detailProduct.id || '') : false}
        selectedVariantName={undefined}
        onToggleSelect={(variantName, imageUrl) => {
          if (detailProduct && detailProduct.id) {
            onToggleProduct(detailProduct.id, variantName, imageUrl);
          }
        }}
        lang={lang}
      />

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
