import React, { useState, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { Product, ProductVariant, getPriceRange } from '../../lib/db';
import { transformImageUrl } from '../../lib/image';

interface ProductDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  selectedIds: Set<string>;
  selectedVariantName?: string;
  onToggleSelect: (variantName?: string, imageUrl?: string) => void;
  lang: 'en' | 'hi';
  priceRangePct?: number;
}

export default function ProductDetailSheet({
  isOpen,
  onClose,
  product,
  selectedIds,
  selectedVariantName,
  onToggleSelect,
  lang,
  priceRangePct = 5
}: ProductDetailSheetProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);

  // Reset indices on opening/changing product
  useEffect(() => {
    if (product) {
      setActiveImageIdx(0);
      
      // Auto-select first variant if variants exist
      if (product.variants && product.variants.length > 0) {
        // If already selected, select that, otherwise select first
        const matched = product.variants.find(v => v.name === selectedVariantName);
        const targetVariant = matched || product.variants[0];
        setActiveVariant(targetVariant);
        if (targetVariant.imageIndex < (product.images?.length || 0)) {
          setActiveImageIdx(targetVariant.imageIndex);
        }
      } else {
        setActiveVariant(null);
      }
    }
  }, [product, isOpen, selectedVariantName]);

  // Derive selection state from the active variant key
  const isSelected = product ? selectedIds.has((product.id || '') + '|' + (activeVariant?.name || '')) : false;

  if (!isOpen || !product) return null;

  const imagesList = product.images && product.images.length > 0
    ? product.images
    : (product.imageUrl ? [{ url: product.imageUrl, label: 'Main Image' }] : []);

  const hasMultipleImages = imagesList.length > 1;

  const nextImage = () => {
    setActiveImageIdx((prev) => (prev + 1) % imagesList.length);
  };

  const prevImage = () => {
    setActiveImageIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setActiveVariant(variant);
    if (variant.imageIndex >= 0 && variant.imageIndex < imagesList.length) {
      setActiveImageIdx(variant.imageIndex);
    }
  };

  const handleActionClick = () => {
    const variantName = activeVariant ? activeVariant.name : undefined;
    const selectUrl = imagesList[activeImageIdx] ? imagesList[activeImageIdx].url : product.imageUrl;
    onToggleSelect(variantName, selectUrl);
    onClose();
  };

  const activeImageUrl = imagesList[activeImageIdx] ? transformImageUrl(imagesList[activeImageIdx].url) : '';
  const isWebLink = activeImageUrl.startsWith('http') || activeImageUrl.startsWith('https') || activeImageUrl.startsWith('data:image/');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-0 md:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Sheet / Modal Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 md:zoom-in-95 max-h-[90vh] md:max-h-[85vh] flex flex-col">
        {/* Header drag bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
          <div className="w-12 h-1 bg-slate-200 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-md transition-colors cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-grow pb-8">
          {/* Gallery Carousel Section */}
          <div className="relative h-64 sm:h-80 bg-slate-100 dark:bg-zinc-950 flex items-center justify-center overflow-hidden flex-shrink-0">
            {isWebLink ? (
              <img 
                src={activeImageUrl} 
                alt={product.nameEn} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="text-white text-lg font-black uppercase tracking-wider">{product.category}</span>
              </div>
            )}
            
            {/* Gallery Navigation Overlay */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 hover:bg-black/55 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Indicator Dots */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-2.5 py-1 rounded-full">
                {imagesList.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === activeImageIdx ? 'bg-white scale-125' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Category label */}
            <div className="absolute top-4 left-4 bg-white/25 backdrop-blur-md border border-white/20 text-white rounded-xl px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              {product.category}
            </div>
          </div>

          {/* Details Content */}
          <div className="p-6 space-y-5">
            <div className="space-y-1.5 text-left">
              {(product.code || product.design) && (
                <div className="inline-flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/20 text-[#5d51e8] dark:text-indigo-300 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100/50 dark:border-indigo-900/30">
                  Code: {product.code || 'N/A'} | Design: {product.design || 'N/A'}
                </div>
              )}
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {product.nameEn}
              </h2>
              <div className="flex items-baseline gap-1 pt-1">
                <span className="text-lg font-black text-[#5d51e8] dark:text-indigo-400">
                  {getPriceRange(product.price, product.priceRangePct !== undefined ? product.priceRangePct : priceRangePct, (product as any).minPrice, (product as any).maxPrice)}
                </span>
                <span className="text-xs font-extrabold text-slate-400">
                  / {product.unit}
                </span>
              </div>
            </div>

            {/* Description */}
            {product.descEn && (
              <div className="space-y-1.5 text-left">
                <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400">Description</h4>
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 leading-relaxed">
                  {product.descEn}
                </p>
              </div>
            )}

            {/* Variant / Model Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-2.5 text-left">
                <div className="flex justify-between items-baseline">
                  <h4 className="text-[10px] uppercase font-black tracking-wider text-slate-400">Choose Model/Type</h4>
                  {activeVariant && (
                    <span className="text-[10px] font-black text-[#5d51e8] bg-[#5d51e8]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {activeVariant.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.variants.map((v) => {
                    const isVarSelected = activeVariant?.id === v.id;
                    const varImg = imagesList[v.imageIndex];
                    const varImgUrl = varImg ? transformImageUrl(varImg.url) : '';
                    const isVarImgWeb = varImgUrl && (varImgUrl.startsWith('http') || varImgUrl.startsWith('https') || varImgUrl.startsWith('data:image/'));

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleVariantSelect(v)}
                        className={`flex-shrink-0 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                          isVarSelected
                            ? 'w-11 h-11 rounded-full ring-2 ring-[#5d51e8] scale-110 shadow-lg'
                            : 'w-9 h-9 rounded-full opacity-60 hover:opacity-100 border border-slate-200 dark:border-zinc-800'
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
                        <div className="absolute inset-0 rounded-full border border-black/5 pointer-events-none" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/60 flex-shrink-0 flex items-center justify-between gap-4">
          <div className="text-left">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Total Price</span>
            <p className="text-base font-black text-slate-900 dark:text-white leading-none mt-0.5">
              {getPriceRange(product.price, product.priceRangePct !== undefined ? product.priceRangePct : priceRangePct, (product as any).minPrice, (product as any).maxPrice)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleActionClick}
            className={`flex-grow sm:flex-grow-0 px-6 py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.97] ${
              isSelected
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50'
                : 'bg-[#5d51e8] hover:bg-[#4b3fd3] text-white shadow-lg shadow-[#5d51e8]/20'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4" />
                <span>Remove{activeVariant ? ` · ${activeVariant.name}` : ''}</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Add{activeVariant ? ` · ${activeVariant.name}` : ''} to Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
