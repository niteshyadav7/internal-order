import React, { useState } from 'react';
import { Edit2, Trash2, Database, Upload, ArrowUp, ArrowDown, Loader2, ToggleLeft, ToggleRight, Eye, Download, Calendar, Filter, PackageX, Sparkles, AlertTriangle, RotateCcw, Layers, ChevronDown, ChevronUp, Share2, Check, ShieldCheck, Clock } from 'lucide-react';
import { Product } from '../../lib/db';
import { isProductMissingDesign, isProductMissingLocation, isProductIncomplete } from './BatchMissingFieldsModal';
import Loader from '../atoms/Loader';
import SearchInput from '../molecules/SearchInput';
import ProductPreview from '../molecules/ProductPreview';
import Pagination from '../molecules/Pagination';

function formatDateTime(isoString?: string) {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'N/A';
  }
}

interface ProductsTableProps {
  products: Product[];
  allProductsList: Product[]; // Unfiltered list to show empty states correctly
  loading: boolean;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedProductIds: string[];
  onSelectAllProducts: (checked: boolean) => void;
  onSelectProduct: (id: string, checked: boolean) => void;
  onSort: (field: 'nameEn' | 'price' | 'category' | 'createdAt') => void;
  sortField: 'nameEn' | 'price' | 'category' | 'createdAt';
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBatchDeleteProducts: () => void;
  onSeedCatalog: () => void;
  seedingCatalog: boolean;
  onDownloadCSVTemplate: () => void;
  onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV?: (selectedOnly?: boolean) => void;
  onOpenOutOfStockModal?: () => void;
  onOpenMissingFieldsModal?: () => void;
  onToggleStock?: (product: Product) => void;
  onOpenBulkWorkspace?: () => void;
  onPreviewProductGallery?: (product: Product) => void;
  dateFilter?: 'all' | 'today' | '7days' | '30days' | 'custom';
  onDateFilterChange?: (filter: 'all' | 'today' | '7days' | '30days' | 'custom') => void;
  dataFilter?: 'all' | 'missing-design' | 'missing-location' | 'incomplete' | 'abandoned' | 'pending-approval';
  onDataFilterChange?: (filter: 'all' | 'missing-design' | 'missing-location' | 'incomplete' | 'abandoned' | 'pending-approval') => void;
  missingDesignCount?: number;
  missingLocationCount?: number;
  incompleteCount?: number;
  abandonedCount?: number;
  pendingApprovalCount?: number;
  onOpenApprovalModal?: (product: Product) => void;
  onRestoreProduct?: (product: Product) => void;
  onRestoreVariant?: (product: Product, variantIndex: number) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
}

export default function ProductsTable({
  products,
  allProductsList,
  loading,
  searchQuery,
  onSearchChange,
  selectedProductIds,
  onSelectAllProducts,
  onSelectProduct,
  onSort,
  sortField,
  sortDirection,
  currentPage,
  pageSize,
  totalPages,
  totalItems,
  onPageChange,
  onPageSizeChange,
  onEditProduct,
  onDeleteProduct,
  onBatchDeleteProducts,
  onSeedCatalog,
  seedingCatalog,
  onDownloadCSVTemplate,
  onCSVUpload,
  onExportCSV,
  onOpenOutOfStockModal,
  onOpenMissingFieldsModal,
  onToggleStock,
  onOpenBulkWorkspace,
  onPreviewProductGallery,
  dateFilter = 'all',
  onDateFilterChange,
  dataFilter = 'all',
  onDataFilterChange,
  missingDesignCount,
  missingLocationCount,
  incompleteCount,
  abandonedCount,
  pendingApprovalCount,
  onOpenApprovalModal,
  onRestoreProduct,
  onRestoreVariant,
  startDate = '',
  onStartDateChange,
  endDate = '',
  onEndDateChange
}: ProductsTableProps) {
  const allSelected = products.length > 0 && selectedProductIds.length === products.length;
  const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShareProduct = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = product.id;
    if (!id) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/product/${encodeURIComponent(id)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.nameEn} - Balaji Textiles`,
          text: `Check out ${product.nameEn}${product.code ? ` (${product.code})` : ''} at Balaji Textiles!`,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2500);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const getProductDesignsSummary = (product: Product) => {
    const variantList = product.variants || [];
    const hasVariants = variantList.length > 0;
    
    const totalDesigns = hasVariants 
      ? variantList.length 
      : (product.images && product.images.length > 0 ? product.images.length : 1);

    const activeDesigns = hasVariants
      ? variantList.filter(v => v.inStock !== false && !v.isAbandoned).length
      : (product.inStock !== false && !product.isAbandoned ? totalDesigns : 0);

    const abandonedDesigns = hasVariants
      ? variantList.filter(v => v.isAbandoned).length
      : (product.isAbandoned ? totalDesigns : 0);

    return {
      totalDesigns,
      activeDesigns,
      abandonedDesigns,
      hasVariants,
      variantList
    };
  };

  const toggleExpandDesigns = (productId?: string) => {
    if (!productId) return;
    setExpandedDesigns(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md overflow-hidden flex flex-col justify-between min-h-[500px]">
        <div>
          {/* Header Controls */}
          <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Active Catalog Items</h2>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SearchInput
                  placeholder="Search name, code, brand, category..."
                  value={searchQuery}
                  onChange={onSearchChange}
                />

                {onPageSizeChange && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 px-3 py-2 rounded-xl shadow-sm">
                    <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider whitespace-nowrap">Per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = Number(e.target.value);
                        onPageSizeChange(newSize);
                        onPageChange(1);
                      }}
                      className="bg-transparent font-black text-xs text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                    >
                      {[10, 20, 50, 100].map((option) => (
                        <option key={option} value={option} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-100 font-bold">
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {onOpenOutOfStockModal && (
                  <button
                    type="button"
                    onClick={onOpenOutOfStockModal}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                    title="Upload CSV/Excel to mark specific product codes & design numbers Out of Stock"
                  >
                    <PackageX className="w-4 h-4" />
                    <span>Eliminate Stock (CSV)</span>
                  </button>
                )}

                {onExportCSV && (
                  <button
                    type="button"
                    onClick={() => onExportCSV(false)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                    title="Export catalog products to CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
            </div>

            {/* Date Filtering Bar */}
            {onDateFilterChange && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-[#5d51e8]" />
                  <span>Filter Date:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDateFilterChange('all')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dateFilter === 'all'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateFilterChange('today')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dateFilter === 'today'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateFilterChange('7days')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dateFilter === '7days'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateFilterChange('30days')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dateFilter === '30days'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => onDateFilterChange('custom')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dateFilter === 'custom'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>

                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2 mt-2 sm:mt-0 animate-in fade-in duration-200">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => onStartDateChange?.(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
                    <span className="text-slate-400 font-bold">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => onEndDateChange?.(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Catalog Integrity & Missing Fields Filter Pills */}
            {onDataFilterChange && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                    Catalog Integrity:
                  </span>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('all')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border ${
                      dataFilter === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 border-slate-900 dark:border-white shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-750'
                    }`}
                  >
                    All Items ({allProductsList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('missing-design')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      dataFilter === 'missing-design'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50/70 dark:bg-rose-955/20 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/40 hover:bg-rose-100'
                    }`}
                  >
                    <span>⚠️ Missing Design No</span>
                    <span className="px-1.5 py-0.2 bg-white/20 dark:bg-zinc-900/40 rounded-full text-[10px] font-black">
                      {missingDesignCount ?? allProductsList.filter(p => isProductMissingDesign(p)).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('missing-location')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      dataFilter === 'missing-location'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50/70 dark:bg-amber-955/20 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40 hover:bg-amber-100'
                    }`}
                  >
                    <span>📦 Missing Location</span>
                    <span className="px-1.5 py-0.2 bg-white/20 dark:bg-zinc-900/40 rounded-full text-[10px] font-black">
                      {missingLocationCount ?? allProductsList.filter(p => isProductMissingLocation(p)).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('incomplete')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      dataFilter === 'incomplete'
                        ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm'
                        : 'bg-indigo-50/70 dark:bg-indigo-955/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-900/40 hover:bg-indigo-100'
                    }`}
                  >
                    <span>🚨 All Incomplete</span>
                    <span className="px-1.5 py-0.2 bg-white/20 dark:bg-zinc-900/40 rounded-full text-[10px] font-black">
                      {incompleteCount ?? allProductsList.filter(p => isProductIncomplete(p)).length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('abandoned')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      dataFilter === 'abandoned'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                        : 'bg-purple-50/70 dark:bg-purple-955/20 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-900/40 hover:bg-purple-100'
                    }`}
                  >
                    <span>📦 Abandoned ({abandonedCount ?? allProductsList.filter(p => p.isAbandoned || p.variants?.some(v => v.isAbandoned)).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDataFilterChange('pending-approval')}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer border flex items-center gap-1.5 ${
                      dataFilter === 'pending-approval'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-amber-50/70 dark:bg-amber-955/20 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40 hover:bg-amber-100'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>⏳ Needs Approval ({pendingApprovalCount ?? allProductsList.filter(p => p.approvalStatus === 'pending_review' || p.approvalStatus === 'changes_requested').length})</span>
                  </button>
                </div>

                {onOpenMissingFieldsModal && (
                  <button
                    type="button"
                    onClick={onOpenMissingFieldsModal}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    title="Open batch missing fields quick edit workspace"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>⚡ Quick Fix Missing Data</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions overlay for products */}
          {selectedProductIds.length > 0 && (
            <div className="bg-[#5d51e8]/5 dark:bg-[#5d51e8]/10 px-6 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5d51e8] animate-pulse"></span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  <strong>{selectedProductIds.length}</strong> products selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onExportCSV && (
                  <button
                    type="button"
                    onClick={() => onExportCSV(true)}
                    className="px-3.5 py-1.5 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-black active:scale-95 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Selected ({selectedProductIds.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onBatchDeleteProducts}
                  className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-955/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-black active:scale-95 cursor-pointer transition-colors"
                >
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => onSelectAllProducts(false)}
                  className="text-xs text-slate-400 hover:text-slate-650 font-bold px-2 py-1 cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Product List Content */}
          <div className="overflow-x-auto">
            {loading ? (
              <Loader text="Loading catalog..." />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/20 text-slate-400 text-[10px] uppercase font-black tracking-wider select-none">
                        <th className="py-4 px-6 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => onSelectAllProducts(e.target.checked)}
                            className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                            disabled={products.length === 0}
                          />
                        </th>
                        <th className="py-4 px-4 w-16 text-center">Preview</th>
                        <th 
                          onClick={() => products.length > 0 && onSort('nameEn')}
                          className={`py-4 px-6 ${products.length > 0 ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''} group`}
                        >
                          <div className="flex items-center gap-1">
                            <span>Product Details</span>
                            {products.length > 0 && sortField === 'nameEn' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => products.length > 0 && onSort('category')}
                          className={`py-4 px-6 ${products.length > 0 ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''} group`}
                        >
                          <div className="flex items-center gap-1">
                            <span>Category</span>
                            {products.length > 0 && sortField === 'category' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => products.length > 0 && onSort('price')}
                          className={`py-4 px-6 ${products.length > 0 ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''} group`}
                        >
                          <div className="flex items-center gap-1">
                            <span>Price / Unit</span>
                            {products.length > 0 && sortField === 'price' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => products.length > 0 && onSort('createdAt')}
                          className={`py-4 px-6 ${products.length > 0 ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''} group`}
                        >
                          <div className="flex items-center gap-1">
                            <span>Date & Time</span>
                            {products.length > 0 && sortField === 'createdAt' && (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#5d51e8]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#5d51e8]" />
                            )}
                          </div>
                        </th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-20 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-4">
                              <p className="font-bold text-sm text-slate-500">
                                {allProductsList.length === 0 
                                  ? "Catalog is currently empty. Use the 'Add New Product' form above to add your first real product!" 
                                  : "No products match search or date criteria."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => {
                          const isSelected = selectedProductIds.includes(product.id || '');
                          const { totalDesigns, activeDesigns, abandonedDesigns, hasVariants, variantList } = getProductDesignsSummary(product);
                          const isExpanded = expandedDesigns.has(product.id || '');

                          return (
                            <tr key={product.id} className={`hover:bg-slate-55/40 dark:hover:bg-zinc-800/20 transition-colors ${
                              isSelected ? 'bg-indigo-50/25 dark:bg-indigo-950/5' : ''
                            }`}>
                              <td className="py-4 px-6 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => onSelectProduct(product.id || '', e.target.checked)}
                                  className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div
                                  onClick={() => onPreviewProductGallery?.(product)}
                                  className="inline-block cursor-pointer transition-transform hover:scale-110 active:scale-95 group relative"
                                  title="Click to view photo gallery"
                                >
                                  <ProductPreview
                                    imageUrl={product.imageUrl}
                                    name={product.nameEn}
                                    category={product.category}
                                  />
                                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-4 h-4 text-white drop-shadow-md" />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 flex-wrap">
                                    <span>{product.nameEn}</span>

                                    {/* Prominent Total Designs Badge */}
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandDesigns(product.id)}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                                        isExpanded
                                          ? 'bg-[#5d51e8] text-white border-[#5d51e8] shadow-sm shadow-[#5d51e8]/25'
                                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 hover:border-[#5d51e8]'
                                      }`}
                                      title={hasVariants ? "Click to view/hide all individual designs breakdown" : "Total designs in this product"}
                                    >
                                      <Layers className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span>{totalDesigns} Total Design{totalDesigns === 1 ? '' : 's'}</span>
                                      {hasVariants && (
                                        isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />
                                      )}
                                    </button>

                                    {product.isAbandoned && (
                                      <span className="inline-block bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-purple-200/50 dark:border-purple-900/50">
                                        📦 Abandoned Product
                                      </span>
                                    )}
                                    {product.variants?.some(v => v.isAbandoned) && !product.isAbandoned && (
                                      <span className="inline-block bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-purple-200/50 dark:border-purple-900/50">
                                        📦 {product.variants.filter(v => v.isAbandoned).length} Abandoned Design(s)
                                      </span>
                                    )}
                                    {product.inStock === false && !product.isAbandoned && (
                                      <span className="inline-block bg-rose-55 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-rose-200/50 dark:border-rose-900/50">
                                        Out of stock
                                      </span>
                                    )}
                                    {isProductMissingDesign(product) && (
                                      <span className="inline-block bg-rose-50 text-rose-700 dark:bg-rose-955/30 dark:text-rose-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-rose-200/70 dark:border-rose-900/50">
                                        ⚠️ Missing Design
                                      </span>
                                    )}
                                    {isProductMissingLocation(product) && (
                                      <span className="inline-block bg-amber-50 text-amber-700 dark:bg-amber-955/30 dark:text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-200/70 dark:border-amber-900/50">
                                        📦 Missing Location
                                      </span>
                                    )}
                                    {product.approvalStatus === 'pending_review' && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenApprovalModal?.(product)}
                                        className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-amber-300 dark:border-amber-800 hover:bg-amber-100 cursor-pointer shadow-xs"
                                        title="Click to review and 2-way approve product"
                                      >
                                        <Clock className="w-2.5 h-2.5" />
                                        <span>⏳ Needs 2nd Approval</span>
                                      </button>
                                    )}
                                    {product.approvalStatus === 'changes_requested' && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenApprovalModal?.(product)}
                                        className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[9px] font-black px-2 py-0.5 rounded-md uppercase border border-orange-300 dark:border-orange-800 hover:bg-orange-100 cursor-pointer shadow-xs"
                                        title="Click to view change request and fix"
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        <span>🔄 Changes Requested</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="text-[10px] font-black text-[#5d51e8] dark:text-indigo-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="px-1.5 py-0.5 bg-indigo-50/80 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded font-black">
                                      🎨 Designs: {totalDesigns} {hasVariants && `(${activeDesigns} Active${abandonedDesigns > 0 ? `, ${abandonedDesigns} Abandoned` : ''})`}
                                    </span>
                                    <span>•</span>
                                    <span>Code: {product.code || 'N/A'}</span>
                                  </div>

                                  {/* Expandable all-designs breakdown grid */}
                                  {isExpanded && hasVariants && (
                                    <div className="mt-2.5 p-3 bg-slate-50/80 dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                          <Layers className="w-3.5 h-3.5 text-[#5d51e8]" />
                                          <span>All Designs ({totalDesigns} Total: {activeDesigns} Active, {abandonedDesigns} Abandoned):</span>
                                        </p>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {variantList.map((v, vIdx) => {
                                          const img = product.images?.[v.imageIndex]?.url || product.imageUrl;
                                          return (
                                            <div key={vIdx} className={`p-2 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                                              v.isAbandoned
                                                ? 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200/70 dark:border-purple-800/70'
                                                : v.inStock === false
                                                ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200/70 dark:border-rose-800/70'
                                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                                            }`}>
                                              {img && (
                                                <div 
                                                  onClick={() => onPreviewProductGallery?.(product)}
                                                  className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 flex-shrink-0 cursor-pointer"
                                                  title="View Gallery"
                                                >
                                                  <img src={img} alt="" className="w-full h-full object-cover" />
                                                </div>
                                              )}
                                              <div className="min-w-0 flex-1 text-left">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                  <span className="font-extrabold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                    Design: {v.designNo || v.name || `#${vIdx + 1}`}
                                                  </span>
                                                  {v.isAbandoned ? (
                                                    <span className="text-[8px] font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1 rounded">
                                                      Abandoned
                                                    </span>
                                                  ) : v.inStock === false ? (
                                                    <span className="text-[8px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-1 rounded">
                                                      Out
                                                    </span>
                                                  ) : (
                                                    <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1 rounded">
                                                      Active
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold flex items-center gap-1.5 mt-0.5">
                                                  <span className="text-amber-700 dark:text-amber-300 font-black">
                                                    📦 Loc: {v.location || 'N/A'}
                                                  </span>
                                                  {v.isAbandoned && onRestoreVariant && (
                                                    <button
                                                      type="button"
                                                      onClick={() => onRestoreVariant(product, vIdx)}
                                                      className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-black underline ml-auto flex items-center gap-0.5 cursor-pointer"
                                                      title="Restore this design"
                                                    >
                                                      <RotateCcw className="w-3 h-3" />
                                                      <span>Restore</span>
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {/* Abandoned variants quick restore sub-list */}
                                  {product.variants && product.variants.some(v => v.isAbandoned) && (
                                    <div className="mt-2 space-y-1 bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                                      <p className="text-[9px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                        Abandoned Variants ({product.variants.filter(v => v.isAbandoned).length}):
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {product.variants.map((v, vIdx) => {
                                          if (!v.isAbandoned) return null;
                                          return (
                                            <div key={vIdx} className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg border border-purple-200 dark:border-purple-800 text-[10px]">
                                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                                Design: {v.designNo || v.name || `#${vIdx + 1}`}
                                              </span>
                                              {v.location && (
                                                <span className="text-amber-600 font-bold">({v.location})</span>
                                              )}
                                              {onRestoreVariant && (
                                                <button
                                                  type="button"
                                                  onClick={() => onRestoreVariant(product, vIdx)}
                                                  className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-black underline ml-1 cursor-pointer flex items-center gap-0.5"
                                                  title="Restore this specific design back to stock"
                                                >
                                                  <RotateCcw className="w-3 h-3" />
                                                  <span>Restore</span>
                                                </button>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  <div className="text-xs font-semibold text-slate-400 dark:text-zinc-550 max-w-xs line-clamp-1 mt-0.5">{product.descEn}</div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="inline-block bg-slate-100 dark:bg-zinc-800 text-slate-655 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-slate-200/50 dark:border-zinc-700/50">
                                  {product.category}
                                </span>
                              </td>
                              <td className="py-4 px-6 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                ₹{product.price.toLocaleString()} <span className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold">/ {product.unit}</span>
                              </td>
                              <td className="py-4 px-6 text-xs font-bold text-slate-600 dark:text-slate-350 whitespace-nowrap">
                                {formatDateTime(product.createdAt)}
                              </td>
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Restore Product Button */}
                                  {(product.isAbandoned || dataFilter === 'abandoned') && onRestoreProduct && (
                                    <button
                                      type="button"
                                      onClick={() => onRestoreProduct(product)}
                                      className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-955/25 rounded-full transition-all cursor-pointer"
                                      title="Restore Product to Active Catalog"
                                    >
                                      <RotateCcw className="w-4.5 h-4.5" />
                                    </button>
                                  )}
                                  {onOpenApprovalModal && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenApprovalModal(product)}
                                      className={`p-2 rounded-full transition-all cursor-pointer ${
                                        product.approvalStatus === 'pending_review' || product.approvalStatus === 'changes_requested'
                                          ? 'text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-955/40 ring-1 ring-amber-400 animate-pulse'
                                          : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                                      }`}
                                      title={
                                        product.approvalStatus === 'pending_review' || product.approvalStatus === 'changes_requested'
                                          ? "Review & 2-Way Approve Product"
                                          : "View Approval Details"
                                      }
                                    >
                                      <ShieldCheck className="w-4.5 h-4.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onPreviewProductGallery?.(product)}
                                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-955/20 rounded-full transition-all cursor-pointer"
                                    title="View Product Image Gallery"
                                  >
                                    <Eye className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleShareProduct(product, e)}
                                    className={`p-2 rounded-full transition-all cursor-pointer ${
                                      copiedId === product.id
                                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                        : 'text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10'
                                    }`}
                                    title="Share or Copy Direct Product Link"
                                  >
                                    {copiedId === product.id ? (
                                      <Check className="w-4.5 h-4.5 text-emerald-500" />
                                    ) : (
                                      <Share2 className="w-4.5 h-4.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onToggleStock?.(product)}
                                    className={`p-2 rounded-full transition-all cursor-pointer ${
                                      product.inStock !== false 
                                        ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-955/20' 
                                        : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/25'
                                    }`}
                                    title={product.inStock !== false ? "Mark Out of Stock" : "Mark In Stock"}
                                  >
                                    {product.inStock !== false ? (
                                      <ToggleRight className="w-5 h-5" />
                                    ) : (
                                      <ToggleLeft className="w-5 h-5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onEditProduct(product)}
                                    className="p-2 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-full transition-all cursor-pointer"
                                    title="Edit Product"
                                  >
                                    <Edit2 className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteProduct(product.id || '')}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/25 rounded-full transition-all cursor-pointer"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                {products.length > 0 && (
                  <div className="block md:hidden p-4 space-y-4 bg-slate-50/30 dark:bg-zinc-955/10">
                    {products.map((product) => {
                      const isSelected = selectedProductIds.includes(product.id || '');
                      const { totalDesigns, activeDesigns, abandonedDesigns, hasVariants, variantList } = getProductDesignsSummary(product);
                      const isExpanded = expandedDesigns.has(product.id || '');

                      return (
                        <div 
                          key={product.id} 
                          className={`p-4 bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col gap-3.5 transition-all shadow-sm ${
                            isSelected 
                              ? 'border-[#5d51e8] ring-1 ring-[#5d51e8]/10' 
                              : 'border-slate-150 dark:border-zinc-800/80'
                          }`}
                        >
                          {/* Header: Checkbox + Total designs + Stock status + Category badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => onSelectProduct(product.id || '', e.target.checked)}
                                className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                              />
                              <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2 py-0.5 rounded-full font-black border border-slate-200/50 dark:border-zinc-700/50 uppercase tracking-wider">
                                {product.category}
                              </span>

                              {/* Mobile Total Designs Badge */}
                              <button
                                type="button"
                                onClick={() => toggleExpandDesigns(product.id)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'bg-[#5d51e8] text-white border-[#5d51e8]'
                                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800'
                                }`}
                                title="Click to view all designs"
                              >
                                <Layers className="w-3 h-3" />
                                <span>{totalDesigns} Design{totalDesigns === 1 ? '' : 's'}</span>
                                {hasVariants && (
                                  isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
                                )}
                              </button>

                              {product.isAbandoned && (
                                <span className="inline-block bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-purple-200/50 dark:border-purple-900/50">
                                  📦 Abandoned
                                </span>
                              )}
                              {product.inStock === false && !product.isAbandoned && (
                                <span className="inline-block bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-rose-200/50 dark:border-rose-900/50">
                                  Out of Stock
                                </span>
                              )}
                              {product.approvalStatus === 'pending_review' && (
                                <button
                                  type="button"
                                  onClick={() => onOpenApprovalModal?.(product)}
                                  className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-300 cursor-pointer"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>Needs 2nd Approval</span>
                                </button>
                              )}
                              {product.approvalStatus === 'changes_requested' && (
                                <button
                                  type="button"
                                  onClick={() => onOpenApprovalModal?.(product)}
                                  className="inline-flex items-center gap-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-300 cursor-pointer"
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Changes Requested</span>
                                </button>
                              )}
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              ₹{product.price.toLocaleString()} <span className="text-[9px] text-slate-400 dark:text-zinc-550 font-bold">/ {product.unit}</span>
                            </span>
                          </div>

                          {/* Body: Image + Info */}
                          <div className="flex gap-3 text-left">
                            <div className="w-12 h-12 flex-shrink-0">
                              <ProductPreview
                                imageUrl={product.imageUrl}
                                name={product.nameEn}
                                category={product.category}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200 truncate">{product.nameEn}</p>
                              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                {isProductMissingDesign(product) && (
                                  <span className="bg-rose-50 text-rose-700 dark:bg-rose-955/30 dark:text-rose-300 text-[8px] font-black px-1.5 py-0.2 rounded border border-rose-200/70 dark:border-rose-900/50">
                                    ⚠️ Missing Design
                                  </span>
                                )}
                                {isProductMissingLocation(product) && (
                                  <span className="bg-amber-50 text-amber-700 dark:bg-amber-955/30 dark:text-amber-300 text-[8px] font-black px-1.5 py-0.2 rounded border border-amber-200/70 dark:border-amber-900/50">
                                    📦 Missing Location
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-black text-[#5d51e8] dark:text-indigo-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 bg-indigo-50/80 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 rounded font-black">
                                  🎨 {totalDesigns} Designs {hasVariants && `(${activeDesigns} Active)`}
                                </span>
                                <span>•</span>
                                <span>Code: {product.code || 'N/A'}</span>
                              </div>

                              {/* Mobile Expandable Designs Breakdown */}
                              {isExpanded && hasVariants && (
                                <div className="mt-2 p-2 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-1.5">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                    <Layers className="w-2.5 h-2.5 text-[#5d51e8]" />
                                    <span>All Designs ({totalDesigns} Total: {activeDesigns} Active, {abandonedDesigns} Abandoned):</span>
                                  </p>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {variantList.map((v, vIdx) => {
                                      const img = product.images?.[v.imageIndex]?.url || product.imageUrl;
                                      return (
                                        <div key={vIdx} className="p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-800 flex items-center gap-2 text-[10px]">
                                          {img && (
                                            <div className="w-7 h-7 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                                              <img src={img} alt="" className="w-full h-full object-cover" />
                                            </div>
                                          )}
                                          <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                                            <span className="font-extrabold truncate">
                                              Design: {v.designNo || v.name || `#${vIdx + 1}`}
                                            </span>
                                            <span className="text-amber-600 font-bold text-[9px] flex-shrink-0">
                                              Loc: {v.location || 'N/A'}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {/* Mobile abandoned variants */}
                              {product.variants && product.variants.some(v => v.isAbandoned) && (
                                <div className="mt-1.5 space-y-1 bg-purple-50/50 dark:bg-purple-950/20 p-2 rounded-xl border border-purple-100 dark:border-purple-900/40">
                                  <p className="text-[8px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">
                                    Abandoned Variants ({product.variants.filter(v => v.isAbandoned).length}):
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {product.variants.map((v, vIdx) => {
                                      if (!v.isAbandoned) return null;
                                      return (
                                        <div key={vIdx} className="flex items-center gap-1 bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 text-[9px]">
                                          <span>{v.designNo || v.name || `#${vIdx + 1}`}</span>
                                          {onRestoreVariant && (
                                            <button
                                              type="button"
                                              onClick={() => onRestoreVariant(product, vIdx)}
                                              className="text-purple-600 font-black underline ml-0.5 cursor-pointer"
                                            >
                                              Restore
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                Added: {formatDateTime(product.createdAt)}
                              </p>
                              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-550 truncate mt-0.5">{product.descEn}</p>
                            </div>
                          </div>

                          {/* Footer: Quick Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
                            {onOpenApprovalModal && (
                              <button
                                type="button"
                                onClick={() => onOpenApprovalModal(product)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] font-black ${
                                  product.approvalStatus === 'pending_review' || product.approvalStatus === 'changes_requested'
                                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                    : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                                }`}
                                title="Review & 2-Way Approve"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{product.approvalStatus === 'pending_review' ? 'Approve' : 'Review'}</span>
                              </button>
                            )}
                            {(product.isAbandoned || dataFilter === 'abandoned') && onRestoreProduct && (
                              <button
                                type="button"
                                onClick={() => onRestoreProduct(product)}
                                className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-955/25 rounded-lg cursor-pointer border border-purple-200 dark:border-purple-800 flex items-center justify-center gap-1 text-[10px] font-black"
                                title="Restore Product"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleShareProduct(product, e)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 text-[10px] font-black ${
                                copiedId === product.id
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600'
                                  : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-indigo-300'
                              }`}
                              title="Share Product Link"
                            >
                                {copiedId === product.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5 text-[#5d51e8]" />
                                    <span>Share</span>
                                  </>
                                )}
                              </button>
                            <button
                              type="button"
                              onClick={() => onToggleStock?.(product)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                product.inStock !== false 
                                  ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-955/20 border-emerald-100 dark:border-emerald-950/20' 
                                  : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/25 border-rose-100 dark:border-rose-950/20'
                              }`}
                              title={product.inStock !== false ? "Mark Out of Stock" : "Mark In Stock"}
                            >
                              {product.inStock !== false ? (
                                <ToggleRight className="w-4.5 h-4.5" />
                              ) : (
                                <ToggleLeft className="w-4.5 h-4.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              className="p-1.5 text-slate-400 hover:text-[#5d51e8] hover:bg-[#5d51e8]/10 rounded-lg cursor-pointer border border-slate-200 dark:border-zinc-800 flex items-center justify-center"
                              title="Edit Product"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProduct(product.id || '')}
                              className="p-1.5 text-rose-500 hover:text-rose-650 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-lg cursor-pointer border border-rose-100/50 dark:border-rose-900/50 flex items-center justify-center"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Pagination footer controls */}
        {products.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>

      {/* CSV Bulk Import Card (full width) */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-md">
        <div className="space-y-1">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">CSV Bulk Import</h3>
          <p className="text-xs text-slate-400 font-bold">Add multiple products to Firestore in one click</p>
        </div>
        
        <div className="border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-zinc-950/20 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">CSV Operations</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onDownloadCSVTemplate}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Download CSV Template</span>
            </button>
            {onExportCSV && (
              <button
                type="button"
                onClick={() => onExportCSV(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Products CSV</span>
              </button>
            )}
            {onOpenBulkWorkspace ? (
              <button
                type="button"
                onClick={onOpenBulkWorkspace}
                className="flex-1 py-2.5 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Open Bulk Import & Image Linker Workspace</span>
              </button>
            ) : (
              <label className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm text-center">
                <Upload className="w-3.5 h-3.5 inline-block" />
                <span>Upload Product CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={onCSVUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Floating Link Copied Notification */}
      {copiedId && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-2xl text-xs font-black flex items-center gap-2.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Check className="w-3 h-3 stroke-[3]" />
          </div>
          <span>Product link copied to clipboard! Ready to share.</span>
        </div>
      )}
    </div>
  );
}
