import React, { useState } from 'react';
import { Loader2, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { Product } from '../../lib/db';
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
  imageUrl: string;
  onImageUrlChange: (val: string) => void;
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
  imageUrl,
  onImageUrlChange,
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const compressed = await compressImage(file);
      onImageUrlChange(compressed);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress and upload image.");
    } finally {
      setIsCompressing(false);
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

          <div className="grid grid-cols-2 gap-3">
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

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400">Image Source</label>
              <select
                value={imageUrl.startsWith('data:image/') || imageUrl === 'upload-placeholder' ? 'upload' : (imageUrl.startsWith('http') ? 'custom' : imageUrl)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    onImageUrlChange('https://');
                  } else if (val === 'upload') {
                    onImageUrlChange('upload-placeholder');
                  } else {
                    onImageUrlChange(val);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800"
              >
                <option value="gradient-indigo">Indigo Theme</option>
                <option value="gradient-emerald">Emerald Theme</option>
                <option value="gradient-purple">Purple Theme</option>
                <option value="gradient-cyan">Cyan Theme</option>
                <option value="gradient-rose">Rose Theme</option>
                <option value="custom">Web Image URL</option>
                <option value="upload">Upload Local Image</option>
              </select>
            </div>
          </div>

          {imageUrl.startsWith('http') && !imageUrl.startsWith('data:image/') && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-[10px] uppercase font-black text-slate-400">Image URL</label>
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => onImageUrlChange(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-slate-55 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {(imageUrl.startsWith('data:image/') || imageUrl === 'upload-placeholder') && (
            <div className="space-y-1 animate-in fade-in duration-200">
              <label className="text-[10px] uppercase font-black text-slate-400">Upload Image</label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] dark:hover:border-[#5d51e8] rounded-2xl p-4 bg-slate-50/50 dark:bg-zinc-950/20 transition-colors relative group min-h-[140px]">
                {isCompressing ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-[#5d51e8]" />
                    <span className="text-xs font-bold text-slate-500">Compressing & optimizing image...</span>
                  </div>
                ) : imageUrl.startsWith('data:image/') ? (
                  <div className="flex flex-col items-center space-y-3 w-full">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-inner group">
                      <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => onImageUrlChange('upload-placeholder')}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white rounded-xl cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Image Ready</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        Compressed size: ~{Math.round((imageUrl.length * 3) / 4 / 1024)} KB
                      </p>
                    </div>
                    <label className="px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] rounded-lg cursor-pointer transition-all active:scale-95 border border-slate-200 dark:border-zinc-700">
                      <span>Change Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center space-y-2 cursor-pointer w-full h-full py-4">
                    <div className="p-2.5 bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-slate-500 rounded-xl group-hover:text-[#5d51e8] group-hover:bg-[#5d51e8]/5 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 block">Click to upload image</span>
                      <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">Supports JPG, PNG, WebP (auto-compressed)</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="pt-1 animate-in fade-in duration-200">
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
              disabled={saving || imageUrl === 'upload-placeholder' || isCompressing}
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
