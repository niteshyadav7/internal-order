import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, Loader2, Check, SlidersHorizontal, RotateCcw, X, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product, ProductVariant, getPriceRange } from '../../lib/db';
import ProductPreview from '../molecules/ProductPreview';
import ProductDetailSheet from './ProductDetailSheet';
import { transformImageUrl } from '../../lib/image';

// ──────────────────────────────────────────────
// ReelProductCard — single full-screen product
// Vertical scroll = next product, Horizontal swipe = next variant image
// ──────────────────────────────────────────────
function ReelProductCard({
  product,
  idx,
  totalProducts,
  isSelected,
  onToggleProduct,
  getProductIcon,
  lang,
  showFiltersPanel,
  setShowFiltersPanel,
  selectedCategory,
  searchQuery,
  priceFilter,
  absoluteMaxPrice,
}: {
  product: Product;
  idx: number;
  totalProducts: number;
  isSelected: boolean;
  onToggleProduct: (id: string, variantName?: string, imageUrl?: string) => void;
  getProductIcon: (category: string, size?: string) => React.ReactNode;
  lang: 'en' | 'hi';
  showFiltersPanel: boolean;
  setShowFiltersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCategory: string;
  searchQuery: string;
  priceFilter: number;
  absoluteMaxPrice: number;
}) {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swiping = useRef(false);

  // Build full images list
  const imagesList = product.images && product.images.length > 0
    ? product.images
    : (product.imageUrl ? [{ url: product.imageUrl, label: 'Main Image' }] : []);

  const hasMultipleImages = imagesList.length > 1;

  // Find which variant matches the current image index
  const activeVariant: ProductVariant | undefined =
    product.variants?.find(v => v.imageIndex === activeImgIdx) || undefined;

  // Touch handlers for horizontal swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swiping.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Trigger horizontal swipe if horizontal movement > vertical movement and > 30px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
      e.stopPropagation();
      if (deltaX < 0 && activeImgIdx < imagesList.length - 1) {
        // Swipe left → next image
        setActiveImgIdx(prev => prev + 1);
      } else if (deltaX > 0 && activeImgIdx > 0) {
        // Swipe right → prev image
        setActiveImgIdx(prev => prev - 1);
      }
    }
  };

  const currentImageUrl = imagesList[activeImgIdx]
    ? transformImageUrl(imagesList[activeImgIdx].url)
    : '';
  const isWeb = currentImageUrl.startsWith('http') || currentImageUrl.startsWith('https') || currentImageUrl.startsWith('data:image/');

  const handleAddToCart = () => {
    if (isSelected) {
      onToggleProduct(product.id || '');
    } else {
      const variantName = activeVariant?.name;
      const selectUrl = imagesList[activeImgIdx]?.url || product.imageUrl;
      onToggleProduct(product.id || '', variantName, selectUrl);
    }
  };

  return (
    <div
      className="relative w-full flex-shrink-0"
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-screen product image — pointer-events-none/select-none stops native drag from breaking gestures */}
      {isWeb ? (
        <img
          src={currentImageUrl}
          alt={product.nameEn}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none select-none"
          loading={idx < 3 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
          <span className="text-white/30 text-6xl font-black uppercase">{product.category}</span>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent pointer-events-none" />

      {/* ── Left Sidebar Action Buttons (like Insta likes, comments) ── */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-45 flex flex-col gap-5">
        {/* Search/Filter Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFiltersPanel(!showFiltersPanel);
          }}
          className={`w-11 h-11 rounded-full flex flex-col items-center justify-center border-2 transition-all active:scale-90 shadow-lg cursor-pointer ${
            showFiltersPanel
              ? 'bg-[#5d51e8] border-[#5d51e8] text-white shadow-[#5d51e8]/30'
              : 'bg-black/40 backdrop-blur-md border-white/15 text-white/80'
          }`}
        >
          {showFiltersPanel ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          <span className="text-[7px] font-black uppercase mt-0.5 leading-none">Filter</span>
          {/* Active filter dot */}
          {(selectedCategory !== 'All' || searchQuery || priceFilter < absoluteMaxPrice) && !showFiltersPanel && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#5d51e8] rounded-full border-2 border-black animate-pulse" />
          )}
        </button>

        {/* Select Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }}
          className={`w-11 h-11 rounded-full flex flex-col items-center justify-center border-2 transition-all cursor-pointer ${
            isSelected
              ? 'bg-[#5d51e8] text-white border-[#5d51e8] scale-110 shadow-lg shadow-[#5d51e8]/40'
              : 'bg-black/40 backdrop-blur-md border-white/15 text-white/80 hover:text-white'
          }`}
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span className="text-[7px] font-black uppercase mt-0.5 leading-none">Select</span>
        </button>
      </div>

      {/* Left/Right tap zones for image navigation */}
      {hasMultipleImages && (
        <>
          {activeImgIdx > 0 && (
            <button
              onClick={() => setActiveImgIdx(prev => prev - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          {activeImgIdx < imagesList.length - 1 && (
            <button
              onClick={() => setActiveImgIdx(prev => prev + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center text-white/70 active:scale-90 transition-transform"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </>
      )}

      {/* Active variant label — floating pill */}
      {activeVariant && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-[#5d51e8] to-[#8b5cf6] text-white text-[11px] font-black px-4 py-1.5 rounded-full shadow-lg shadow-purple-500/30 animate-in fade-in duration-200">
          {activeVariant.name}
        </div>
      )}


      {/* Bottom overlay with product info */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-5 pb-6 flex flex-col max-h-[60dvh]">
        
        {/* Scrollable product details wrapper (name, desc, variants) */}
        <div className="overflow-y-auto scrollbar-none space-y-2.5 mb-2.5 pr-1">
          {/* Category badge — vibrant color */}
          <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[#5d51e8]/40 to-[#8b5cf6]/40 backdrop-blur-md border border-[#8b5cf6]/30 text-[#c4b5fd] rounded-full px-3 py-1">
            {getProductIcon(product.category, "w-3.5 h-3.5")}
            <span className="text-[10px] font-black uppercase tracking-wider">
              {product.category}
            </span>
          </div>

          {/* Product code/design — subtle accent */}
          {(product.code || product.design) && (
            <div className="inline-flex items-center gap-1.5 bg-white/8 backdrop-blur-md text-amber-300/70 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ml-2">
              Code: {product.code || 'N/A'} | Design: {product.design || 'N/A'}
            </div>
          )}

          {/* Product Name — line-clamped to max 2 lines with responsive font */}
          <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-lg bg-gradient-to-r from-white via-white to-[#c4b5fd] bg-clip-text text-transparent line-clamp-2">
            {product.nameEn}
          </h2>

          {/* Description — soft blue tint */}
          {product.descEn && (
            <p className="text-xs font-bold text-blue-200/50 line-clamp-2 leading-relaxed max-w-[90%]">
              {product.descEn}
            </p>
          )}

          {/* Price — vibrant green accent */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 drop-shadow-md">
              {getPriceRange(product.price)}
            </span>
            <span className="text-xs font-extrabold text-emerald-400/40">
              / {product.unit}
            </span>
          </div>

          {/* Variant chips — horizontal scroll flex-nowrap to easily handle 20+ variants */}
          {product.variants && product.variants.length > 0 && (
            <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1 flex-row flex-nowrap">
              {product.variants.map((v) => {
                const isActiveVar = activeVariant?.id === v.id;
                const varImg = imagesList[v.imageIndex];
                const varImgUrl = varImg ? transformImageUrl(varImg.url) : '';
                const isVarImgWeb = varImgUrl && (varImgUrl.startsWith('http') || varImgUrl.startsWith('https') || varImgUrl.startsWith('data:image/'));

                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      if (v.imageIndex >= 0 && v.imageIndex < imagesList.length) {
                        setActiveImgIdx(v.imageIndex);
                      }
                    }}
                    className={`flex-shrink-0 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                      isActiveVar
                        ? 'w-11 h-11 rounded-full ring-2 ring-white scale-110 shadow-lg'
                        : 'w-9 h-9 rounded-full opacity-60 hover:opacity-100 border border-white/10'
                    }`}
                    title={v.name}
                  >
                    {isVarImgWeb ? (
                      <img
                        src={varImgUrl}
                        alt={v.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase">
                        {v.name}
                      </div>
                    )}
                    {/* Subtle inner border overlay */}
                    <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add to Cart button — fixed at bottom, does not slide away */}
        <button
          onClick={handleAddToCart}
          className={`w-full py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.97] flex-shrink-0 ${
            isSelected
              ? 'bg-white text-[#5d51e8] shadow-lg'
              : 'bg-gradient-to-r from-[#5d51e8] to-[#7c3aed] text-white shadow-lg shadow-[#5d51e8]/30'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-4 h-4" />
              <span>Selected{activeVariant ? ` · ${activeVariant.name}` : ''}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>Add to Cart{activeVariant ? ` · ${activeVariant.name}` : ''}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}

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

// Hook for detecting mobile viewport
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
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
  const isMobile = useIsMobile();
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

  // Mobile reels state
  const [activeReelIdx, setActiveReelIdx] = useState(0);
  const reelsContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset price range when products list changes
  useEffect(() => {
    if (products.length > 0) {
      setPriceFilter(Math.max(...products.map(p => p.price)));
    }
  }, [products]);

  // Combined product filtering logic
  const finalFilteredProducts = products.filter(product => {
    const name = lang === 'en' ? product.nameEn : product.nameHi;
    const desc = lang === 'en' ? product.descEn : product.descHi;
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' ||
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrice = product.price <= priceFilter;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Reset page limit when filters/search changes
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selectedCategory, priceFilter]);

  // Infinite Scroll logic via IntersectionObserver (desktop only)
  useEffect(() => {
    if (isMobile) return;
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
  }, [finalFilteredProducts.length, isMobile]);

  const paginatedProducts = finalFilteredProducts.slice(0, visibleCount);

  const handleCardClick = (product: Product) => {
    setDetailProduct(product);
    setIsDetailOpen(true);
  };

  // Track active reel via scroll position
  const handleReelScroll = useCallback(() => {
    const container = reelsContainerRef.current;
    if (!container) return;
    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    const idx = Math.round(scrollTop / height);
    setActiveReelIdx(Math.min(idx, finalFilteredProducts.length - 1));
  }, [finalFilteredProducts.length]);

  // Helper: get product image URL
  const getProductImageUrl = (product: Product): string => {
    if (product.images && product.images.length > 0) {
      return transformImageUrl(product.images[0].url);
    }
    return product.imageUrl ? transformImageUrl(product.imageUrl) : '';
  };

  const isWebImageUrl = (url: string) =>
    url.startsWith('http') || url.startsWith('https') || url.startsWith('data:image/');

  // ──────────────────────────────────────────────
  // MOBILE REELS VIEW
  // ──────────────────────────────────────────────
  if (isMobile) {
    if (loading) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black z-30">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <p className="text-xs font-bold text-white/60">Loading products...</p>
        </div>
      );
    }

    if (finalFilteredProducts.length === 0) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-black z-30">
          <p className="text-sm font-bold text-white/50">No products match your search.</p>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="px-4 py-2 bg-white/10 text-white text-xs font-bold rounded-full"
            >
              Clear Search
            </button>
          )}
        </div>
      );
    }

    return (
      <>
        {/* Product Counter — top right */}
        <div className="fixed top-16 right-4 z-50 bg-black/40 backdrop-blur-xl text-white text-[10px] font-black px-2.5 py-1.5 rounded-full border border-white/15 shadow-lg tabular-nums">
          {activeReelIdx + 1} / {finalFilteredProducts.length}
        </div>

        {/* ── Filter Panel (slides down on tap) ── */}
        {showFiltersPanel && (
          <div className="fixed top-28 left-3 right-3 z-50 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 p-5 space-y-4 shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200">
            
            {/* Search */}
            <div className="flex items-center gap-2.5 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
              <Search className="w-4 h-4 text-white/40 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="flex-grow bg-transparent text-white text-xs font-bold placeholder-white/30 outline-none"
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => onSearchChange('')} className="text-white/40 active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div>
              <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty & Care', 'Furniture & Decor', 'Fitness'].map((cat) => {
                  const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border ${isActive
                        ? 'bg-white text-black border-white shadow-md'
                        : 'bg-white/8 text-white/70 border-white/10 active:scale-95'
                        }`}
                    >
                      {cat !== 'All' && getProductIcon(cat, "w-3 h-3")}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price range */}
            <div className="space-y-2">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                <span className="text-white/40">Max Price</span>
                <span className="text-[#a89aff]">₹{priceFilter.toLocaleString('en-IN')}</span>
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
              <div className="flex justify-between text-[9px] font-bold text-white/20">
                <span>₹0</span>
                <span>₹{absoluteMaxPrice.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Actions row */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setPriceFilter(absoluteMaxPrice);
                  onSearchChange('');
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/60 text-[10px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => setShowFiltersPanel(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#5d51e8] text-white text-[10px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-lg shadow-[#5d51e8]/25"
              >
                <Check className="w-3 h-3" />
                <span>Apply</span>
              </button>
            </div>
          </div>
        )}

        {/* Backdrop overlay when filter is open */}
        {showFiltersPanel && (
          <div
            className="fixed inset-0 z-45 bg-black/30"
            onClick={() => setShowFiltersPanel(false)}
          />
        )}

        {/* Full-Screen Snap Scroll Container */}
        <div
          ref={reelsContainerRef}
          onScroll={handleReelScroll}
          className="fixed inset-0 overflow-y-auto z-30"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {finalFilteredProducts.map((product, idx) => (
            <ReelProductCard
              key={product.id}
              product={product}
              idx={idx}
              totalProducts={finalFilteredProducts.length}
              isSelected={selectedIds.has(product.id || '')}
              onToggleProduct={onToggleProduct}
              getProductIcon={getProductIcon}
              lang={lang}
              showFiltersPanel={showFiltersPanel}
              setShowFiltersPanel={setShowFiltersPanel}
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              priceFilter={priceFilter}
              absoluteMaxPrice={absoluteMaxPrice}
            />
          ))}
        </div>

        {/* Floating Bottom Order Bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-3 bg-black/70 backdrop-blur-xl border-t border-white/10 z-50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-[#5d51e8] text-white p-2 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white leading-tight">
                    {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={submittingOrder}
                className="flex items-center gap-2 bg-[#5d51e8] hover:bg-[#4b3fd3] disabled:bg-indigo-300 text-white font-black text-xs py-3 px-6 rounded-full shadow-lg shadow-[#5d51e8]/25 active:scale-95 transition-transform cursor-pointer"
              >
                {submittingOrder ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <span>{t('submitOrderBtn')}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ──────────────────────────────────────────────
  // DESKTOP GRID VIEW (unchanged)
  // ──────────────────────────────────────────────
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

          <button
            type="button"
            onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            className={`p-3 border rounded-2xl flex items-center justify-center gap-2 text-xs font-black shadow-sm transition-all cursor-pointer ${showFiltersPanel
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

        {showFiltersPanel && (
          <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left animate-in slide-in-from-top duration-200">
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

        <div className="pt-1.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            {['All', 'Electronics', 'Fashion', 'Home & Kitchen', 'Beauty & Care', 'Furniture & Decor', 'Fitness'].map((cat) => {
              const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border ${isActive
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
                  className={`group relative bg-white dark:bg-zinc-900 rounded-[2rem] border-2 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden cursor-pointer text-left ${isSelected
                    ? 'border-[#5d51e8] ring-4 ring-[#5d51e8]/10'
                    : 'border-slate-100 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                >
                  <div className="h-48 bg-slate-100 dark:bg-zinc-850 relative overflow-hidden flex items-center justify-center">
                    <ProductPreview
                      imageUrl={firstImageUrl}
                      name={name}
                      category={product.category}
                      className="w-full h-full rounded-none border-none shadow-none"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80" />
                    <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all z-10 ${isSelected
                      ? 'bg-[#5d51e8] text-white border-[#5d51e8] scale-110 shadow-lg'
                      : 'bg-black/30 border-white/60 text-transparent group-hover:border-white'
                      }`}>
                      <Check className="w-4 h-4 stroke-[4]" />
                    </div>
                    <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl px-3 py-1 flex items-center gap-1.5 z-10">
                      {getProductIcon(product.category, "w-3.5 h-3.5")}
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {product.category}
                      </span>
                    </div>
                  </div>

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
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full transition-all ${isSelected
                        ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/20'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-655 dark:text-zinc-300 group-hover:bg-[#5d51e8]/10 group-hover:text-[#5d51e8]'
                        }`}>
                        {isSelected ? (lang === 'en' ? 'Selected' : 'चयनित') : (lang === 'en' ? 'Add' : 'जोड़ें')}
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

      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-zinc-800 shadow-2xl z-40 transition-transform duration-300 animate-in slide-in-from-bottom duration-300">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
