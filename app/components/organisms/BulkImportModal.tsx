'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Plus, 
  Images, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  AlertTriangle,
  Database,
  Search,
  Maximize2,
  MoveRight,
  Filter,
  Sparkles,
  Link,
  Unlink,
  GripVertical
} from 'lucide-react';
import { ProductImage, ProductVariant } from '../../lib/db';
import { compressImage } from '../../lib/image';
import { uploadImageToStorage } from '../../lib/storage';
import Button from '../atoms/Button';

export interface StagedProductItem {
  tempId: string;
  nameEn: string;
  nameHi?: string;
  descEn: string;
  descHi?: string;
  price: number;
  unit: string;
  category: string;
  code: string;       // Product Code / SKU
  design: string;     // Design Identifier
  priceRangePct?: number;
  minPrice?: number;
  maxPrice?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  selectedCoverIndex?: number;
}

export interface UploadedPhotoPoolItem {
  id: string;
  url: string;
  fileName: string;
  assignedProductTempId: string | null; // null if unassigned, or tempId of assigned product
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoriesList: string[];
  onImportComplete: (stagedItems: StagedProductItem[]) => Promise<void>;
  onDownloadTemplate: () => void;
  parseCSV: (text: string) => any[];
  existingProductsList?: any[];
}

export default function BulkImportModal({
  isOpen,
  onClose,
  categoriesList,
  onImportComplete,
  onDownloadTemplate,
  parseCSV,
  existingProductsList = []
}: BulkImportModalProps) {
  // Step state: 1 = Upload Spreadsheet, 2 = Bulk Upload Images, 3 = Full Desktop Linker, 4 = Review & Import
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Staged data
  const [stagedProducts, setStagedProducts] = useState<StagedProductItem[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number>(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');

  // Photo Pool state (Tracks all uploaded photos, assigned vs unassigned)
  const [photoPool, setPhotoPool] = useState<UploadedPhotoPoolItem[]>([]);
  const [photoFilterTab, setPhotoFilterTab] = useState<'unassigned' | 'all' | 'assigned'>('unassigned');
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');

  // Uploading state
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Dragging state
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // Large Image Viewer Overlay state
  const [activeFullImage, setActiveFullImage] = useState<string | null>(null);

  // Final Submit state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setStagedProducts([]);
      setSelectedProductIndex(0);
      setPhotoPool([]);
      setPhotoFilterTab('unassigned');
      setIsProcessingPhotos(false);
      setIsImporting(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle CSV file selection
  const handleSpreadsheetFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const rawRecords = parseCSV(text);
        if (!rawRecords || rawRecords.length === 0) {
          setErrorMessage("No product records found in the uploaded file. Please check the template formatting.");
          return;
        }

        const items: StagedProductItem[] = rawRecords.map((rec, idx) => {
          const nameEn = rec.nameEn || rec.name || `Product ${idx + 1}`;
          const priceVal = parseFloat(rec.price);
          const price = isNaN(priceVal) ? 0 : priceVal;
          const unit = rec.unit || 'Pcs';
          const category = rec.category || (categoriesList[0] || 'Electronics');
          const code = rec.code || rec.sku || `SKU-${100 + idx}`;
          const design = rec.design || rec.designCode || `DES-${100 + idx}`;
          const descEn = rec.descEn || rec.description || '';

          // Parse initial CSV image URLs if provided
          let images: ProductImage[] = [];
          if (rec.images) {
            const list = String(rec.images).split(';').map(u => u.trim()).filter(Boolean);
            images = list.map((url, i) => ({ url, label: `Image ${i + 1}` }));
          } else if (rec.imageUrl || rec.image) {
            images = [{ url: String(rec.imageUrl || rec.image).trim(), label: 'Image 1' }];
          }

          // Parse initial CSV variants if provided
          let variants: ProductVariant[] = [];
          if (rec.variants) {
            const vList = String(rec.variants).split(';').map(v => v.trim()).filter(Boolean);
            variants = vList.map(v => {
              const parts = v.split(':');
              return {
                id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: parts[0].trim(),
                imageIndex: parts[1] ? parseInt(parts[1].trim()) || 0 : 0
              };
            });
          } else {
            // Auto build variants from images
            variants = images.map((_, i) => ({
              id: `v_auto_${i}_${Date.now()}`,
              name: `Model ${i + 1}`,
              imageIndex: i
            }));
          }

          return {
            tempId: `staged_${Date.now()}_${idx}`,
            nameEn,
            nameHi: nameEn,
            descEn,
            descHi: descEn,
            price,
            unit,
            category,
            code,
            design,
            priceRangePct: rec.priceRangePct ? parseFloat(rec.priceRangePct) : undefined,
            minPrice: rec.minPrice ? parseFloat(rec.minPrice) : undefined,
            maxPrice: rec.maxPrice ? parseFloat(rec.maxPrice) : undefined,
            images,
            variants,
            selectedCoverIndex: 0
          };
        });

        setStagedProducts(items);
        setCurrentStep(2);
      } catch (err: any) {
        console.error("Failed to parse spreadsheet:", err);
        setErrorMessage("Error reading spreadsheet file. Ensure it is a valid CSV formatted file.");
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Handle Bulk Photos Selection
  const handleBulkPhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    setPhotoUploadProgress({ current: 0, total: files.length });

    try {
      const newPoolItems: UploadedPhotoPoolItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setPhotoUploadProgress({ current: i + 1, total: files.length });
        
        // Compress photo locally
        const compressedBlob = await compressImage(file);
        // Upload to Firebase Storage
        const storageUrl = await uploadImageToStorage(compressedBlob, file.name);

        const photoId = `photo_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;
        newPoolItems.push({
          id: photoId,
          url: storageUrl,
          fileName: file.name,
          assignedProductTempId: null
        });
      }

      // Auto Match photos by Product Code or Filename if possible
      setStagedProducts(prevStaged => {
        const updatedProducts = [...prevStaged];

        newPoolItems.forEach(photo => {
          const lowerName = photo.fileName.toLowerCase();
          
          // Match by Code or Design
          const matchedProd = updatedProducts.find(p => 
            (p.code.trim() && lowerName.includes(p.code.toLowerCase().trim())) ||
            (p.design.trim() && lowerName.includes(p.design.toLowerCase().trim()))
          );

          if (matchedProd) {
            photo.assignedProductTempId = matchedProd.tempId;
            const nextIdx = matchedProd.images.length;
            matchedProd.images.push({
              url: photo.url,
              label: `Image ${nextIdx + 1}`
            });
            matchedProd.variants.push({
              id: `v_auto_${nextIdx}_${Date.now()}`,
              name: matchedProd.design ? `${matchedProd.design}-${nextIdx + 1}` : `Model ${nextIdx + 1}`,
              imageIndex: nextIdx
            });
          }
        });

        return updatedProducts;
      });

      setPhotoPool(prev => [...prev, ...newPoolItems]);

    } catch (err: any) {
      console.error("Bulk photos processing error:", err);
      setErrorMessage("Failed to upload some product photos. Please try again.");
    } finally {
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  // Assign a photo from pool to a staged product by product tempId
  const assignPhotoToProduct = (photoId: string, productTempId: string) => {
    const photo = photoPool.find(p => p.id === photoId);
    if (!photo) return;

    // First unassign from previous product if assigned
    if (photo.assignedProductTempId) {
      unassignPhotoFromProduct(photoId);
    }

    setPhotoPool(prev => prev.map(p => p.id === photoId ? { ...p, assignedProductTempId: productTempId } : p));

    setStagedProducts(prev => {
      const updated = [...prev];
      const targetIdx = updated.findIndex(p => p.tempId === productTempId);
      if (targetIdx === -1) return prev;

      const item = { ...updated[targetIdx] };
      const imgIdx = item.images.length;

      // Add image if not already present
      if (!item.images.some(img => img.url === photo.url)) {
        item.images = [...item.images, { url: photo.url, label: `Image ${imgIdx + 1}` }];
        item.variants = [
          ...item.variants,
          {
            id: `v_auto_${imgIdx}_${Date.now()}`,
            name: item.design ? `${item.design}-${imgIdx + 1}` : `Model ${imgIdx + 1}`,
            imageIndex: imgIdx
          }
        ];
      }

      updated[targetIdx] = item;
      return updated;
    });
  };

  // Unassign a photo from its product and return to pool
  const unassignPhotoFromProduct = (photoId: string) => {
    const photo = photoPool.find(p => p.id === photoId);
    if (!photo || !photo.assignedProductTempId) return;

    const oldProductTempId = photo.assignedProductTempId;

    // Mark photo as unassigned in pool
    setPhotoPool(prev => prev.map(p => p.id === photoId ? { ...p, assignedProductTempId: null } : p));

    // Remove photo URL from old staged product
    setStagedProducts(prev => {
      const updated = [...prev];
      const targetIdx = updated.findIndex(p => p.tempId === oldProductTempId);
      if (targetIdx === -1) return prev;

      const item = { ...updated[targetIdx] };
      item.images = item.images.filter(img => img.url !== photo.url).map((img, i) => ({ ...img, label: `Image ${i + 1}` }));
      item.variants = item.images.map((_, i) => ({
        id: item.variants[i]?.id || `v_auto_${i}_${Date.now()}`,
        name: item.variants[i]?.name || (item.design ? `${item.design}-${i + 1}` : `Model ${i + 1}`),
        imageIndex: i
      }));

      updated[targetIdx] = item;
      return updated;
    });
  };

  // Delete a photo completely from pool and products
  const deletePhotoFromPool = (photoId: string) => {
    const photo = photoPool.find(p => p.id === photoId);
    if (!photo) return;

    if (photo.assignedProductTempId) {
      unassignPhotoFromProduct(photoId);
    }
    setPhotoPool(prev => prev.filter(p => p.id !== photoId));
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, photoId: string) => {
    setDraggedPhotoId(photoId);
    e.dataTransfer.setData('text/plain', photoId);
  };

  const handleDragOver = (e: React.DragEvent, targetTempId: string) => {
    e.preventDefault();
    setDragOverTargetId(targetTempId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTargetId(null);
  };

  const handleDropOnProduct = (e: React.DragEvent, targetTempId: string) => {
    e.preventDefault();
    setDragOverTargetId(null);
    const photoId = e.dataTransfer.getData('text/plain') || draggedPhotoId;
    if (photoId) {
      assignPhotoToProduct(photoId, targetTempId);
      setDraggedPhotoId(null);
    }
  };

  // Update a field for a staged product item
  const updateStagedProduct = (index: number, updates: Partial<StagedProductItem>) => {
    setStagedProducts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Add an image directly to a selected staged product via direct file select
  const handleAddImageToProduct = async (productIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentProd = stagedProducts[productIndex];
    if (!currentProd) return;

    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        const storageUrl = await uploadImageToStorage(compressed, files[i].name);

        const photoId = `photo_direct_${Date.now()}_${i}`;
        const newPoolItem: UploadedPhotoPoolItem = {
          id: photoId,
          url: storageUrl,
          fileName: files[i].name,
          assignedProductTempId: currentProd.tempId
        };

        setPhotoPool(prev => [...prev, newPoolItem]);

        setStagedProducts(prev => {
          const updated = [...prev];
          const item = { ...updated[productIndex] };
          const imgIdx = item.images.length;
          
          item.images = [...item.images, { url: storageUrl, label: `Image ${imgIdx + 1}` }];
          item.variants = [
            ...item.variants,
            {
              id: `v_auto_${imgIdx}_${Date.now()}`,
              name: item.design ? `${item.design}-${imgIdx + 1}` : `Model ${imgIdx + 1}`,
              imageIndex: imgIdx
            }
          ];
          updated[productIndex] = item;
          return updated;
        });
      }
    } catch (err) {
      console.error("Error adding product image:", err);
      alert("Failed to upload image.");
    } finally {
      e.target.value = '';
    }
  };

  // Set Cover Image for a staged product
  const handleSetCoverImage = (productIndex: number, imageIndex: number) => {
    setStagedProducts(prev => {
      const updated = [...prev];
      const item = { ...updated[productIndex] };

      if (imageIndex > 0 && imageIndex < item.images.length) {
        const reordered = [...item.images];
        const selected = reordered[imageIndex];
        reordered.splice(imageIndex, 1);
        reordered.unshift(selected);

        item.images = reordered.map((img, i) => ({ ...img, label: `Image ${i + 1}` }));
        item.variants = reordered.map((_, i) => ({
          id: `v_auto_${i}_${Date.now()}`,
          name: item.design ? `${item.design}-${i + 1}` : `Model ${i + 1}`,
          imageIndex: i
        }));
      }

      updated[productIndex] = item;
      return updated;
    });
  };

  // Final Submit Handler
  const handleFinalSubmit = async () => {
    if (stagedProducts.length === 0) return;
    setIsImporting(true);
    setErrorMessage(null);
    setImportProgress({ current: 0, total: stagedProducts.length });

    try {
      await onImportComplete(stagedProducts);
      onClose();
    } catch (err: any) {
      console.error("Failed to commit staged products:", err);
      setErrorMessage(`Error importing catalog: ${err?.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  const currentProduct = stagedProducts[selectedProductIndex] || null;

  const filteredStagedProducts = stagedProducts.filter(p => {
    const q = productSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.nameEn.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.design.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const filteredPhotosPool = photoPool.filter(photo => {
    if (photoFilterTab === 'unassigned') return photo.assignedProductTempId === null;
    if (photoFilterTab === 'assigned') return photo.assignedProductTempId !== null;
    return true;
  }).filter(photo => {
    const q = photoSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return photo.fileName.toLowerCase().includes(q);
  });

  const unassignedPhotoCount = photoPool.filter(p => p.assignedProductTempId === null).length;
  const assignedPhotoCount = photoPool.filter(p => p.assignedProductTempId !== null).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-between animate-in fade-in duration-200 font-sans">
      
      {/* FULL SCREEN HEADER */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#5d51e8]/10 text-[#5d51e8] rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              Bulk Catalog Workspace
              <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#5d51e8]/10 text-[#5d51e8] border border-[#5d51e8]/20">
                Desktop Staging & Linker
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-semibold">
              Import Excel/CSV, upload photos, drag & drop link to products, set model codes & verify
            </p>
          </div>
        </div>

        {/* STEPPER PILLS */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-zinc-850 p-1.5 rounded-2xl border border-slate-200/60 dark:border-zinc-800">
          {[
            { id: 1, label: '1. Spreadsheet' },
            { id: 2, label: `2. Bulk Photos (${photoPool.length})` },
            { id: 3, label: '3. Drag & Drop Linker' },
            { id: 4, label: '4. Confirm & Import' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => stagedProducts.length > 0 && setCurrentStep(s.id as any)}
              disabled={stagedProducts.length === 0 && s.id > 1}
              className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                currentStep === s.id
                  ? 'bg-[#5d51e8] text-white shadow-sm'
                  : currentStep > s.id
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ERROR MESSAGE ALERT BANNER */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-955/40 border-b border-rose-200 dark:border-rose-900/60 px-6 py-3 flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 font-black">Dismiss</button>
        </div>
      )}

      {/* STEP 1: SPREADSHEET UPLOAD & INITIAL STAGING TABLE */}
      {currentStep === 1 && (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-200">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Upload Catalog Spreadsheet</h3>
            <p className="text-xs text-slate-400 font-semibold">
              Upload a `.csv` or `.xlsx` file containing product names, pricing, units, SKU codes, and design identifiers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto items-stretch">
            
            {/* Download Template Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-5 flex flex-col justify-between shadow-md hover:shadow-lg transition-all">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#5d51e8]/10 text-[#5d51e8] flex items-center justify-center font-bold">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Download Sample Template</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Download our ready-to-use CSV template pre-filled with hints for Product Code, Design ID, Pricing, and Category.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onDownloadTemplate}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-2xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 active:scale-95"
              >
                <Database className="w-4 h-4 text-[#5d51e8]" />
                <span>Download Sample Template</span>
              </button>
            </div>

            {/* Upload File Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-[#5d51e8] hover:border-[#4b3fd3] rounded-3xl p-6 space-y-5 flex flex-col justify-between shadow-md hover:shadow-lg transition-all text-center group cursor-pointer">
              <label className="flex flex-col justify-between h-full cursor-pointer space-y-4">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#5d51e8] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Upload Catalog File</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Select `.csv` or `.xlsx` spreadsheet file from your device to begin staging.
                    </p>
                  </div>
                </div>

                <div className="w-full py-3 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 group-hover:shadow-indigo-500/20 active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>Select CSV / Excel File</span>
                </div>
                
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleSpreadsheetFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: BULK PHOTOS UPLOAD & VISUAL PHOTO GALLERY POOL */}
      {currentStep === 2 && (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Step 2: Upload Bulk Product Photos ({photoPool.length} Photos in Pool)
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Staged <strong className="text-slate-700 dark:text-slate-200">{stagedProducts.length} products</strong> from your spreadsheet. Select multiple photos to upload into the workspace pool.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-black text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                Back
              </button>
              <Button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 flex items-center gap-2"
              >
                <span>Proceed to Drag & Drop Linker</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* BULK UPLOADER CARD */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] rounded-2xl p-6 bg-slate-50/50 dark:bg-zinc-955/20 text-center transition-colors">
              {isProcessingPhotos ? (
                <div className="flex flex-col items-center space-y-3 py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-[#5d51e8]" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Compressing & uploading photos ({photoUploadProgress.current} / {photoUploadProgress.total})...
                  </span>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center space-y-2 cursor-pointer py-4">
                  <div className="p-3 bg-[#5d51e8]/10 text-[#5d51e8] rounded-2xl">
                    <Images className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">Select Multiple Product Photos</span>
                    <span className="text-xs text-slate-400 font-medium block mt-0.5">JPG, PNG, WebP • Smart Auto-Matched by Product SKU / Design Code in filename</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleBulkPhotosChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* LIVE VISUAL PHOTO POOL GRID IN STEP 2 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Images className="w-4 h-4 text-[#5d51e8]" />
                  Uploaded Photos Pool ({photoPool.length})
                </h4>
                <div className="flex items-center gap-2 text-[10px] font-extrabold">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
                    {assignedPhotoCount} Auto-Linked
                  </span>
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                    {unassignedPhotoCount} Unassigned (Ready for Linker)
                  </span>
                </div>
              </div>

              {photoPool.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center text-xs font-semibold text-slate-400">
                  No photos uploaded yet. Select product photos above to add them to your pool.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {photoPool.map((photo) => {
                    const assignedProd = stagedProducts.find(p => p.tempId === photo.assignedProductTempId);

                    return (
                      <div
                        key={photo.id}
                        className={`relative group bg-slate-50 dark:bg-zinc-950 border rounded-2xl p-2 space-y-2 transition-all ${
                          photo.assignedProductTempId
                            ? 'border-emerald-300 dark:border-emerald-900/60'
                            : 'border-amber-300 dark:border-amber-900/60'
                        }`}
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => deletePhotoFromPool(photo.id)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-0.5 text-left">
                          <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate" title={photo.fileName}>
                            {photo.fileName}
                          </p>
                          {assignedProd ? (
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
                              <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
                              <span>{assignedProd.code || assignedProd.nameEn}</span>
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 block truncate">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: DESKTOP DRAG & DROP IMAGE & MODEL LINKER WORKSPACE */}
      {currentStep === 3 && (
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-slate-100 dark:bg-zinc-950 animate-in fade-in duration-200">
          
          {/* LEFT SIDEBAR: STAGED PRODUCTS LIST (DROP TARGETS) */}
          <div className="w-full md:w-80 lg:w-96 bg-white dark:bg-zinc-900 border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between flex-shrink-0">
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Staged Products ({stagedProducts.length})</h3>
                <span className="text-[10px] font-black bg-indigo-50 dark:bg-indigo-950 text-[#5d51e8] px-2.5 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                  Drop Targets
                </span>
              </div>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code, design, name..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* PRODUCT CARDS LIST WITH DROP HANDLERS */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredStagedProducts.map((prod) => {
                const actualIndex = stagedProducts.findIndex(p => p.tempId === prod.tempId);
                const isSelected = actualIndex === selectedProductIndex;
                const isDragOver = dragOverTargetId === prod.tempId;

                return (
                  <div
                    key={prod.tempId}
                    onClick={() => setSelectedProductIndex(actualIndex)}
                    onDragOver={(e) => handleDragOver(e, prod.tempId)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDropOnProduct(e, prod.tempId)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isDragOver
                        ? 'bg-emerald-50 dark:bg-emerald-955/30 border-2 border-emerald-500 shadow-md scale-[1.02]'
                        : isSelected
                        ? 'bg-[#5d51e8]/10 border-[#5d51e8] shadow-sm'
                        : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">{prod.nameEn}</span>
                        {existingProductsList.some(p => p.code?.trim() && p.code.trim().toLowerCase() === prod.code.trim().toLowerCase()) && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Updates Existing
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#5d51e8] dark:text-indigo-400 mt-0.5">
                        <span>Code: {prod.code || 'N/A'}</span>
                        <span>•</span>
                        <span>Design: {prod.design || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full ${
                        prod.images.length > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}>
                        {prod.images.length} Photos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* WORKSPACE SIDEBAR FOOTER */}
            <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
              <Button
                onClick={() => setCurrentStep(4)}
                className="w-full py-2.5 flex items-center justify-center gap-2"
              >
                <span>Proceed to Review & Import</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* RIGHT CENTER WORKSPACE: PHOTO POOL TRAY & ACTIVE PRODUCT CANVAS */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">

            {/* TOP PHOTO POOL TRAY (DRAGGABLE PHOTOS & 1-CLICK LINK) */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#5d51e8]/10 text-[#5d51e8] rounded-xl">
                    <Images className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      Uploaded Photos Tray ({photoPool.length})
                      <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        {unassignedPhotoCount} Unassigned
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Drag photo onto any product on left, or click "+ Link" to assign to current active product.
                    </p>
                  </div>
                </div>

                {/* FILTER TABS */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-850 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                  {[
                    { key: 'unassigned', label: `Unassigned (${unassignedPhotoCount})` },
                    { key: 'all', label: `All (${photoPool.length})` },
                    { key: 'assigned', label: `Linked (${assignedPhotoCount})` }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setPhotoFilterTab(tab.key as any)}
                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        photoFilterTab === tab.key
                          ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* HORIZONTAL / GRID DRAGGABLE PHOTO CARDS */}
              {filteredPhotosPool.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl text-center text-xs font-bold text-slate-400">
                  No photos found in this filter tab.
                </div>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {filteredPhotosPool.map((photo) => {
                    const assignedProd = stagedProducts.find(p => p.tempId === photo.assignedProductTempId);

                    return (
                      <div
                        key={photo.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, photo.id)}
                        className={`relative flex-shrink-0 w-36 bg-slate-50 dark:bg-zinc-950 border rounded-2xl p-2 space-y-2 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                          photo.assignedProductTempId
                            ? 'border-emerald-300 dark:border-emerald-900/60'
                            : 'border-amber-300 dark:border-amber-900/60'
                        }`}
                      >
                        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 group">
                          <img src={photo.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                          <div className="absolute top-1 left-1 p-1 bg-black/50 text-white rounded-md text-[8px] font-black flex items-center gap-1">
                            <GripVertical className="w-2.5 h-2.5" />
                            Drag
                          </div>
                        </div>

                        <div className="space-y-1 text-left">
                          <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate" title={photo.fileName}>
                            {photo.fileName}
                          </p>

                          {assignedProd ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 truncate">
                                ✓ {assignedProd.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => unassignPhotoFromProduct(photo.id)}
                                className="text-[8px] text-rose-500 font-bold hover:underline cursor-pointer"
                              >
                                Unlink
                              </button>
                            </div>
                          ) : (
                            currentProduct && (
                              <button
                                type="button"
                                onClick={() => assignPhotoToProduct(photo.id, currentProduct.tempId)}
                                className="w-full py-1 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-[9px] font-black rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Link to Active</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* MAIN CENTER ACTIVE PRODUCT CANVAS */}
            {currentProduct ? (
              <div
                onDragOver={(e) => handleDragOver(e, currentProduct.tempId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnProduct(e, currentProduct.tempId)}
                className={`bg-white dark:bg-zinc-900 border rounded-3xl p-6 space-y-6 shadow-sm flex-1 transition-all ${
                  dragOverTargetId === currentProduct.tempId
                    ? 'border-2 border-emerald-500 bg-emerald-50/20 shadow-lg'
                    : 'border-slate-200 dark:border-zinc-800'
                }`}
              >
                
                {/* ACTIVE PRODUCT HEADER & EDITABLE FIELDS */}
                <div className="space-y-4 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-[#5d51e8]">Active Selected Product</span>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">{currentProduct.nameEn}</h3>
                    </div>

                    <label className="px-4 py-2 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Upload Photos to {currentProduct.code || currentProduct.nameEn}</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleAddImageToProduct(selectedProductIndex, e)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Product Name</label>
                      <input
                        type="text"
                        value={currentProduct.nameEn}
                        onChange={(e) => updateStagedProduct(selectedProductIndex, { nameEn: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Product Code (SKU)</label>
                      <input
                        type="text"
                        value={currentProduct.code}
                        onChange={(e) => updateStagedProduct(selectedProductIndex, { code: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Design Code</label>
                      <input
                        type="text"
                        value={currentProduct.design}
                        onChange={(e) => updateStagedProduct(selectedProductIndex, { design: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase text-slate-400">Price (INR)</label>
                      <input
                        type="number"
                        value={currentProduct.price}
                        onChange={(e) => updateStagedProduct(selectedProductIndex, { price: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                      />
                    </div>
                  </div>
                </div>

                {/* LINKED PHOTOS GALLERY FOR ACTIVE PRODUCT */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Images className="w-4 h-4 text-[#5d51e8]" />
                      Linked Photos & Model Codes ({currentProduct.images.length})
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold">
                      Drag photos from top tray into this box to link!
                    </span>
                  </div>

                  {currentProduct.images.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3 bg-slate-50/50 dark:bg-zinc-955/10">
                      <Images className="w-8 h-8 mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">No photos linked to this product yet.</p>
                      <p className="text-[10px] font-semibold text-[#5d51e8]">
                        Drag photos from the tray above and drop them here, or click "+ Link to Active" on any photo!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentProduct.images.map((img, imgIdx) => {
                        const variant = currentProduct.variants[imgIdx];
                        const isCover = imgIdx === 0;

                        // Find corresponding photo pool item
                        const poolItem = photoPool.find(p => p.url === img.url);

                        return (
                          <div
                            key={imgIdx}
                            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3 space-y-3 animate-in zoom-in-95 duration-200"
                          >
                            <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 group bg-slate-100">
                              <img src={img.url} alt="" className="w-full h-full object-cover" />

                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveFullImage(img.url)}
                                  className="p-2 bg-white text-slate-800 rounded-xl hover:bg-slate-100 transition-colors shadow"
                                  title="View Large"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                                {poolItem && (
                                  <button
                                    type="button"
                                    onClick={() => unassignPhotoFromProduct(poolItem.id)}
                                    className="p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors shadow flex items-center gap-1 text-[10px] font-bold"
                                    title="Unlink Photo back to Pool"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {isCover ? (
                                <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded shadow">
                                  ⭐ Cover Photo
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetCoverImage(selectedProductIndex, imgIdx)}
                                  className="absolute top-2 left-2 bg-black/60 hover:bg-[#5d51e8] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded transition-colors"
                                >
                                  Set as Cover
                                </button>
                              )}
                            </div>

                            <div className="space-y-1.5 text-left">
                              <label className="text-[9px] font-black uppercase text-slate-400">Model / Variant Name</label>
                              <input
                                type="text"
                                value={variant?.name || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStagedProducts(prev => {
                                    const updated = [...prev];
                                    const item = { ...updated[selectedProductIndex] };
                                    const vList = [...item.variants];
                                    vList[imgIdx] = {
                                      id: vList[imgIdx]?.id || `v_${Date.now()}_${imgIdx}`,
                                      name: val,
                                      imageIndex: imgIdx
                                    };
                                    item.variants = vList;
                                    updated[selectedProductIndex] = item;
                                    return updated;
                                  });
                                }}
                                placeholder={currentProduct.design ? `${currentProduct.design}-${imgIdx + 1}` : `Model ${imgIdx + 1}`}
                                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-slate-400 font-extrabold text-sm">
                Select a staged product from the left sidebar to view & edit photos.
              </div>
            )}

          </div>
        </div>
      )}

      {/* STEP 4: CONFIRM & BATCH IMPORT SUMMARY */}
      {currentStep === 4 && (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Ready to Import Catalog</h3>
            <p className="text-xs text-slate-400 font-semibold max-w-md mx-auto">
              Review summary of staged items before committing to Firestore database catalog.
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-md">
            
            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-zinc-955 border border-slate-200/80 dark:border-zinc-800 rounded-2xl text-center space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Total Products</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{stagedProducts.length}</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-955 border border-slate-200/80 dark:border-zinc-800 rounded-2xl text-center space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Total Linked Images</span>
                <p className="text-2xl font-black text-[#5d51e8]">
                  {stagedProducts.reduce((acc, p) => acc + p.images.length, 0)}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-955 border border-slate-200/80 dark:border-zinc-800 rounded-2xl text-center space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Total Model Variants</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {stagedProducts.reduce((acc, p) => acc + p.variants.length, 0)}
                </p>
              </div>
            </div>

            {/* IMPORT PROGRESS BAR */}
            {isImporting && (
              <div className="space-y-2 p-4 bg-indigo-50 dark:bg-indigo-955/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl animate-pulse">
                <div className="flex justify-between text-xs font-black text-[#5d51e8]">
                  <span>Importing catalog products into Firestore...</span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#5d51e8] h-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / Math.max(importProgress.total, 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* ACTIONS */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                disabled={isImporting}
                className="px-5 py-2.5 text-xs font-black text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                Back to Image Linker
              </button>

              <Button
                onClick={handleFinalSubmit}
                disabled={isImporting || stagedProducts.length === 0}
                className="px-8 py-3 text-sm font-black flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Import All {stagedProducts.length} Products</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* LARGE FULL IMAGE MODAL PREVIEW OVERLAY */}
      {activeFullImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
          onClick={() => setActiveFullImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={activeFullImage} alt="" className="max-w-full max-h-[85vh] object-contain" />
            <button
              onClick={() => setActiveFullImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
