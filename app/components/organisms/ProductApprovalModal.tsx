'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Edit3, 
  Send, 
  ShieldCheck, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  MapPin, 
  Tag, 
  Loader2,
  Check,
  UserCheck
} from 'lucide-react';
import { Product, getPriceRange } from '../../lib/db';
import { transformImageUrl } from '../../lib/image';

interface ProductApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currentUser: { uid: string; name: string; email: string };
  isSuperAdmin: boolean;
  onApprove: (product: Product, note?: string) => Promise<void>;
  onRequestChanges: (product: Product, reason: string) => Promise<void>;
  onDirectPublish?: (product: Product) => Promise<void>;
  onEditProduct: (product: Product) => void;
}

export default function ProductApprovalModal({
  isOpen,
  onClose,
  product,
  currentUser,
  isSuperAdmin,
  onApprove,
  onRequestChanges,
  onDirectPublish,
  onEditProduct,
}: ProductApprovalModalProps) {
  const [showRequestInput, setShowRequestInput] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!isOpen || !product) return null;

  // Maker-Checker Check:
  // Is current user the creator or last modifier?
  const lastAuthorUid = product.lastModifiedBy?.uid || product.createdBy?.uid;
  const isLastAuthor = Boolean(lastAuthorUid && lastAuthorUid === currentUser.uid);
  const canApprove = isSuperAdmin || !isLastAuthor;

  const imagesList = product.images && product.images.length > 0
    ? product.images
    : (product.imageUrl ? [{ url: product.imageUrl, label: 'Main Image' }] : []);

  const activeImgUrl = imagesList[activeImageIdx] ? transformImageUrl(imagesList[activeImageIdx].url) : '';

  const handleApproveClick = async () => {
    setActionLoading(true);
    try {
      await onApprove(product, approvalNote.trim() || 'Verified and approved for live catalog');
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectPublishClick = async () => {
    if (!onDirectPublish) return;
    setActionLoading(true);
    try {
      await onDirectPublish(product);
      onClose();
    } catch (err) {
      console.error('Direct publish failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) return;
    setActionLoading(true);
    try {
      await onRequestChanges(product, changeReason.trim());
      setShowRequestInput(false);
      setChangeReason('');
      onClose();
    } catch (err) {
      console.error('Request changes failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const status = product.approvalStatus || 'approved';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-left">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Catalog Quality & 2-Way Approval
                </h3>
                {status === 'pending_review' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Awaiting 2nd Review</span>
                  </span>
                )}
                {status === 'changes_requested' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Changes Requested</span>
                  </span>
                )}
                {status === 'approved' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Live on Store</span>
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-400 mt-0.5">
                Maker-Checker verification to eliminate errors before customers see the catalog
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-grow space-y-6">
          
          {/* Maker-Checker Status Bar */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500 dark:text-zinc-400">Created by:</span>
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {product.createdBy?.name || 'Staff User'}
                </span>
                {product.createdBy?.email && (
                  <span className="text-[10px] text-slate-400">({product.createdBy.email})</span>
                )}
              </div>
              {product.lastModifiedBy && (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 dark:text-zinc-400">Last Modified by:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {product.lastModifiedBy.name}
                  </span>
                </div>
              )}
            </div>

            {/* Change request note banner */}
            {product.reviewNotes && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-orange-800 dark:text-orange-200">
                <p className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Reviewer Feedback / Note:</span>
                </p>
                <p className="text-xs font-semibold">{product.reviewNotes}</p>
              </div>
            )}
          </div>

          {/* Self-approval Notice */}
          {!canApprove && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 font-black">
                🛡️
              </div>
              <div>
                <p className="font-extrabold leading-snug">
                  Maker-Checker Policy: Self-Approval is Restricted
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  You created or last updated this item. A second staff reviewer or Super Admin must review and sign off before it can go live. You may still click &ldquo;Edit &amp; Fix Bug&rdquo; to modify details.
                </p>
              </div>
            </div>
          )}

          {/* Product Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Image Preview (Cols 1-5) */}
            <div className="md:col-span-5 space-y-3">
              <div className="aspect-square w-full rounded-2xl bg-slate-100 dark:bg-zinc-800 overflow-hidden border border-slate-200 dark:border-zinc-700 relative">
                {activeImgUrl ? (
                  <img src={activeImgUrl} alt={product.nameEn} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-slate-400">
                    No Image
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-black/50 text-white rounded-lg text-[10px] font-black uppercase">
                  {product.category}
                </div>
              </div>

              {/* Thumbnails */}
              {imagesList.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imagesList.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-12 h-12 rounded-xl overflow-hidden border-2 flex-shrink-0 cursor-pointer ${
                        idx === activeImageIdx ? 'border-[#5d51e8]' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={transformImageUrl(img.url)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details (Cols 6-12) */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {product.code && (
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] font-black text-xs rounded-lg border border-indigo-200/60">
                      Code: {product.code}
                    </span>
                  )}
                  {product.brand && (
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 font-black text-xs rounded-lg border border-amber-200/60">
                      Brand: {product.brand}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                  {product.nameEn}
                </h4>
                {product.nameHi && (
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{product.nameHi}</p>
                )}
              </div>

              {/* Pricing Box */}
              <div className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/80 dark:border-zinc-700/80">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                  Wholesale Price Range
                </span>
                <span className="text-lg font-black text-[#5d51e8] dark:text-indigo-400">
                  {getPriceRange(product.price, product.priceRangePct ?? 5, product.minPrice, product.maxPrice)}
                </span>
                <span className="text-xs font-bold text-slate-400 ml-1">/ {product.unit}</span>
              </div>

              {/* Designs Breakdown */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#5d51e8]" />
                    <span>Designs &amp; Rack Locations ({product.variants.length}):</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                    {product.variants.map((v, vIdx) => (
                      <div key={vIdx} className="p-2 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-zinc-700 text-xs flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                          {v.designNo || v.name}
                        </span>
                        <span className={`text-[10px] font-black ${
                          v.location ? 'text-amber-600' : 'text-rose-500'
                        }`}>
                          {v.location ? `Loc: ${v.location}` : 'No Loc'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Audit Trail Expandable Accordion */}
          {product.approvalHistory && product.approvalHistory.length > 0 && (
            <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAuditTrail(!showAuditTrail)}
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-800/40 flex items-center justify-between text-xs font-black text-slate-700 dark:text-zinc-200 cursor-pointer"
              >
                <span>Audit &amp; Approval History ({product.approvalHistory.length} events)</span>
                {showAuditTrail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showAuditTrail && (
                <div className="p-3 divide-y divide-slate-100 dark:divide-zinc-800 text-xs space-y-2">
                  {product.approvalHistory.map((rec, rIdx) => (
                    <div key={rIdx} className="pt-2 first:pt-0 flex items-start justify-between gap-4">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-[#5d51e8] mr-2">
                          {rec.action}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{rec.userName}</span>
                        {rec.note && <p className="text-[11px] text-slate-500 italic mt-0.5">&ldquo;{rec.note}&rdquo;</p>}
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(rec.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Request Changes Input Box */}
          {showRequestInput && (
            <form onSubmit={handleRequestChangesSubmit} className="p-4 bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/60 rounded-2xl space-y-3">
              <label className="block text-xs font-black uppercase tracking-wider text-orange-800 dark:text-orange-200">
                Specify what needs to be corrected:
              </label>
              <textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g. Design 3 photo is incorrect; Rack location is C-12 instead of C-1..."
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-orange-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                required
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestInput(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !changeReason.trim()}
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Submitting...' : 'Send Change Request'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Action Footer */}
        <div className="p-5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProduct(product);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-xs font-black hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Edit details, price, or designs to fix any bugs"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#5d51e8]" />
              <span>Fix Bug / Edit</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRequestInput(!showRequestInput)}
              className="px-4 py-2.5 rounded-xl border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-black hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Request Changes</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Super Admin Direct Publish Override */}
            {isSuperAdmin && onDirectPublish && (
              <button
                type="button"
                onClick={handleDirectPublishClick}
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Super Admin Direct Publish bypasses 2nd review"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Superadmin Direct Publish</span>
              </button>
            )}

            {/* Standard Maker-Checker 2nd Approval */}
            <button
              type="button"
              onClick={handleApproveClick}
              disabled={actionLoading || !canApprove}
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 ${
                canApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-95 cursor-pointer'
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
              }`}
              title={canApprove ? "Confirm approval to make product live" : "Maker-Checker rule: Self-approval is blocked"}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>{status === 'approved' ? 'Re-Approve Live' : 'Approve & Publish Live'}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
