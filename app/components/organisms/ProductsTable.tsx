import React from 'react';
import { Edit2, Trash2, Database, Upload, ArrowUp, ArrowDown, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Product } from '../../lib/db';
import Loader from '../atoms/Loader';
import SearchInput from '../molecules/SearchInput';
import ProductPreview from '../molecules/ProductPreview';
import Pagination from '../molecules/Pagination';

interface ProductsTableProps {
  products: Product[];
  allProductsList: Product[]; // Unfiltered list to show empty states correctly
  loading: boolean;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedProductIds: string[];
  onSelectAllProducts: (checked: boolean) => void;
  onSelectProduct: (id: string, checked: boolean) => void;
  onSort: (field: 'nameEn' | 'price' | 'category') => void;
  sortField: 'nameEn' | 'price' | 'category';
  sortDirection: 'asc' | 'desc';
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onBatchDeleteProducts: () => void;
  onSeedCatalog: () => void;
  seedingCatalog: boolean;
  onDownloadCSVTemplate: () => void;
  onCSVUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleStock?: (product: Product) => void;
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
  onEditProduct,
  onDeleteProduct,
  onBatchDeleteProducts,
  onSeedCatalog,
  seedingCatalog,
  onDownloadCSVTemplate,
  onCSVUpload,
  onToggleStock
}: ProductsTableProps) {
  const allSelected = products.length > 0 && selectedProductIds.length === products.length;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md overflow-hidden flex flex-col justify-between min-h-[500px]">
        <div>
          <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Active Catalog Items</h2>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <SearchInput
                placeholder="Search product name, category..."
                value={searchQuery}
                onChange={onSearchChange}
              />
            </div>
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
                <button
                  type="button"
                  onClick={onBatchDeleteProducts}
                  className="px-3.5 py-1.5 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 rounded-lg text-xs font-black active:scale-95 cursor-pointer transition-colors"
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
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {products.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-20 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-4">
                              <p className="font-bold text-sm text-slate-500">
                                {allProductsList.length === 0 
                                  ? "Catalog is currently empty. Use the 'Add New Product' form above to add your first real product!" 
                                  : "No products match search criteria."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => {
                          const isSelected = selectedProductIds.includes(product.id || '');

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
                                <ProductPreview
                                  imageUrl={product.imageUrl}
                                  name={product.nameEn}
                                  category={product.category}
                                />
                              </td>
                              <td className="py-4 px-6">
                                <div>
                                  <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <span>{product.nameEn}</span>
                                    {product.inStock === false && (
                                      <span className="inline-block bg-rose-55 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-rose-200/50 dark:border-rose-900/50">
                                        Out of stock
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-black text-[#5d51e8] dark:text-indigo-400 mt-0.5">
                                    Code: {product.code || 'N/A'} | Design: {product.design || 'N/A'}
                                  </div>
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
                              <td className="py-4 px-6 text-center">
                                <div className="flex items-center justify-center gap-1">
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
                      return (
                        <div 
                          key={product.id} 
                          className={`p-4 bg-white dark:bg-zinc-900 border rounded-2xl flex flex-col gap-3.5 transition-all shadow-sm ${
                            isSelected 
                              ? 'border-[#5d51e8] ring-1 ring-[#5d51e8]/10' 
                              : 'border-slate-150 dark:border-zinc-800/80'
                          }`}
                        >
                          {/* Header: Checkbox + Stock status + Category badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => onSelectProduct(product.id || '', e.target.checked)}
                                className="w-4 h-4 text-[#5d51e8] focus:ring-[#5d51e8] border-slate-350 rounded cursor-pointer"
                              />
                              <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 px-2.5 py-0.5 rounded-full font-black border border-slate-200/50 dark:border-zinc-700/50 uppercase tracking-wider">
                                {product.category}
                              </span>
                              {product.inStock === false && (
                                <span className="inline-block bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-rose-200/50 dark:border-rose-900/50">
                                  Out of Stock
                                </span>
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
                              <p className="text-[10px] font-black text-[#5d51e8] dark:text-indigo-400 mt-0.5">
                                Code: {product.code || 'N/A'} | Design: {product.design || 'N/A'}
                              </p>
                              <p className="text-xs font-semibold text-slate-400 dark:text-zinc-550 truncate mt-0.5">{product.descEn}</p>
                            </div>
                          </div>

                          {/* Footer: Quick Actions */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60">
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
          </div>
        </div>
      </div>
    </div>
  );
}
