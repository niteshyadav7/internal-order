import React, { useState } from 'react';
import { Loader2, Upload, Trash2, Plus, Images } from 'lucide-react';
import { Product, ProductImage, ProductVariant, updateGlobalSettings } from '../../lib/db';
import { compressImage } from '../../lib/image';

interface ProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  nameEn: string;
  onNameEnChange: (val: string) => void;
  descEn: string;
  onDescEnChange: (val: string) => void;
  price: string;
  onPriceChange: (val: string) => void;
  unit: string;
  onUnitChange: (val: string) => void;
  category: string;
  onCategoryChange: (val: string) => void;
  categoriesList: string[];
  images: ProductImage[];
  onImagesChange: (val: ProductImage[]) => void;
  variants: ProductVariant[];
  onVariantsChange: (val: ProductVariant[]) => void;
  inStock: boolean;
  onInStockChange: (val: boolean) => void;
  code: string;
  onCodeChange: (val: string) => void;
  design: string;
  onDesignChange: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  priceRangePct: string;
  onPriceRangePctChange: (val: string) => void;
  minPrice: string;
  onMinPriceChange: (val: string) => void;
  maxPrice: string;
  onMaxPriceChange: (val: string) => void;
}

export default function ProductEditModal({
  isOpen,
  onClose,
  product,
  nameEn,
  onNameEnChange,
  descEn,
  onDescEnChange,
  price,
  onPriceChange,
  unit,
  onUnitChange,
  category,
  onCategoryChange,
  categoriesList = [],
  images,
  onImagesChange,
  variants,
  onVariantsChange,
  inStock,
  onInStockChange,
  code,
  onCodeChange,
  design,
  onDesignChange,
  onSave,
  saving,
  priceRangePct,
  onPriceRangePctChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange
}: ProductEditModalProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Automatically sync variants with uploaded images
  React.useEffect(() => {
    if (!isOpen) return;
    const autoVariants = images.map((_, idx) => ({
      id: `v_auto_${idx}_${Date.now()}`,
      name: `Model ${idx + 1}`,
      imageIndex: idx
    }));
    // Check if current variants differ from auto-generated list
    const needsUpdate = variants.length !== autoVariants.length ||
      variants.some((v, idx) => v.imageIndex !== idx || v.name !== `Model ${idx + 1}`);
    if (needsUpdate) {
      onVariantsChange(autoVariants);
    }
  }, [images, variants, onVariantsChange, isOpen]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const newImages = [...images];
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        newImages.push({ url: compressed, label: `Image ${newImages.length + 1}` });
      }
      onImagesChange(newImages);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress and upload image.");
    } finally {
      setIsCompressing(false);
      // Reset input element
      e.target.value = '';
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-lg w-full rounded-3xl sm:rounded-[2.2rem] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto scrollbar-none">
        
        {/* Header */}
        <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
          <h3 className="text-xl font-black text-slate-900 dark:text-white leading-none">
            Edit Product Item
          </h3>
          <p className="text-xs font-semibold text-slate-400 dark:text-zinc-550">
            Modify catalog details for {product.nameEn}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSave} className="space-y-6 mt-4">
          
          {/* STEP 1: Product Basics */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#5d51e8] text-white text-[9px] font-black">1</span>
              <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Product Basics</h4>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Product Name</label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => onNameEnChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Description</label>
              <textarea
                value={descEn}
                onChange={(e) => onDescEnChange(e.target.value)}
                className="w-full h-16 px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 resize-none scrollbar-none"
              />
            </div>
            <div>
              {isAddingCustom ? (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] uppercase font-black text-slate-400">Custom Category Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Textiles, Toys..."
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      className="flex-grow px-3 py-1.5 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const cat = customInput.trim();
                        if (!cat) return;
                        if (categoriesList.map(c => c.toLowerCase()).includes(cat.toLowerCase())) {
                          onCategoryChange(categoriesList.find(c => c.toLowerCase() === cat.toLowerCase()) || cat);
                          setIsAddingCustom(false);
                          setCustomInput('');
                          return;
                        }
                        const updated = [...categoriesList, cat];
                        try {
                          await updateGlobalSettings({ categories: updated });
                          categoriesList.push(cat);
                          onCategoryChange(cat);
                          setCustomInput('');
                          setIsAddingCustom(false);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-3 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black rounded-xl cursor-pointer shadow transition-all"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(false)}
                      className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 text-xs font-black rounded-xl cursor-pointer transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] uppercase font-black text-slate-400">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsAddingCustom(true)}
                      className="text-[9px] text-[#5d51e8] font-black hover:underline cursor-pointer"
                    >
                      + New Category
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => onCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Pricing & B2B Range */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#5d51e8] text-white text-[9px] font-black">2</span>
              <h4 className="text-[10px] font-black text-slate-805 dark:text-slate-200 uppercase tracking-wider">Pricing & B2B Range</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400">Price (INR)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400">Unit</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => onUnitChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
                {/* Quick Unit select chips */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Mtr', 'Pcs', 'Kg', 'Box', 'Set', 'Yard', 'Trip'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => onUnitChange(u)}
                      className={`px-1.5 py-0.5 text-[8px] font-black rounded border transition-all cursor-pointer ${
                        unit === u 
                          ? 'bg-[#5d51e8] text-white border-[#5d51e8]' 
                          : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Price Range & Variance Options */}
            <div className="p-3 bg-slate-50/50 dark:bg-zinc-955/10 border border-slate-200/60 dark:border-zinc-850 rounded-xl space-y-3">
              <div className="space-y-0.5">
                <h4 className="text-[10px] uppercase font-black text-slate-450">
                  B2B Price Range Setup (Optional)
                </h4>
                <p className="text-[9px] text-slate-400 font-bold leading-normal">
                  Set custom variance % or absolute Min/Max bounds. Otherwise, defaults to global ±5%.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-405">Variance (%)</label>
                  <input
                    type="number"
                    value={priceRangePct}
                    onChange={(e) => {
                      onPriceRangePctChange(e.target.value);
                      if (e.target.value) {
                        onMinPriceChange('');
                        onMaxPriceChange('');
                      }
                    }}
                    placeholder="e.g. 10"
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-805 dark:text-slate-105"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-405">Min Price</label>
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => {
                      onMinPriceChange(e.target.value);
                      if (e.target.value) onPriceRangePctChange('');
                    }}
                    placeholder="Min override"
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-805 dark:text-slate-105"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-405">Max Price</label>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => {
                      onMaxPriceChange(e.target.value);
                      if (e.target.value) onPriceRangePctChange('');
                    }}
                    placeholder="Max override"
                    className="w-full px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-805 dark:text-slate-105"
                  />
                </div>
              </div>

              {/* Dynamic Sliders bounded around the original base price */}
              {(() => {
                const base = parseFloat(price);
                if (isNaN(base) || base <= 0) return null;

                const minLimit = Math.floor(base * 0.5);
                const maxLimit = Math.ceil(base * 1.5);
                const currentMin = parseFloat(minPrice) || base;
                const currentMax = parseFloat(maxPrice) || base;

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-200/50 dark:border-zinc-800/60">
                    <span className="text-[10px] font-black text-slate-450 uppercase block">Interactive Range Adjusters</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                          <span>Min Price: ₹{currentMin}</span>
                          <span>Limit: ₹{minLimit} - ₹{base}</span>
                        </div>
                        <input
                          type="range"
                          min={minLimit}
                          max={base}
                          value={currentMin}
                          onChange={(e) => {
                            onMinPriceChange(e.target.value);
                            onPriceRangePctChange('');
                          }}
                          className="w-full accent-[#5d51e8] h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                          <span>Max Price: ₹{currentMax}</span>
                          <span>Limit: ₹{base} - ₹{maxLimit}</span>
                        </div>
                        <input
                          type="range"
                          min={base}
                          max={maxLimit}
                          value={currentMax}
                          onChange={(e) => {
                            onMaxPriceChange(e.target.value);
                            onPriceRangePctChange('');
                          }}
                          className="w-full accent-[#5d51e8] h-1 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Live storefront price range preview */}
              {(() => {
                const basePrice = parseFloat(price);
                if (isNaN(basePrice) || basePrice <= 0) return null;

                const minVal = parseFloat(minPrice);
                const maxVal = parseFloat(maxPrice);
                const u = unit || 'Unit';

                let displayRange = '';
                let reason = '';

                if (!isNaN(minVal) && !isNaN(maxVal) && minVal > 0 && maxVal > 0) {
                  displayRange = `₹${minVal.toLocaleString('en-IN')} - ₹${maxVal.toLocaleString('en-IN')}`;
                  reason = 'Custom Min/Max overrides';
                } else {
                  const pct = parseFloat(priceRangePct);
                  const finalPct = !isNaN(pct) && pct >= 0 && pct <= 100 ? pct : 5;
                  const factor = finalPct / 100;
                  const minCalculated = Math.floor(basePrice * (1 - factor));
                  const maxCalculated = Math.ceil(basePrice * (1 + factor));
                  displayRange = `₹${minCalculated.toLocaleString('en-IN')} - ₹${maxCalculated.toLocaleString('en-IN')}`;
                  reason = !isNaN(pct) ? `Custom ±${finalPct}% variance` : `Global default ±${finalPct}%`;
                }

                return (
                  <div className="mt-2 p-2 bg-emerald-50/50 dark:bg-emerald-955/10 border border-emerald-200/60 dark:border-emerald-900/35 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                    <div className="text-left">
                      <span className="text-[8px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">Live Price Range Preview</span>
                      <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">{displayRange} <span className="text-[9px] font-bold text-slate-400">/ {u}</span></span>
                    </div>
                    <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {reason}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* STEP 3: Catalog Codes */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#5d51e8] text-white text-[9px] font-black">3</span>
              <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Catalog Codes & Stock</h4>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400">Product Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-400">Design Identifier</label>
                <input
                  type="text"
                  required
                  value={design}
                  onChange={(e) => onDesignChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="pt-1">
              <label className="flex items-center justify-between border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 bg-slate-50 dark:bg-zinc-950/20 cursor-pointer w-full">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-350">In Stock Available</span>
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(e) => onInStockChange(e.target.checked)}
                  className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-300 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* STEP 4: Media & Variants */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-4 text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-zinc-800/80">
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#5d51e8] text-white text-[9px] font-black">4</span>
              <h4 className="text-[10px] font-black text-slate-805 dark:text-slate-200 uppercase tracking-wider">Product Media & Variants</h4>
            </div>

            {/* Multi-Image Section */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-slate-405 flex items-center gap-1.5">
                <Images className="w-3.5 h-3.5 text-[#5d51e8]" />
                Product Images ({images.length})
              </label>

              {/* Uploaded Images Grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 p-2 bg-slate-50/50 dark:bg-zinc-955/10 border border-slate-200 dark:border-zinc-800 rounded-xl">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group flex flex-col items-center gap-1 p-1 border border-slate-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-lg animate-in zoom-in-95 duration-200">
                      <div className="relative w-full aspect-square rounded overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm">
                        <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                        
                        {/* Action: remove image */}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = images.filter((_, i) => i !== idx);
                            onImagesChange(updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` })));
                          }}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-red-650 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                          title="Delete Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Cover photo indicator/swap action */}
                        {idx === 0 ? (
                          <span className="absolute bottom-0.5 left-0.5 bg-emerald-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow-sm border border-emerald-400">
                            ⭐ Cover
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...images];
                              const selected = updated[idx];
                              updated.splice(idx, 1);
                              updated.unshift(selected);
                              onImagesChange(updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` })));
                            }}
                            className="absolute bottom-0.5 left-0.5 bg-black/65 hover:bg-[#5d51e8] text-white text-[7px] font-black uppercase px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-white/10"
                          >
                            Set Cover
                          </button>
                        )}
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase truncate max-w-full px-0.5">{img.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Zone */}
              {true && (
                <div className="space-y-2">
                  <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] dark:hover:border-[#5d51e8] rounded-xl p-3 bg-slate-50/50 dark:bg-zinc-950/20 transition-colors group">
                    {isCompressing ? (
                      <div className="flex flex-col items-center space-y-1 py-1">
                        <Loader2 className="w-5 h-5 animate-spin text-[#5d51e8]" />
                        <span className="text-[10px] font-bold text-slate-500">Compressing...</span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center space-y-1 cursor-pointer w-full py-1">
                        <div className="p-1 bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-slate-500 rounded-lg group-hover:text-[#5d51e8] group-hover:bg-[#5d51e8]/5 transition-colors">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-center">
                          <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-350 block">Upload more images</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* URL Paste Input */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Or paste image URL here..."
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      className="flex-grow px-3 py-2 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 placeholder-slate-450"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (imageUrlInput.trim()) {
                          onImagesChange([
                            ...images,
                            { url: imageUrlInput.trim(), label: `Image ${images.length + 1}` }
                          ]);
                          setImageUrlInput('');
                        }
                      }}
                      className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-[#5d51e8] dark:text-indigo-300 font-black text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/40 cursor-pointer transition-all active:scale-95"
                    >
                      Add URL
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Variants Section */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1">
                  Variants / Models ({variants.length})
                </label>
              </div>

              {variants.length > 0 && (
                <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-450">
                    Variants (Models) are automatically generated for each uploaded image. Clients will select the model by swiping/viewing the corresponding photo.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {variants.map((variant, idx) => {
                      const img = images[variant.imageIndex];
                      return (
                        <div key={variant.id} className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg">
                          {img && (
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-slate-200 dark:border-zinc-800">
                              <img src={img.url} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-black text-slate-800 dark:text-white">{variant.name}</p>
                            <p className="text-[8px] font-bold text-slate-405">Photo {idx + 1}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs py-3 px-4 rounded-full border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isCompressing}
              className="w-full bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-xs py-3 px-4 rounded-full shadow-md shadow-[#5d51e8]/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
