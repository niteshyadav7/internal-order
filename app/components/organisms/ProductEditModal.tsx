import React, { useState } from 'react';
import { Loader2, Upload, Trash2, Plus, Images } from 'lucide-react';
import { Product, ProductImage, ProductVariant } from '../../lib/db';
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
  saving
}: ProductEditModalProps) {
  const [isCompressing, setIsCompressing] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

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
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-md w-full rounded-3xl sm:rounded-[2.2rem] p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        
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
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-400">Product Name</label>
            <input
              type="text"
              required
              value={nameEn}
              onChange={(e) => onNameEnChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
            />
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

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-400">Description</label>
            <textarea
              value={descEn}
              onChange={(e) => onDescEnChange(e.target.value)}
              className="w-full h-16 px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Price (INR)</label>
              <input
                type="number"
                required
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
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
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-black text-slate-400">Category</label>
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800"
            >
              <option value="Electronics">Electronics</option>
              <option value="Fashion">Fashion</option>
              <option value="Home & Kitchen">Home & Kitchen</option>
              <option value="Beauty & Care">Beauty & Care</option>
              <option value="Furniture & Decor">Furniture & Decor</option>
              <option value="Fitness">Fitness</option>
            </select>
          </div>

          {/* Multi-Image Upload Section */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1.5">
              <Images className="w-3 h-3" />
              Product Images ({images.length}/8)
            </label>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2.5 p-2 bg-slate-50 dark:bg-zinc-955/20 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group flex flex-col items-center gap-1">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700 shadow-sm">
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = images.filter((_, i) => i !== idx);
                          onImagesChange(updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` })));
                        }}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="text-[8px] font-black text-slate-400 uppercase">{img.label}</span>
                  </div>
                ))}
              </div>
            )}

            {images.length < 8 && (
              <div className="space-y-2.5">
                <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] dark:hover:border-[#5d51e8] rounded-2xl p-3 bg-slate-50/50 dark:bg-zinc-950/20 transition-colors group">
                  {isCompressing ? (
                    <div className="flex flex-col items-center space-y-1.5 py-1">
                      <Loader2 className="w-6 h-6 animate-spin text-[#5d51e8]" />
                      <span className="text-[10px] font-bold text-slate-500">Compressing...</span>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center space-y-1 cursor-pointer w-full py-1">
                      <div className="p-1.5 bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-slate-500 rounded-lg group-hover:text-[#5d51e8] group-hover:bg-[#5d51e8]/5 transition-colors">
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
                    className="flex-grow px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 placeholder-slate-450"
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
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-[#5d51e8] dark:text-indigo-300 font-black text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/40 cursor-pointer transition-all active:scale-95"
                  >
                    Add URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Variants Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-black text-slate-400">
                Variants / Models ({variants.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  onVariantsChange([...variants, {
                    id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    name: '',
                    imageIndex: 0
                  }]);
                }}
                className="flex items-center gap-1 text-[10px] font-black text-[#5d51e8] hover:text-[#4b3fd3] cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Variant
              </button>
            </div>

            {variants.length > 0 && (
              <div className="space-y-2 p-2 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-2xl max-h-[160px] overflow-y-auto">
                {variants.map((variant, idx) => (
                  <div key={variant.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const updated = variants.map((v, i) => i === idx ? { ...v, name: e.target.value } : v);
                        onVariantsChange(updated);
                      }}
                      placeholder={`e.g. Model-${String.fromCharCode(65 + idx)}, Red`}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                    />
                    <select
                      value={variant.imageIndex}
                      onChange={(e) => {
                        const updated = variants.map((v, i) => i === idx ? { ...v, imageIndex: parseInt(e.target.value) } : v);
                        onVariantsChange(updated);
                      }}
                      className="w-24 px-2 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-850 dark:text-slate-150"
                    >
                      {images.length > 0 ? (
                        images.map((img, imgIdx) => (
                          <option key={imgIdx} value={imgIdx}>{img.label}</option>
                        ))
                      ) : (
                        <option value={0}>No images</option>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        onVariantsChange(variants.filter((_, i) => i !== idx));
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-center justify-between border border-slate-200 dark:border-zinc-800 rounded-xl p-3 bg-slate-50 dark:bg-zinc-950/20 cursor-pointer w-full">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-350">In Stock Available</span>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => onInStockChange(e.target.checked)}
                className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-300 rounded cursor-pointer"
              />
            </label>
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
