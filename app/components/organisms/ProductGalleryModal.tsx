import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Product } from '../../lib/db';

interface ProductGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  initialImageIndex?: number;
}

export default function ProductGalleryModal({
  isOpen,
  onClose,
  product,
  initialImageIndex = 0
}: ProductGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialImageIndex);
    }
  }, [initialImageIndex, isOpen]);

  // Build full list of product images unconditionally
  const allImages = useMemo(() => {
    if (!product) return [];
    return product.images && product.images.length > 0
      ? product.images.map((img, i) => ({ url: img.url, label: img.label || `Photo ${i + 1}` }))
      : product.imageUrl ? [{ url: product.imageUrl, label: 'Main Photo' }] : [];
  }, [product]);

  const handlePrev = useCallback(() => {
    if (allImages.length === 0) return;
    setCurrentIndex(prev => (prev === 0 ? allImages.length - 1 : prev - 1));
  }, [allImages.length]);

  const handleNext = useCallback(() => {
    if (allImages.length === 0) return;
    setCurrentIndex(prev => (prev === allImages.length - 1 ? 0 : prev + 1));
  }, [allImages.length]);

  // Keyboard navigation (Left/Right arrows, ESC key) - Top level hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  // Early return after ALL hooks are called
  if (!isOpen || !product || allImages.length === 0) return null;

  const safeIndex = Math.min(Math.max(0, currentIndex), allImages.length - 1);
  const currentImage = allImages[safeIndex] || allImages[0];

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl w-full max-h-[95vh] flex flex-col items-center justify-between cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between p-3 bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-zinc-800 text-white mb-3 shadow-lg">
          <div className="flex items-center gap-2 min-w-0">
            {product.brand && (
              <span className="px-2.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-black uppercase rounded-lg flex-shrink-0">
                {product.brand}
              </span>
            )}
            <h3 className="text-sm sm:text-base font-black truncate text-white">{product.nameEn}</h3>
            {product.code && (
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">({product.code})</span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs font-extrabold bg-white/10 px-3 py-1 rounded-xl text-amber-300 border border-white/10">
              {safeIndex + 1} / {allImages.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
              title="Close Preview (or press ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Image Display Stage with Left/Right Arrows */}
        <div className="relative w-full h-[60vh] sm:h-[68vh] flex items-center justify-center bg-zinc-950/90 rounded-3xl border border-zinc-800/80 overflow-hidden group shadow-2xl">
          <img
            src={currentImage.url}
            alt={currentImage.label}
            className="max-w-full max-h-full object-contain transition-all duration-300 select-none"
          />

          {/* Left Arrow Button */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-[#5d51e8] text-white rounded-full transition-all cursor-pointer shadow-lg border border-white/20 hover:scale-110 active:scale-95 group-hover:opacity-100 sm:opacity-90"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Right Arrow Button */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-black/60 hover:bg-[#5d51e8] text-white rounded-full transition-all cursor-pointer shadow-lg border border-white/20 hover:scale-110 active:scale-95 group-hover:opacity-100 sm:opacity-90"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Label Overlay */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/80 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10 shadow-md">
            {currentImage.label}
          </div>
        </div>

        {/* Bottom Thumbnails Strip */}
        {allImages.length > 1 && (
          <div className="w-full flex items-center justify-center gap-2 mt-3 overflow-x-auto py-1 scrollbar-none">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                  idx === safeIndex
                    ? 'border-[#5d51e8] scale-105 shadow-md shadow-[#5d51e8]/30 ring-2 ring-[#5d51e8]/50'
                    : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
