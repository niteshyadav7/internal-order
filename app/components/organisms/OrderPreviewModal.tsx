import React from 'react';
import { X, Trash2, ShoppingCart, ArrowRight, Loader2, Package } from 'lucide-react';
import { Product, getPriceRange } from '../../lib/db';
import { transformImageUrl } from '../../lib/image';

export interface OrderPreviewItem {
  cartKey: string;
  product: Product;
  variantName?: string;
  imageUrl?: string;
}

interface OrderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderPreviewItem[];
  onRemoveItem: (cartKey: string) => void;
  onConfirmOrder: () => void;
  submittingOrder: boolean;
  lang: 'en' | 'hi';
  priceRangePct?: number;
}

export default function OrderPreviewModal({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onConfirmOrder,
  submittingOrder,
  lang,
  priceRangePct = 5,
}: OrderPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-zinc-950 dark:bg-zinc-950 border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#5d51e8]/20 text-[#8176ff] border border-[#5d51e8]/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                {lang === 'en' ? 'Order Request Preview' : 'ऑर्डर विवरण पूर्वावलोकन'}
              </h3>
              <p className="text-xs font-semibold text-white/50">
                {items.length} {lang === 'en' ? 'item(s) selected for inquiry' : 'वस्तुएं चयनित हैं'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Close preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-3.5 divide-y divide-white/5">
          {items.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Package className="w-12 h-12 text-white/20 mx-auto" />
              <p className="text-sm font-bold text-white/40">
                {lang === 'en' ? 'No items in preview.' : 'पूर्वावलोकन में कोई वस्तु नहीं है।'}
              </p>
            </div>
          ) : (
            items.map(({ cartKey, product, variantName, imageUrl }) => {
              const displayImage = transformImageUrl(imageUrl || product.imageUrl || '');
              const name = lang === 'hi' && product.nameHi ? product.nameHi : product.nameEn;
              const priceDisplay = getPriceRange(
                product.price,
                product.priceRangePct !== undefined ? product.priceRangePct : priceRangePct,
                (product as any).minPrice,
                (product as any).maxPrice
              );

              return (
                <div key={cartKey} className="pt-3.5 first:pt-0 flex items-center justify-between gap-3 sm:gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden flex-shrink-0 relative">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-black uppercase">
                        {product.category}
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-grow min-w-0 space-y-1 text-left">
                    {(product.code || product.design) && (
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black uppercase tracking-wider">
                        {product.code && `Code: ${product.code}`} {product.design && `| Design: ${product.design}`}
                      </div>
                    )}
                    <h4 className="font-extrabold text-xs sm:text-sm text-white truncate leading-tight">
                      {name}
                    </h4>
                    {variantName && (
                      <p className="text-[11px] font-bold text-amber-300/90 truncate">
                        Variant: <span className="text-white">{variantName}</span>
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-[11px] font-black text-indigo-400">
                      <span>{priceDisplay}</span>
                      <span className="text-white/40 text-[9px] font-semibold">/ {product.unit}</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(cartKey)}
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all cursor-pointer flex-shrink-0 active:scale-95"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-zinc-900/80 backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between text-xs font-extrabold text-white/60">
            <span>{lang === 'en' ? 'Total Selected Products:' : 'कुल चयनित उत्पाद:'}</span>
            <span className="text-white font-black text-sm">{items.length}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-extrabold transition-all cursor-pointer active:scale-95"
            >
              {lang === 'en' ? 'Add More Items' : 'और उत्पाद जोड़ें'}
            </button>

            <button
              type="button"
              onClick={onConfirmOrder}
              disabled={submittingOrder || items.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-gradient-to-r from-[#5d51e8] to-[#4b3fd3] hover:from-[#4b3fd3] hover:to-[#3b2fc3] disabled:opacity-50 text-white text-xs font-black shadow-lg shadow-[#5d51e8]/30 transition-all cursor-pointer active:scale-95"
            >
              {submittingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{lang === 'en' ? 'Submitting...' : 'भेजा जा रहा है...'}</span>
                </>
              ) : (
                <>
                  <span>{lang === 'en' ? 'Confirm & Submit Order' : 'ऑर्डर सबमिट करें'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
