import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  PackageX,
  Search
} from 'lucide-react';
import { Product } from '../../lib/db';

export interface OutOfStockRowItem {
  code: string;
  designNo: string;
  location?: string;
  status: 'matched_variant' | 'matched_product' | 'not_found';
  matchedProductName?: string;
  matchedProductId?: string;
}

interface BulkOutOfStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsList: Product[];
  onConfirmOutOfStock: (rows: OutOfStockRowItem[]) => Promise<void>;
  onDownloadTemplate: () => void;
}

export default function BulkOutOfStockModal({
  isOpen,
  onClose,
  productsList,
  onConfirmOutOfStock,
  onDownloadTemplate
}: BulkOutOfStockModalProps) {
  const [parsedRows, setParsedRows] = useState<OutOfStockRowItem[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const parseTextRows = (text: string) => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return [];

    let headerLineIdx = 0;
    while (headerLineIdx < lines.length && lines[headerLineIdx].startsWith('#')) {
      headerLineIdx++;
    }
    if (headerLineIdx >= lines.length) return [];

    const delimiter = lines[headerLineIdx].includes('\t') ? '\t' : (lines[headerLineIdx].includes(';') ? ';' : ',');
    const headers = lines[headerLineIdx]
      .replace(/^\uFEFF/, '')
      .split(delimiter)
      .map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

    const records: Record<string, string>[] = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('#')) continue;

      let cols: string[] = [];
      if (delimiter === '\t') {
        cols = line.split('\t').map(c => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Parse CSV with quoted strings
        const values: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            values.push(cur.trim().replace(/^["']|["']$/g, ''));
            cur = '';
          } else {
            cur += char;
          }
        }
        values.push(cur.trim().replace(/^["']|["']$/g, ''));
        cols = values;
      }

      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rec[h] = cols[idx] || '';
      });
      records.push(rec);
    }
    return records;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setErrorMessage(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const rawRecords = parseTextRows(text);

      if (rawRecords.length === 0) {
        setErrorMessage("No valid data rows found in the uploaded file.");
        setParsedRows([]);
        return;
      }

      // Parse and match records with current products catalog
      const items: OutOfStockRowItem[] = rawRecords.map((rec) => {
        const rawCode = String(rec.code || rec.productcode || rec.sku || rec.product_code || rec['product code'] || rec['Product Code'] || '').trim();
        const rawDesign = String(rec.designno || rec.design || rec.design_no || rec.variant || rec.designcode || rec['design no'] || rec['Design No'] || '').trim();
        const rawLocation = String(rec.location || rec.locationno || rec.location_no || rec.rack || rec['location no'] || rec['Location No'] || '').trim();

        if (!rawCode && !rawDesign) {
          return {
            code: rawCode,
            designNo: rawDesign,
            location: rawLocation,
            status: 'not_found'
          };
        }

        // Find matching product in catalog
        const matchedProduct = productsList.find(p => {
          const matchCode = rawCode && p.code?.trim().toLowerCase() === rawCode.toLowerCase();
          const matchDesign = rawDesign && (
            p.design?.trim().toLowerCase() === rawDesign.toLowerCase() ||
            p.variants?.some(v => v.designNo?.trim().toLowerCase() === rawDesign.toLowerCase() || v.name?.trim().toLowerCase() === rawDesign.toLowerCase())
          );
          return matchCode || (!rawCode && matchDesign);
        });

        if (!matchedProduct) {
          return {
            code: rawCode,
            designNo: rawDesign,
            location: rawLocation,
            status: 'not_found'
          };
        }

        if (rawDesign && matchedProduct.variants && matchedProduct.variants.length > 0) {
          const hasMatchingVar = matchedProduct.variants.some(v =>
            (v.designNo?.trim().toLowerCase() === rawDesign.toLowerCase()) ||
            (v.name?.trim().toLowerCase() === rawDesign.toLowerCase())
          );
          return {
            code: rawCode || (matchedProduct.code || ''),
            designNo: rawDesign,
            location: rawLocation || matchedProduct.location,
            status: hasMatchingVar ? 'matched_variant' : 'matched_product',
            matchedProductName: matchedProduct.nameEn,
            matchedProductId: matchedProduct.id
          };
        }

        return {
          code: rawCode || (matchedProduct.code || ''),
          designNo: rawDesign,
          location: rawLocation || matchedProduct.location,
          status: 'matched_product',
          matchedProductName: matchedProduct.nameEn,
          matchedProductId: matchedProduct.id
        };
      });

      setParsedRows(items);
    } catch (err: any) {
      console.error("Failed to parse out-of-stock file:", err);
      setErrorMessage(`Error parsing file: ${err.message || String(err)}`);
    } finally {
      setIsProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleConfirm = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirmOutOfStock(parsedRows);
      onClose();
    } catch (err: any) {
      console.error("Failed to eliminate stock:", err);
      setErrorMessage(`Error updating stock: ${err.message || String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validRows = parsedRows.filter(r => r.status !== 'not_found');
  const filteredPreview = parsedRows.filter(r =>
    !searchFilter ||
    r.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
    r.designNo.toLowerCase().includes(searchFilter.toLowerCase()) ||
    (r.matchedProductName && r.matchedProductName.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl border border-rose-500/20">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Eliminate Stock / Bulk Out of Stock
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Upload CSV or Excel file to mark specific product codes & design numbers Out of Stock.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          
          {/* Instructions & Template Download */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase text-[#5d51e8] dark:text-indigo-400 tracking-wider">
                Supported Columns:
              </span>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                <code className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-[#5d51e8]">code</code>,{' '}
                <code className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-[#5d51e8]">designNo</code>,{' '}
                <code className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400">location</code>
              </p>
            </div>
            <button
              type="button"
              onClick={onDownloadTemplate}
              className="px-3.5 py-2 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-[#5d51e8]" />
              <span>Download Template</span>
            </button>
          </div>

          {/* Upload Zone */}
          <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-6 bg-slate-50/50 dark:bg-zinc-955/20 transition-all text-center group cursor-pointer">
            {isProcessingFile ? (
              <div className="flex flex-col items-center space-y-2 py-4">
                <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
                <span className="text-xs font-bold text-slate-500">Reading & matching catalog items...</span>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center space-y-2 cursor-pointer w-full py-2">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 block">
                    {fileName ? `Selected: ${fileName}` : 'Click to Upload Out-of-Stock Spreadsheet'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 mt-0.5 block">
                    Supports .CSV, .XLSX, and .XLS files
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-955/20 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold animate-in fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Rows Preview ({parsedRows.length})
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                    {validRows.length} Matched
                  </span>
                  {parsedRows.length - validRows.length > 0 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-500/20">
                      {parsedRows.length - validRows.length} Unmatched
                    </span>
                  )}
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search rows..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8]"
                  />
                </div>
              </div>

              <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-zinc-950 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-zinc-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Product Code</th>
                      <th className="py-2.5 px-3">Design No</th>
                      <th className="py-2.5 px-3">Matched Item</th>
                      <th className="py-2.5 px-3">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                    {filteredPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 font-bold">
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.code || '—'}</td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200">{row.designNo || '—'}</td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-350 truncate max-w-[150px]">
                          {row.matchedProductName || <span className="text-slate-400 font-normal">Not in catalog</span>}
                        </td>
                        <td className="py-2 px-3">
                          {row.status === 'matched_variant' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/20">
                              Mark Design Out of Stock
                            </span>
                          ) : row.status === 'matched_product' ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/20">
                              Mark Whole Product Out of Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-400 rounded-md">
                              Skipped
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/20 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 font-extrabold text-xs rounded-xl border border-slate-200 dark:border-zinc-700 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || validRows.length === 0}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Eliminating Stock...</span>
              </>
            ) : (
              <>
                <PackageX className="w-4 h-4" />
                <span>Confirm Out of Stock ({validRows.length} items)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
