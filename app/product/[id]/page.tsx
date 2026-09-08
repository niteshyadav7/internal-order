'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Share2, 
  Check, 
  Copy, 
  MessageCircle, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  Layers, 
  Tag, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  ShoppingBag, 
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { Product, ProductVariant, getProductById, getPriceRange } from '../../lib/db';
import { transformImageUrl } from '../../lib/image';
import Toast, { ToastType } from '../../components/ui/Toast';

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = params?.id ? decodeURIComponent(params.id) : '';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [activeVariant, setActiveVariant] = useState<ProductVariant | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isZoomEnabled, setIsZoomEnabled] = useState<boolean>(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({
    transform: 'scale(1)',
    transformOrigin: 'center center'
  });

  // Fetch product from Firestore
  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function loadProduct() {
      setLoading(true);
      try {
        const data = await getProductById(productId);
        if (isMounted) {
          setProduct(data);
          // Set page title for SEO & browser tab
          if (data) {
            document.title = `${data.nameEn}${data.code ? ` (${data.code})` : ''} - Balaji Textiles`;
            
            // Auto-select first active variant if available
            const inStockVariants = (data.variants || []).filter(v => !v.isAbandoned);
            if (inStockVariants.length > 0) {
              const first = inStockVariants[0];
              setActiveVariant(first);
              if (first.imageIndex >= 0 && first.imageIndex < (data.images?.length || 0)) {
                setActiveImageIdx(first.imageIndex);
              }
            }
          } else {
            document.title = 'Product Not Found - Balaji Textiles';
          }
        }
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Gallery image list
  const imagesList = useMemo(() => {
    if (!product) return [];
    if (product.images && product.images.length > 0) {
      return product.images;
    }
    if (product.imageUrl) {
      return [{ url: product.imageUrl, label: 'Main Image' }];
    }
    return [];
  }, [product]);

  // Active image URL transformed
  const activeImageUrl = useMemo(() => {
    if (!imagesList[activeImageIdx]) return '';
    return transformImageUrl(imagesList[activeImageIdx].url);
  }, [imagesList, activeImageIdx]);

  const isWebLink = activeImageUrl.startsWith('http') || 
                    activeImageUrl.startsWith('https') || 
                    activeImageUrl.startsWith('data:image/');

  // Zoom handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomEnabled) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transform: 'scale(2.2)',
      transformOrigin: `${x}% ${y}%`,
      cursor: 'zoom-in'
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transform: 'scale(1)',
      transformOrigin: 'center center'
    });
  };

  // Next / Prev image
  const nextImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIdx((prev) => (prev + 1) % imagesList.length);
  };

  const prevImage = () => {
    if (imagesList.length <= 1) return;
    setActiveImageIdx((prev) => (prev - 1 + imagesList.length) % imagesList.length);
  };

  // Variant selector
  const handleSelectVariant = (variant: ProductVariant) => {
    setActiveVariant(variant);
    if (variant.imageIndex >= 0 && variant.imageIndex < imagesList.length) {
      setActiveImageIdx(variant.imageIndex);
    }
  };

  // Share Link handler
  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareTitle = product ? `${product.nameEn} - Balaji Textiles` : 'Product Link';
    const shareText = product 
      ? `Check out ${product.nameEn}${product.code ? ` (Code: ${product.code})` : ''} at Balaji Textiles!`
      : 'Check out this product!';

    // Try native share API first (works on mobile phones for WhatsApp, Instagram, etc.)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (e) {
        // Fallback to clipboard if user dismissed share dialog or unsupported
      }
    }

    // Fallback: Copy to clipboard
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setToast({ message: 'Product link copied to clipboard!', type: 'success' });
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        setToast({ message: 'Failed to copy link', type: 'error' });
      }
    }
  };

  // WhatsApp Order / Inquiry Link
  const handleWhatsAppOrder = () => {
    if (!product) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const priceDisplay = getPriceRange(
      product.price, 
      product.priceRangePct ?? 5, 
      product.minPrice, 
      product.maxPrice
    );

    const designInfo = activeVariant 
      ? `Design: ${activeVariant.designNo || activeVariant.name}${activeVariant.location ? ` (Rack: ${activeVariant.location})` : ''}`
      : 'Standard';

    const locationInfo = activeVariant?.location || 'N/A';

    const message = `Namaste Balaji Textiles! 🙏\n\nI want to inquire/order this product:\n• *Product:* ${product.nameEn}\n• *Code:* ${product.code || 'N/A'}\n• *Selected Design:* ${designInfo}\n• *Price Range:* ${priceDisplay} / ${product.unit}\n• *Rack Location:* ${locationInfo}\n• *Product Link:* ${shareUrl}\n\nPlease share availability and ordering details.`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-16 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 flex items-center justify-between">
          <div className="w-32 h-6 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="w-24 h-8 bg-slate-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
        </div>
        {/* Content Skeleton */}
        <div className="max-w-6xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          <div className="h-96 sm:h-[480px] bg-slate-200 dark:bg-zinc-850 rounded-3xl animate-pulse" />
          <div className="space-y-4">
            <div className="w-24 h-6 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse" />
            <div className="w-3/4 h-8 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse" />
            <div className="w-1/3 h-6 bg-slate-200 dark:bg-zinc-800 rounded-md animate-pulse" />
            <div className="w-full h-32 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
            <div className="w-full h-12 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
        <header className="border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-[#5d51e8] hover:text-[#4b3fd3] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </Link>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Balaji Textiles</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl space-y-4">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Product Not Found</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
              The product link you opened might be expired, deleted, or incorrect.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black shadow-lg shadow-[#5d51e8]/25 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Balaji Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Guard for products undergoing 2-way approval
  if (product.approvalStatus && product.approvalStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
        <header className="py-4 px-6 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-[#5d51e8] hover:text-[#4b3fd3] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </Link>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Balaji Textiles</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/60 rounded-3xl p-8 shadow-xl space-y-4">
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                ⏳ Under Quality Review
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{product.nameEn}</h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-zinc-400">
              This product is currently pending 2-way verification before being released to the live store.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-2xl bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black shadow-lg shadow-[#5d51e8]/25 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Browse Live Catalog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active variants list (excluding abandoned)
  const visibleVariants = (product.variants || []).filter(v => !v.isAbandoned);
  const hasVariants = visibleVariants.length > 0;
  const isProductOutOfStock = product.inStock === false;

  const priceFormatted = getPriceRange(
    product.price, 
    product.priceRangePct ?? 5, 
    product.minPrice, 
    product.maxPrice
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-[#5d51e8]/20">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-xs font-black text-slate-700 dark:text-zinc-200 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storefront</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5d51e8] to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#5d51e8]/20 group-hover:scale-105 transition-transform">
                B
              </div>
              <div className="text-left">
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white block leading-tight">
                  Balaji Textiles
                </span>
                <span className="text-[10px] font-bold text-[#5d51e8] uppercase tracking-wider block">
                  Official Store
                </span>
              </div>
            </Link>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-black transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Share this product link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Share'}</span>
            </button>

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black transition-all shadow-md shadow-[#5d51e8]/20 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>All Products</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex-1">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-6 flex-wrap">
          <Link href="/" className="hover:text-[#5d51e8] transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-600 dark:text-slate-300">{product.category}</span>
          <span>/</span>
          <span className="text-slate-800 dark:text-white font-extrabold truncate max-w-xs">{product.nameEn}</span>
        </nav>

        {/* Amazon-style 2-Column Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* LEFT COLUMN: Photo Gallery & Zoom Box (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div 
              className="relative aspect-square sm:aspect-[4/3] w-full bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-md overflow-hidden flex items-center justify-center select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Product Image */}
              {isWebLink ? (
                <img
                  src={activeImageUrl}
                  alt={product.nameEn}
                  className="w-full h-full object-cover transition-transform duration-150 ease-out"
                  style={zoomStyle}
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex flex-col items-center justify-center text-white p-6 text-center">
                  <span className="text-5xl font-black mb-2 uppercase">{product.category.slice(0, 2)}</span>
                  <span className="text-lg font-black">{product.nameEn}</span>
                  <span className="text-xs font-bold opacity-80 mt-1">{product.category}</span>
                </div>
              )}

              {/* Floating Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <span className="px-3 py-1 rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-slate-200/80 dark:border-zinc-700/80 text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-white shadow-sm">
                  {product.category}
                </span>
                {product.brand && (
                  <span className="px-3 py-1 rounded-xl bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {product.brand}
                  </span>
                )}
              </div>

              {/* Stock Badge Overlay */}
              <div className="absolute top-4 right-4 z-10">
                {isProductOutOfStock ? (
                  <span className="px-3 py-1 rounded-xl bg-rose-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                    Out of Stock
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>In Stock</span>
                  </span>
                )}
              </div>

              {/* Zoom Button Toggle */}
              {isWebLink && (
                <button
                  type="button"
                  onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                  className={`absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-xl border shadow-md transition-all active:scale-90 cursor-pointer flex items-center gap-1.5 text-xs font-black ${
                    isZoomEnabled
                      ? 'bg-[#5d51e8] border-[#5d51e8] text-white shadow-[#5d51e8]/30'
                      : 'bg-white/90 dark:bg-zinc-800/90 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-white'
                  }`}
                  title="Toggle Zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>{isZoomEnabled ? 'Zooming' : 'Zoom'}</span>
                </button>
              )}

              {/* Previous / Next Arrow Controls */}
              {imagesList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/85 dark:bg-zinc-800/85 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-white shadow-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/85 dark:bg-zinc-800/85 hover:bg-white dark:hover:bg-zinc-800 text-slate-800 dark:text-white shadow-lg flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                    title="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Carousel Bar */}
            {imagesList.length > 1 && (
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
                {imagesList.map((img, idx) => {
                  const thumbUrl = transformImageUrl(img.url);
                  const isThumbActive = idx === activeImageIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 transition-all cursor-pointer border-2 ${
                        isThumbActive
                          ? 'border-[#5d51e8] ring-2 ring-[#5d51e8]/30 scale-105 shadow-md'
                          : 'border-slate-200 dark:border-zinc-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={thumbUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trust Badges under gallery */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200/80 dark:border-zinc-800">
              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200">100% Genuine</p>
                  <p className="text-[9px] font-bold text-slate-400">Quality Fabric</p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] flex items-center justify-center flex-shrink-0">
                  <Truck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200">Fast Dispatch</p>
                  <p className="text-[9px] font-bold text-slate-400">Pan India Transport</p>
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200">Direct Support</p>
                  <p className="text-[9px] font-bold text-slate-400">Via WhatsApp</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info, Variants & Buy Box (Cols 8-12) */}
          <div className="lg:col-span-5 space-y-6 text-left">
            
            {/* Header / Titles */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {product.code && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-black uppercase tracking-wider">
                    Code: {product.code}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {product.nameEn}
              </h1>

              {product.nameHi && (
                <h2 className="text-lg font-extrabold text-slate-500 dark:text-zinc-400">
                  {product.nameHi}
                </h2>
              )}
            </div>

            {/* Amazon-style Price Box */}
            <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#5d51e8] dark:text-indigo-400">
                  {priceFormatted}
                </span>
                <span className="text-xs font-bold text-slate-400 uppercase">
                  / {product.unit}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-zinc-500 leading-relaxed">
                Wholesale estimate. Final price may adjust according to order volume, packing, and tax invoice.
              </p>
            </div>

            {/* Amazon-style Design / Variant Selector */}
            {hasVariants && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#5d51e8]" />
                    <span>Select Design / Model</span>
                  </label>
                  {activeVariant && (
                    <span className="text-xs font-black text-[#5d51e8] bg-[#5d51e8]/10 px-2.5 py-0.5 rounded-md">
                      Selected: {activeVariant.designNo || activeVariant.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {visibleVariants.map((v) => {
                    const isSelected = activeVariant?.id === v.id;
                    const varImg = imagesList[v.imageIndex];
                    const varImgUrl = varImg ? transformImageUrl(varImg.url) : '';
                    const isVarOutOfStock = v.inStock === false;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVariant(v)}
                        className={`p-2 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 relative ${
                          isSelected
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-[#5d51e8] ring-2 ring-[#5d51e8]/20 shadow-sm'
                            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                        }`}
                      >
                        {varImgUrl ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={varImgUrl} alt={v.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {v.name.slice(0, 2)}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 truncate leading-tight">
                            {v.designNo || v.name}
                          </p>
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate">
                            Loc: {v.location || product.location || 'N/A'}
                          </p>
                          {isVarOutOfStock && (
                            <span className="text-[9px] font-black text-rose-500 uppercase block">
                              Out of Stock
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#5d51e8] text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Primary Purchasing & WhatsApp Inquiry Box */}
            <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-zinc-800 shadow-md space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                <span>Order Placement</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Instant Support</span>
              </div>

              {/* 1-Click WhatsApp Order Button */}
              <button
                type="button"
                onClick={handleWhatsAppOrder}
                className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white text-sm font-black flex items-center justify-center gap-2.5 shadow-lg shadow-[#25D366]/25 transition-all active:scale-[0.98] cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>Order / Inquire on WhatsApp</span>
              </button>

              {/* Browse Catalog or Place In-App Order */}
              <Link
                href="/"
                className="w-full py-3.5 px-6 rounded-2xl bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-[#5d51e8]/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Browse Entire Catalog / Order Online</span>
              </Link>

              {/* 1-Click Share Button */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied' : 'Copy Product Link'}</span>
                </button>
              </div>
            </div>

            {/* Description & Specifications */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Product Details & Description
              </h3>

              {product.descEn && (
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {product.descEn}
                </div>
              )}

              {product.descHi && (
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                  {product.descHi}
                </div>
              )}

              {/* Spec Table */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800 overflow-hidden text-xs">
                <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                  <div className="grid grid-cols-2 p-3">
                    <span className="font-bold text-slate-400">Category</span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">{product.category}</span>
                  </div>
                  {product.code && (
                    <div className="grid grid-cols-2 p-3">
                      <span className="font-bold text-slate-400">Product Code</span>
                      <span className="font-extrabold text-slate-800 dark:text-zinc-200">{product.code}</span>
                    </div>
                  )}
                  {product.brand && (
                    <div className="grid grid-cols-2 p-3">
                      <span className="font-bold text-slate-400">Brand</span>
                      <span className="font-extrabold text-slate-800 dark:text-zinc-200">{product.brand}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 p-3">
                    <span className="font-bold text-slate-400">Unit of Sale</span>
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">{product.unit}</span>
                  </div>
                  {hasVariants && (
                    <div className="grid grid-cols-2 p-3">
                      <span className="font-bold text-slate-400">Available Designs</span>
                      <span className="font-extrabold text-[#5d51e8] dark:text-indigo-400">
                        {visibleVariants.length} Design{visibleVariants.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Floating Sticky Mobile Buy Bar (Shown only on small screens) */}
      <div className="lg:hidden sticky bottom-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="text-left min-w-0">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block truncate">
            {activeVariant ? `Design: ${activeVariant.designNo || activeVariant.name}` : product.nameEn}
          </span>
          <span className="text-sm font-black text-[#5d51e8] dark:text-indigo-400 leading-tight block">
            {priceFormatted}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
            title="Share"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppOrder}
            className="py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>WhatsApp Order</span>
          </button>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/80 dark:border-zinc-800 py-6 px-4 bg-white dark:bg-zinc-900 text-center text-xs font-bold text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Balaji Textiles. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#5d51e8] transition-colors">Catalog</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-[#5d51e8] transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
