'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Save, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Download, 
  Upload,
  Copy, 
  RefreshCw
} from 'lucide-react';
import { Product, ProductVariant } from '@/app/lib/db';

interface BatchMissingFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsList: Product[];
  onSaveBatch: (updates: { id: string; location?: string; design?: string; variants?: ProductVariant[] }[]) => Promise<void>;
  onExportCSV?: (products: Product[]) => void;
}

export function isProductMissingDesign(p: Product): boolean {
  if (p.variants && p.variants.length > 0) {
    // Missing if any active variant lacks designNo or has blank/generic name without designNo
    return p.variants.some(v => !v.isAbandoned && !v.designNo?.trim() && (!v.name?.trim() || v.name.toLowerCase().startsWith('model ')));
  }
  return false;
}

export function isProductMissingLocation(p: Product): boolean {
  if (p.variants && p.variants.length > 0) {
    // Missing if any active variant lacks location
    return p.variants.some(v => !v.isAbandoned && !v.location?.trim());
  }
  return false;
}

export function isProductIncomplete(p: Product): boolean {
  return isProductMissingDesign(p) || isProductMissingLocation(p);
}

export default function BatchMissingFieldsModal({
  isOpen,
  onClose,
  productsList,
  onSaveBatch,
  onExportCSV
}: BatchMissingFieldsModalProps) {
  const [filterType, setFilterType] = useState<'all' | 'design' | 'location'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);

  // Local draft state for batch editing: map of productId -> { location, design, variants }
  const [drafts, setDrafts] = useState<Record<string, {
    location: string;
    design: string;
    variants: ProductVariant[];
    isDirty: boolean;
  }>>({});

  // Reset drafts when modal opens or productsList changes
  React.useEffect(() => {
    if (isOpen) {
      const initialDrafts: Record<string, { location: string; design: string; variants: ProductVariant[]; isDirty: boolean }> = {};
      productsList.forEach(p => {
        if (p.id && isProductIncomplete(p)) {
          initialDrafts[p.id] = {
            location: p.location || '',
            design: p.design || '',
            variants: p.variants ? JSON.parse(JSON.stringify(p.variants)) : [],
            isDirty: false
          };
        }
      });
      setDrafts(initialDrafts);
    }
  }, [isOpen, productsList]);

  // Filter incomplete products
  const incompleteProducts = useMemo(() => {
    return productsList.filter(p => p.id && isProductIncomplete(p));
  }, [productsList]);

  const missingDesignCount = useMemo(() => {
    return productsList.filter(p => isProductMissingDesign(p)).length;
  }, [productsList]);

  const missingLocationCount = useMemo(() => {
    return productsList.filter(p => isProductMissingLocation(p)).length;
  }, [productsList]);

  // Visible filtered items
  const visibleProducts = useMemo(() => {
    let list = incompleteProducts;
    if (filterType === 'design') {
      list = list.filter(p => isProductMissingDesign(p));
    } else if (filterType === 'location') {
      list = list.filter(p => isProductMissingLocation(p));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        p.nameEn.toLowerCase().includes(q) || 
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }
    return list;
  }, [incompleteProducts, filterType, searchQuery]);

  // Dirty counter
  const dirtyCount = useMemo(() => {
    return Object.values(drafts).filter(d => d.isDirty).length;
  }, [drafts]);

  const handleProductFieldChange = (productId: string, field: 'location' | 'design', value: string) => {
    setDrafts(prev => {
      const existing = prev[productId] || {
        location: '',
        design: '',
        variants: [],
        isDirty: false
      };
      return {
        ...prev,
        [productId]: {
          ...existing,
          [field]: value,
          isDirty: true
        }
      };
    });
  };

  const handleVariantFieldChange = (productId: string, variantIdx: number, field: 'location' | 'designNo', value: string) => {
    setDrafts(prev => {
      const existing = prev[productId];
      if (!existing) return prev;
      const updatedVariants = [...existing.variants];
      if (updatedVariants[variantIdx]) {
        updatedVariants[variantIdx] = {
          ...updatedVariants[variantIdx],
          [field]: value
        };
      }
      return {
        ...prev,
        [productId]: {
          ...existing,
          variants: updatedVariants,
          isDirty: true
        }
      };
    });
  };

  const handleCopyLocationToVariants = (productId: string) => {
    const draft = drafts[productId];
    if (!draft || !draft.location) return;
    const updatedVariants = (draft.variants || []).map(v => ({
      ...v,
      location: draft.location
    }));
    setDrafts(prev => ({
      ...prev,
      [productId]: {
        ...draft,
        variants: updatedVariants,
        isDirty: true
      }
    }));
  };

  const handleAutoSequenceDesigns = (productId: string, code?: string) => {
    const draft = drafts[productId];
    if (!draft || !draft.variants || draft.variants.length === 0) return;
    const prefix = draft.design || code || 'DES';
    const updatedVariants = draft.variants.map((v, idx) => ({
      ...v,
      designNo: v.designNo?.trim() ? v.designNo : `${prefix}-${idx + 1}`
    }));
    setDrafts(prev => ({
      ...prev,
      [productId]: {
        ...draft,
        variants: updatedVariants,
        isDirty: true
      }
    }));
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleUploadFilledCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split('\n');
        if (lines.length <= 1) {
          alert("CSV file is empty.");
          return;
        }

        // Find header row
        let headerLineIdx = 0;
        while (headerLineIdx < lines.length && lines[headerLineIdx].trim().startsWith('#')) {
          headerLineIdx++;
        }
        if (headerLineIdx >= lines.length) return;

        const headers = lines[headerLineIdx]
          .replace(/^\uFEFF/, '')
          .split(',')
          .map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

        let matchedCount = 0;
        setDrafts(prevDrafts => {
          const nextDrafts = { ...prevDrafts };

          for (let i = headerLineIdx + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('#')) continue;

            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());

            const rowData: Record<string, string> = {};
            headers.forEach((h, idx) => {
              let val = values[idx] || '';
              val = val.replace(/^["']|["']$/g, '');
              rowData[h] = val;
            });

            const rowId = rowData['id'] || rowData['productid'] || '';
            const rowCode = rowData['code'] || rowData['sku'] || '';
            const rowName = rowData['nameen'] || rowData['name'] || '';
            const rowDesign = rowData['design'] || rowData['designno'] || rowData['design_no'] || '';
            const rowLoc = rowData['location'] || rowData['locationno'] || rowData['location_no'] || rowData['rack'] || '';

            // Find matching product in productsList
            const targetProd = productsList.find(p => 
              (rowId && p.id === rowId) ||
              (p.code?.trim() && rowCode.trim() && p.code.trim().toLowerCase() === rowCode.trim().toLowerCase()) ||
              (p.nameEn?.trim() && rowName.trim() && p.nameEn.trim().toLowerCase() === rowName.trim().toLowerCase())
            );

            if (targetProd && targetProd.id) {
              const currentDraft = nextDrafts[targetProd.id] || {
                location: targetProd.location || '',
                design: targetProd.design || '',
                variants: targetProd.variants ? JSON.parse(JSON.stringify(targetProd.variants)) : [],
                isDirty: false
              };

              const newLoc = rowLoc || currentDraft.location;
              const newDesign = rowDesign || currentDraft.design;
              
              const updatedVariants = currentDraft.variants.map((v, vIdx) => ({
                ...v,
                location: v.location || newLoc || '',
                designNo: v.designNo || (newDesign ? `${newDesign}-${vIdx + 1}` : v.name)
              }));

              nextDrafts[targetProd.id] = {
                location: newLoc,
                design: newDesign,
                variants: updatedVariants,
                isDirty: true
              };
              matchedCount++;
            }
          }
          return nextDrafts;
        });

        if (matchedCount > 0) {
          setUploadMessage(`✅ Loaded & matched ${matchedCount} product(s) from CSV! Review and click "Save All Changes" below.`);
          setTimeout(() => setUploadMessage(null), 8000);
        } else {
          alert("No matching products found in uploaded CSV.");
        }
      } catch (err) {
        console.error("Error reading filled CSV:", err);
        alert("Failed to parse CSV file. Please make sure it is a valid CSV.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAll = async () => {
    const dirtyIds = Object.keys(drafts).filter(id => drafts[id].isDirty);
    if (dirtyIds.length === 0) {
      alert("No changes have been made.");
      return;
    }

    const updates = dirtyIds.map(id => ({
      id,
      location: drafts[id].location.trim(),
      design: drafts[id].design.trim(),
      variants: drafts[id].variants
    }));

    setSaving(true);
    try {
      await onSaveBatch(updates);
      onClose();
    } catch (err) {
      console.error("Batch save error:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-150 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80 dark:bg-zinc-950/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Missing Design & Location Quick-Fix Workspace
              </h3>
              <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-955/30 dark:text-rose-300 rounded-full text-xs font-black border border-rose-200/60 dark:border-rose-900/50">
                {incompleteProducts.length} Items Incomplete
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold">
              Quickly fill missing Location Numbers and Design Numbers for products and variants in one place.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.tsv,.txt"
              onChange={handleUploadFilledCSV}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Upload edited CSV to populate missing fields automatically"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Filled CSV</span>
            </button>

            {onExportCSV && (
              <button
                type="button"
                onClick={() => onExportCSV(incompleteProducts)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-slate-200 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700"
                title="Download CSV containing only items with missing fields"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Incomplete CSV</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-955/30 border-b border-emerald-200 dark:border-emerald-900/50 px-6 py-2.5 flex items-center justify-between text-xs font-black text-emerald-800 dark:text-emerald-300 animate-in slide-in-from-top-2">
            <span>{uploadMessage}</span>
            <button
              type="button"
              onClick={() => setUploadMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="px-6 py-3.5 border-b border-slate-150 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filterType === 'all'
                  ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              All Incomplete ({incompleteProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('design')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filterType === 'design'
                  ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              ⚠️ Missing Design No ({missingDesignCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('location')}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                filterType === 'location'
                  ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                  : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700'
              }`}
            >
              📦 Missing Location ({missingLocationCount})
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incomplete items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
        </div>

        {/* Scrollable Products List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-zinc-950/30">
          {visibleProducts.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                No Missing Fields Found in this Filter!
              </h4>
              <p className="text-xs text-slate-400 font-bold max-w-md mx-auto">
                All catalog products in this selection have their Location Numbers and Design Numbers properly populated.
              </p>
            </div>
          ) : (
            visibleProducts.map((product) => {
              if (!product.id) return null;
              const draft = drafts[product.id] || {
                location: product.location || '',
                design: product.design || '',
                variants: product.variants || [],
                isDirty: false
              };

              const hasVariants = draft.variants && draft.variants.length > 0;
              const prodMissingDesign = !draft.design?.trim();
              const prodMissingLoc = !draft.location?.trim();

              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 space-y-4 transition-all shadow-sm ${
                    draft.isDirty 
                      ? 'border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10' 
                      : 'border-slate-200 dark:border-zinc-800'
                  }`}
                >
                  {/* Master Product Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800 flex-shrink-0">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-slate-400">
                            No Img
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {product.nameEn}
                          </h4>
                          {product.brand && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-zinc-700">
                              {product.brand}
                            </span>
                          )}
                          {draft.isDirty && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-955/50 dark:text-indigo-300 rounded border border-indigo-200 dark:border-indigo-800 animate-pulse">
                              ● Modified
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Code: <span className="text-slate-700 dark:text-slate-200 font-black">{product.code || 'N/A'}</span> | Category: {product.category}
                        </p>
                      </div>
                    </div>

                    {/* Master Actions */}
                    {hasVariants && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            const loc = prompt(`Enter Location/Rack for all designs of "${product.nameEn}":`);
                            if (loc !== null && loc.trim()) {
                              setDrafts(prev => {
                                const cur = prev[product.id!] || { location: '', design: '', variants: product.variants || [], isDirty: false };
                                const updatedVars = cur.variants.map(v => ({ ...v, location: loc.trim() }));
                                return {
                                  ...prev,
                                  [product.id!]: {
                                    ...cur,
                                    variants: updatedVars,
                                    isDirty: true
                                  }
                                };
                              });
                            }
                          }}
                          className="px-2.5 py-1.5 text-[10px] font-black bg-amber-50 hover:bg-amber-100 dark:bg-amber-955/20 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="Apply location to all designs below"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Fill All Locs</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAutoSequenceDesigns(product.id!, product.code)}
                          className="px-2.5 py-1.5 text-[10px] font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-955/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="Auto sequence missing variant designs (e.g. DES-1, DES-2...)"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Auto Designs</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Photo Variants Grid if present */}
                  {hasVariants && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <Layers className="w-3.5 h-3.5 text-[#5d51e8]" />
                        <span>Photo Variants / Models ({draft.variants.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {draft.variants.map((variant, vIdx) => {
                          const varMissingDesign = !variant.designNo?.trim() && (!variant.name?.trim() || variant.name.toLowerCase().startsWith('model '));
                          const varMissingLoc = !variant.location?.trim();

                          return (
                            <div
                              key={vIdx}
                              className={`p-2.5 rounded-xl border flex items-center gap-3 bg-slate-50/70 dark:bg-zinc-950/60 ${
                                varMissingDesign || varMissingLoc
                                  ? 'border-amber-200 dark:border-amber-900/50'
                                  : 'border-slate-150 dark:border-zinc-800'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 flex-shrink-0">
                                {(product.images?.[variant.imageIndex]?.url || product.imageUrl) ? (
                                  <img 
                                    src={product.images?.[variant.imageIndex]?.url || product.imageUrl} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">
                                    V{vIdx + 1}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div>
                                  <input
                                    type="text"
                                    placeholder={`Design No (V${vIdx + 1})`}
                                    value={variant.designNo || ''}
                                    onChange={(e) => handleVariantFieldChange(product.id!, vIdx, 'designNo', e.target.value)}
                                    className={`w-full px-2 py-1 bg-white dark:bg-zinc-900 border rounded-lg text-[11px] font-bold outline-none focus:border-[#5d51e8] text-slate-900 dark:text-white ${
                                      varMissingDesign ? 'border-rose-300 dark:border-rose-700 bg-rose-50/30' : 'border-slate-200 dark:border-zinc-750'
                                    }`}
                                  />
                                </div>

                                <div>
                                  <input
                                    type="text"
                                    placeholder={`Location (V${vIdx + 1})`}
                                    value={variant.location || ''}
                                    onChange={(e) => handleVariantFieldChange(product.id!, vIdx, 'location', e.target.value)}
                                    className={`w-full px-2 py-1 bg-white dark:bg-zinc-900 border rounded-lg text-[11px] font-bold outline-none focus:border-[#5d51e8] text-slate-900 dark:text-white ${
                                      varMissingLoc ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30' : 'border-slate-200 dark:border-zinc-750'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400">
            {dirtyCount > 0 ? (
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                {dirtyCount} product{dirtyCount > 1 ? 's' : ''} modified and ready to save
              </span>
            ) : (
              <span>No pending edits</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || dirtyCount === 0}
              className="px-5 py-2 bg-[#5d51e8] hover:bg-[#4d41d8] disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes ({dirtyCount})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
