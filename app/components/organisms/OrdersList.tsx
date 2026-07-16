'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Truck, 
  Calendar, 
  Search, 
  Trash2, 
  Eye, 
  Printer, 
  X, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark,
  ChevronDown,
  XCircle
} from 'lucide-react';
import { Order, UserProfile, Product } from '../../lib/db';
import Loader from '../atoms/Loader';
import Badge from '../atoms/Badge';

interface OrdersListProps {
  orders: Order[];
  usersList: UserProfile[];
  loading: boolean;
  onStatusChange: (orderId: string, nextStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => void;
  onDeleteOrder?: (orderId: string) => void;
  onUpdateOrder?: (orderId: string, details: { trackingNumber?: string; adminNotes?: string }) => Promise<void>;
  getFieldLabel: (key: string) => string;
  onMarkOutOfStock?: (productId: string) => Promise<void>;
  productsList?: Product[];
}

// B2B helper function to convert numbers to Indian Rupees in words
function numberToWords(num: number): string {
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWordsLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    let temp = '';
    if (n >= 100) {
      temp += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (n < 20) {
        temp += a[n];
      } else {
        temp += b[Math.floor(n / 10)] + (n % 10 > 0 ? '-' + a[n % 10] : '');
      }
    }
    return temp.trim();
  };

  if (num === 0) return 'Zero Rupees Only';

  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  if (crore > 0) {
    words += numToWordsLessThanThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += numToWordsLessThanThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += numToWordsLessThanThousand(thousand) + ' Thousand ';
  }
  if (num > 0) {
    words += numToWordsLessThanThousand(num);
  }

  return (words.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

export default function OrdersList({
  orders,
  usersList,
  loading,
  onStatusChange,
  onDeleteOrder,
  onUpdateOrder,
  getFieldLabel,
  onMarkOutOfStock,
  productsList = []
}: OrdersListProps) {
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [sortBy, setSortBy] = useState<'dateDesc' | 'dateAsc' | 'valueDesc' | 'valueAsc'>('dateDesc');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // Lightbox State for Image Previews
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Group order items by product to neatly display variants together
  const groupedItems = useMemo(() => {
    if (!selectedOrder) return [];
    const groups: Record<string, {
      productId: string;
      nameEn: string;
      nameHi: string;
      code: string;
      design: string;
      unit: string;
      variants: typeof selectedOrder.items;
    }> = {};

    selectedOrder.items.forEach(item => {
      const key = item.productId || `${item.nameEn}_${item.code || ''}_${item.design || ''}`;
      if (!groups[key]) {
        groups[key] = {
          productId: item.productId,
          nameEn: item.nameEn,
          nameHi: item.nameHi,
          code: item.code || '',
          design: item.design || '',
          unit: item.unit,
          variants: []
        };
      }
      groups[key].variants.push(item);
    });

    return Object.values(groups);
  }, [selectedOrder]);

  // Open Details Modal
  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setTrackingInput(order.trackingNumber || '');
    setNotesInput(order.adminNotes || '');
  };

  // Save Order Tracking & Notes
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !selectedOrder.id || !onUpdateOrder) return;
    setSavingDetails(true);
    try {
      await onUpdateOrder(selectedOrder.id, {
        trackingNumber: trackingInput,
        adminNotes: notesInput
      });
      setSelectedOrder(prev => prev ? { ...prev, trackingNumber: trackingInput, adminNotes: notesInput } : null);
    } catch (err) {
      console.error("Failed to save order notes:", err);
    } finally {
      setSavingDetails(false);
    }
  };

  // Status Style Resolver for Card Highlights
  const getStatusBorderClass = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return 'border-l-4 border-l-emerald-500';
      case 'processing':
        return 'border-l-4 border-l-blue-500';
      case 'cancelled':
        return 'border-l-4 border-l-rose-500';
      default: // pending
        return 'border-l-4 border-l-amber-500';
    }
  };

  const getStatusBadgeWithSymbol = (status: Order['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450 border border-emerald-250 dark:border-emerald-900/50">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 border border-indigo-250 dark:border-indigo-900/50">
            <Truck className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-455" />
            Processing
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-955/20 dark:text-rose-400 border border-rose-250 dark:border-rose-900/40">
            <XCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-450" />
            Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 dark:bg-amber-955/20 dark:text-amber-400 border border-amber-250 dark:border-amber-900/50">
            <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-450" />
            Pending
          </span>
        );
    }
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    let totalSalesVal = 0;
    let pendingCount = 0;
    let processingCount = 0;
    let completedCount = 0;

    orders.forEach(order => {
      const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      if (order.status !== 'cancelled') {
        totalSalesVal += orderTotal;
      }
      if (order.status === 'pending') pendingCount++;
      if (order.status === 'processing') processingCount++;
      if (order.status === 'completed') completedCount++;
    });

    return { totalSalesVal, pendingCount, processingCount, completedCount };
  }, [orders]);

  // Filtered and Sorted Orders List
  const filteredSortedOrders = useMemo(() => {
    return orders
      .filter(order => {
        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;

        // Search text
        if (searchQuery.trim() !== '') {
          const query = searchQuery.toLowerCase();
          const matchesName = order.userName.toLowerCase().includes(query);
          const matchesEmail = order.userEmail.toLowerCase().includes(query);
          const matchesItems = order.items.some(item => item.nameEn.toLowerCase().includes(query));
          return matchesName || matchesEmail || matchesItems;
        }

        return true;
      })
      .sort((a, b) => {
        const totalA = a.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const totalB = b.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        switch (sortBy) {
          case 'dateAsc':
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case 'valueDesc':
            return totalB - totalA;
          case 'valueAsc':
            return totalA - totalB;
          case 'dateDesc':
          default:
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [orders, searchQuery, statusFilter, sortBy]);

  // Pagination Calculations
  const totalItems = filteredSortedOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedOrders = useMemo(() => {
    return filteredSortedOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredSortedOrders, startIndex, pageSize]);

  // Print Invoice Function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Dashboard Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 dark:from-zinc-950 dark:to-zinc-900 border border-slate-800 dark:border-zinc-800/80 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-white/10 p-2.5 rounded-2xl text-indigo-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Active Logistics Value</span>
          <span className="text-2xl font-black block mt-2">₹{metrics.totalSalesVal.toLocaleString()}</span>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">Excludes cancelled requests</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-amber-50 dark:bg-amber-955/20 p-2.5 rounded-2xl text-amber-500">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block">Pending Load</span>
          <span className="text-2xl font-black text-slate-850 dark:text-white block mt-2">{metrics.pendingCount}</span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Requires status update</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-blue-50 dark:bg-blue-955/20 p-2.5 rounded-2xl text-blue-500">
            <Truck className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block">In Transit</span>
          <span className="text-2xl font-black text-slate-850 dark:text-white block mt-2">{metrics.processingCount}</span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Marked processing</span>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
          <div className="absolute right-3 top-3 bg-emerald-50 dark:bg-emerald-955/20 p-2.5 rounded-2xl text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="text-xs font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block">Dispatched</span>
          <span className="text-2xl font-black text-slate-850 dark:text-white block mt-2">{metrics.completedCount}</span>
          <span className="text-[10px] text-slate-400 font-semibold block mt-1">Logistics complete</span>
        </div>
      </div>

      {/* 2. Controls & Search / Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-zinc-950 p-1.5 rounded-2xl border border-slate-100 dark:border-zinc-850">
            {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black capitalize transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-slate-900 dark:bg-zinc-800 text-white shadow-sm'
                    : 'text-slate-550 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search and Sort controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-grow lg:max-w-2xl">
            {/* Search Input */}
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search buyer name, email, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 focus:border-[#5d51e8] dark:focus:border-indigo-500 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold outline-none transition-colors text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="relative min-w-[160px] flex-shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-black py-2.5 pl-4 pr-10 rounded-2xl outline-none cursor-pointer text-slate-800 dark:text-slate-200 appearance-none hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
              >
                <option value="dateDesc">Newest First</option>
                <option value="dateAsc">Oldest First</option>
                <option value="valueDesc">Value: High to Low</option>
                <option value="valueAsc">Value: Low to High</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Orders List Table */}
      {loading ? (
        <Loader text="Loading customer orders log..." />
      ) : filteredSortedOrders.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-16 text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-slate-350 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-zinc-400 font-extrabold text-sm">No order requests found.</p>
          <p className="text-xs text-slate-400 mt-1">Try modifying your search or tab filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-400 dark:text-zinc-500 border-b border-slate-200 dark:border-zinc-800/80 font-black uppercase tracking-wider text-[9px]">
                  <tr>
                    <th className="py-4 px-6">Buyer Details</th>
                    <th className="py-4 px-6">Order Date</th>
                    <th className="py-4 px-6">Ordered Items</th>
                    <th className="py-4 px-6 text-right">Total Value</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/60 dark:divide-zinc-800/85">
                  {paginatedOrders.map((order) => {
                    const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const userProfile = usersList.find(u => u.uid === order.userUid);
                    
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-slate-55/40 dark:hover:bg-zinc-850/20 transition-all"
                      >
                         {/* Buyer Details */}
                        <td className="py-4 px-6">
                          <div className="max-w-[200px] space-y-1">
                            <p className="font-black text-slate-900 dark:text-white text-xs truncate" title={order.userName}>
                              {order.userName}
                            </p>
                            <p className="font-bold text-slate-400 text-[10px] truncate" title={order.userEmail}>
                              {order.userEmail}
                            </p>
                            {/* Profile Metadata snippet */}
                            {userProfile && userProfile.customDetails && Object.keys(userProfile.customDetails).length > 0 && (
                              <div className="flex flex-col gap-0.5 pt-0.5">
                                {Object.entries(userProfile.customDetails).slice(0, 2).map(([key, val]) => (
                                  <div 
                                    key={key} 
                                    className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700 flex-shrink-0"></span>
                                    <span className="truncate" title={`${getFieldLabel(key)}: ${val}`}>
                                      <span className="font-extrabold text-slate-450 dark:text-zinc-550">{getFieldLabel(key)}:</span> {val}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Order Date */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="font-bold text-slate-600 dark:text-slate-350 text-[11px]">
                            {new Date(order.createdAt).toLocaleString()}
                          </div>
                          {order.trackingNumber && (
                            <div className="mt-1">
                              <span className="bg-indigo-50 dark:bg-indigo-950/20 text-[#5d51e8] px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide">
                                Ref: {order.trackingNumber}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Ordered Items */}
                        <td className="py-4 px-6">
                          <div className="space-y-1.5 max-w-[280px]">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-[11px] gap-3 text-slate-700 dark:text-zinc-350">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#5d51e8] mt-1.5 flex-shrink-0"></span>
                                  <div className="min-w-0 text-left">
                                    <p className="font-extrabold truncate text-slate-800 dark:text-slate-200" title={item.nameEn}>
                                      {item.nameEn}
                                    </p>
                                    {(item.selectedVariant || item.code || item.design) && (
                                      <p className="text-[9px] text-slate-400 dark:text-zinc-550 font-bold uppercase tracking-wider mt-0.5">
                                        {item.selectedVariant && `Variant: ${item.selectedVariant} | `}Code: {item.code || 'N/A'} | Design: {item.design || 'N/A'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-[10px] shrink-0">
                                  x{item.quantity} {item.unit || 'pcs'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Total Value */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <span className="text-xs font-black text-slate-900 dark:text-white">
                            ₹{orderTotal.toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            <div className="relative">
                              <select
                                value={order.status}
                                onChange={(e) => onStatusChange(order.id || '', e.target.value as any)}
                                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-black pl-2.5 pr-7 py-1 rounded-md outline-none cursor-pointer text-slate-800 dark:text-slate-200 shadow-sm appearance-none hover:border-slate-300 dark:hover:border-zinc-700"
                              >
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                            </div>
                            {order.assignedSalesmanName ? (
                              <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-900/50 uppercase tracking-wider" title={`UID: ${order.assignedSalesmanUid}`}>
                                <span className="w-1 h-1 rounded-full bg-purple-500 animate-pulse"></span>
                                <span>Prep: {order.assignedSalesmanName}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-zinc-900 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-800/80 uppercase tracking-wider">
                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-650"></span>
                                <span>Unassigned</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(order)}
                              className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-955 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-800 flex items-center justify-center"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            
                            {onDeleteOrder && (
                              <button
                                type="button"
                                onClick={() => onDeleteOrder(order.id || '')}
                                className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/15 dark:hover:bg-rose-905/30 text-rose-600 dark:text-rose-450 rounded-xl transition-all cursor-pointer border border-rose-150/40 dark:border-rose-900/40 flex items-center justify-center"
                                title="Archive Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/30 dark:bg-zinc-955/10">
              {paginatedOrders.map((order) => {
                const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const userProfile = usersList.find(u => u.uid === order.userUid);
                return (
                  <div 
                    key={order.id} 
                    className={`p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col gap-3.5 transition-all shadow-sm ${
                      order.status === 'completed'
                        ? 'border-l-4 border-l-emerald-500'
                        : order.status === 'processing'
                        ? 'border-l-4 border-l-blue-500'
                        : order.status === 'cancelled'
                        ? 'border-l-4 border-l-rose-500'
                        : 'border-l-4 border-l-amber-500'
                    }`}
                  >
                    {/* Header: Date + Tracking Ref + Price */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        {order.trackingNumber && (
                          <span className="bg-indigo-50 dark:bg-indigo-950/20 text-[#5d51e8] px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide">
                            Ref: {order.trackingNumber}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        ₹{orderTotal.toLocaleString()}
                      </span>
                    </div>

                    {/* Body: Buyer info */}
                    <div className="text-left">
                      <p className="font-black text-slate-900 dark:text-white text-xs truncate">{order.userName}</p>
                      <p className="font-bold text-slate-400 text-[10px] truncate">{order.userEmail}</p>
                      {/* Firm / Details */}
                      {userProfile && userProfile.customDetails && Object.keys(userProfile.customDetails).length > 0 && (
                        <div className="flex flex-col gap-0.5 pt-1">
                          {Object.entries(userProfile.customDetails).slice(0, 2).map(([key, val]) => (
                            <div key={key} className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-350 dark:bg-zinc-700 flex-shrink-0"></span>
                              <span className="truncate">
                                <span className="font-extrabold text-slate-450 dark:text-zinc-550">{getFieldLabel(key)}:</span> {val}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Items stack */}
                    <div className="bg-slate-50/50 dark:bg-zinc-950/20 p-3 rounded-2xl border border-slate-150/40 dark:border-zinc-850/50 text-left space-y-1.5">
                      <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-black uppercase tracking-wider">Ordered Items</p>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-start justify-between text-[11px] gap-3 text-slate-700 dark:text-zinc-350">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#5d51e8] mt-1.5 flex-shrink-0"></span>
                            <div className="min-w-0 text-left">
                              <p className="font-extrabold truncate text-slate-800 dark:text-slate-200">{item.nameEn}</p>
                              {(item.selectedVariant || item.code || item.design) && (
                                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase mt-0.5">
                                  {item.selectedVariant && `Variant: ${item.selectedVariant} | `}Code: {item.code || 'N/A'} | Design: {item.design || 'N/A'}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-black text-slate-900 dark:text-white bg-white dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-[10px] shrink-0">
                            x{item.quantity} {item.unit || 'pcs'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer: Status select + Prep status + Actions */}
                    <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/60">
                      <div className="flex flex-col items-start gap-1">
                        <div className="relative">
                          <select
                            value={order.status}
                            onChange={(e) => onStatusChange(order.id || '', e.target.value as any)}
                            className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[10px] font-black pl-2.5 pr-7 py-1 rounded-md outline-none cursor-pointer text-slate-800 dark:text-slate-200 shadow-sm appearance-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                        </div>
                        {order.assignedSalesmanName ? (
                          <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-900/50 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                            <span>Prep: {order.assignedSalesmanName}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-zinc-900 text-slate-400 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-slate-200/80 dark:border-zinc-800/80 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-650"></span>
                            <span>Unassigned</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(order)}
                          className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-zinc-800 flex items-center justify-center"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteOrder && (
                          <button
                            type="button"
                            onClick={() => onDeleteOrder(order.id || '')}
                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 text-rose-600 dark:text-rose-450 rounded-xl transition-all cursor-pointer border border-rose-150/40 dark:border-rose-900/40 flex items-center justify-center"
                            title="Delete Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Pagination Controls Footer */}
          <div className="bg-slate-50 dark:bg-zinc-950/40 border-t border-slate-200 dark:border-zinc-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left side: Pagination size info */}
            <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-450 font-bold">
              <span>Showing</span>
              <span className="font-extrabold text-slate-800 dark:text-white">
                {totalItems === 0 ? 0 : startIndex + 1}
              </span>
              <span>to</span>
              <span className="font-extrabold text-slate-800 dark:text-white">
                {endIndex}
              </span>
              <span>of</span>
              <span className="font-extrabold text-slate-800 dark:text-white">
                {totalItems}
              </span>
              <span>orders</span>

              <div className="h-4 w-px bg-slate-200 dark:bg-zinc-850 mx-1"></div>

              <div className="flex items-center gap-1.5">
                <span>Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-black outline-none cursor-pointer text-slate-800 dark:text-slate-250 hover:border-slate-300 dark:hover:border-zinc-700 shadow-sm"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-extrabold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                if (totalPages > 6 && Math.abs(pageNum - activePage) > 1 && pageNum !== 1 && pageNum !== totalPages) {
                  if (pageNum === 2 && activePage > 3) {
                    return <span key={pageNum} className="px-1 text-slate-400 font-bold">...</span>;
                  }
                  if (pageNum === totalPages - 1 && activePage < totalPages - 2) {
                    return <span key={pageNum} className="px-1 text-slate-400 font-bold">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[28px] h-7 rounded-lg text-xs font-black transition-all flex items-center justify-center cursor-pointer ${
                      activePage === pageNum
                        ? 'bg-slate-900 dark:bg-zinc-800 text-white shadow-sm'
                        : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-zinc-850'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-extrabold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Production-Grade Order Details Modal */}
      {selectedOrder && (
        <div 
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-250 print:relative print:inset-auto print:bg-white print:p-0 print:z-0"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-3xl w-full rounded-3xl sm:rounded-[2.2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 max-h-[95vh] sm:max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
          >
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-zinc-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/20 print:border-b-2 print:border-black print:p-2 print:bg-transparent">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-[#5d51e8]/10 text-[#5d51e8] dark:bg-indigo-955/35 dark:text-indigo-305 font-black px-2 py-0.5 rounded-full uppercase tracking-widest print:hidden">
                    B2B Logistics Order
                  </span>
                  <span className="text-xs font-bold text-slate-450 dark:text-zinc-500 print:text-black">Order ID: #{selectedOrder.id}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white print:text-2xl print:text-black uppercase tracking-tight">
                  Commercial Order Request
                </h3>
              </div>
              
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-655 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl flex items-center gap-1.5 text-xs font-black shadow-sm cursor-pointer transition-all hover:scale-102 active:scale-98"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-805 text-slate-400 hover:text-slate-655 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-grow print:overflow-y-visible print:p-0 print:space-y-5">
              
              {/* Corporate Header - Printed Only */}
              <div className="hidden print:flex justify-between items-start border-b border-slate-350 pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-black text-black tracking-tight">BALAJI TEXTILES</h2>
                  <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                    123 Textile Market, Chandni Chowk, Delhi - 110006<br />
                    GSTIN: 07AAAAA1111A1Z1 | Support: +91 99999 88888
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <p className="font-extrabold text-black text-xs uppercase">Order Request Logistics</p>
                  <p>Reference: BT-ORD-{selectedOrder.id?.slice(-6).toUpperCase()}</p>
                  <p>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  <p>Status: {selectedOrder.status.toUpperCase()}</p>
                </div>
              </div>

              {/* Customer & Order Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Supplier Details Box */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-5 rounded-2xl print:border-none print:p-0">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-3 border-b border-slate-100/50 dark:border-zinc-800 pb-1.5 print:text-black print:border-black/20">
                    Supplier / Dispatcher
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-400 print:text-slate-600">Firm Name:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right print:text-black">Balaji Textiles Admin Headquarters</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-400 print:text-slate-600">GSTIN:</span>
                      <span className="font-extrabold text-slate-855 dark:text-slate-200 text-right print:text-black">07AAAAA1111A1Z1</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-400 print:text-slate-600">Address:</span>
                      <span className="font-bold text-slate-500 text-right print:text-black">123 Textile Market, Delhi - 110006</span>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-slate-100/40 dark:border-zinc-800/40 pt-2">
                      <span className="font-bold text-slate-400 print:text-slate-600">Support Line:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right print:text-black">+91 99999 88888</span>
                    </div>
                  </div>
                </div>

                {/* Buyer Credentials Box */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-5 rounded-2xl print:border-none print:p-0">
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest mb-3 border-b border-slate-100/50 dark:border-zinc-800 pb-1.5 print:text-black print:border-black/20">
                    Buyer / Consignee
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-400 print:text-slate-600">Contact Person:</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right print:text-black">{selectedOrder.userName}</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-bold text-slate-400 print:text-slate-600">Email Address:</span>
                      <span className="font-bold text-slate-500 text-right print:text-black">{selectedOrder.userEmail}</span>
                    </div>
                    {(() => {
                      const profileObj = usersList.find(u => u.uid === selectedOrder.userUid);
                      if (profileObj && profileObj.customDetails && Object.keys(profileObj.customDetails).length > 0) {
                        return Object.entries(profileObj.customDetails).map(([key, val]) => (
                          <div key={key} className="flex items-baseline justify-between border-t border-slate-100/40 dark:border-zinc-800/40 pt-2">
                            <span className="font-bold text-slate-400 print:text-slate-600">{getFieldLabel(key)}:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right print:text-black">{val}</span>
                          </div>
                        ));
                      }
                      return (
                        <div className="pt-2 text-slate-400 dark:text-zinc-555 italic font-bold">
                          No custom registration fields registered.
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Order Status & Timestamps */}
              <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs print:border-none print:p-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block font-bold print:text-slate-600">Request Logged</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 print:text-black">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 print:text-slate-600">Current Status:</span>
                  <Badge status={selectedOrder.status} type="order" />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-zinc-555 uppercase tracking-widest print:text-black">Ordered Products & Logistics</h4>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden print:border print:border-slate-350">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-zinc-955 text-slate-450 border-b border-slate-200 dark:border-zinc-800 print:bg-slate-100 print:text-black print:border-b">
                      <tr>
                        <th className="py-2.5 px-4 font-black">Product Details</th>
                        <th className="py-2.5 px-4 text-center font-black">Quantity</th>
                        <th className="py-2.5 px-4 text-right font-black">Unit Price</th>
                        <th className="py-2.5 px-4 text-right font-black">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/65 dark:divide-zinc-800/80 text-slate-700 dark:text-slate-300 print:divide-slate-300">
                      {groupedItems.map((group, gIdx) => (
                        <React.Fragment key={gIdx}>
                          {/* Master Product Header Row */}
                          <tr className="bg-slate-50/70 dark:bg-zinc-950/40 font-black border-y border-slate-100 dark:border-zinc-800/80 print:bg-slate-50 print:border-slate-300">
                            <td colSpan={4} className="py-2 px-4 print:py-1.5 print:px-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] bg-[#5d51e8]/10 text-[#5d51e8] dark:bg-indigo-950/40 dark:text-indigo-300 font-black px-1.5 py-0.5 rounded uppercase tracking-wider print:border print:border-slate-400 print:text-black">
                                    Product
                                  </span>
                                  <span className="font-extrabold text-slate-900 dark:text-white text-xs print:text-black">
                                    {group.nameEn} {group.nameHi && <span className="text-slate-400 dark:text-zinc-500 font-medium print:text-slate-600">({group.nameHi})</span>}
                                  </span>
                                </div>
                                {(group.code || group.design) && (
                                  <span className="text-[9px] text-slate-455 dark:text-zinc-555 font-bold uppercase tracking-wider print:text-black">
                                    {group.code && `Code: ${group.code}`} {group.code && group.design && '|'} {group.design && `Design: ${group.design}`}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Variant Rows */}
                          {group.variants.map((item, vIdx) => (
                            <tr key={vIdx} className="hover:bg-slate-50/20 dark:hover:bg-zinc-850/5 print:hover:bg-transparent">
                              <td className="py-2.5 px-4 print:py-2 print:px-3">
                                <div className="flex items-center gap-3">
                                  {item.selectedImageUrl && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-150 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex-shrink-0 relative group shadow-sm print:shadow-none print:border-slate-300">
                                      <img 
                                        src={item.selectedImageUrl} 
                                        alt={item.nameEn} 
                                        className="w-full h-full object-cover transition-transform duration-250 group-hover:scale-110 cursor-zoom-in print:cursor-default" 
                                        onClick={() => setLightboxImage({ url: item.selectedImageUrl!, title: `${item.nameEn} - ${item.selectedVariant || 'Standard'}` })}
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-black uppercase tracking-widest cursor-zoom-in print:hidden">
                                        Zoom
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-extrabold text-slate-800 dark:text-slate-200 text-xs print:text-black flex items-center gap-2 flex-wrap">
                                      <span>{item.selectedVariant ? `Variant: ${item.selectedVariant}` : 'Standard Variant'}</span>
                                      {(item as any).prepStatus && (
                                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${
                                          (item as any).prepStatus === 'found' 
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250/20' 
                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-955/40 dark:text-rose-300 border border-rose-300/20'
                                        }`}>
                                          {(item as any).prepStatus === 'found' ? '✅ Found' : '❌ Not Found'}
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-bold mt-0.5 print:text-slate-600">
                                      SKU: {group.code || 'N/A'}-{item.selectedVariant?.toUpperCase().replace(/\s+/g, '-') || 'STD'}
                                    </p>
                                    {(() => {
                                      if ((item as any).prepStatus === 'not_found' && item.productId) {
                                        const catalogProduct = productsList.find(p => p.id === item.productId);
                                        const isCurrentlyInStock = catalogProduct ? catalogProduct.inStock !== false : true;
                                        if (isCurrentlyInStock && onMarkOutOfStock) {
                                          return (
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (confirm(`Mark "${item.nameEn}" as Out of Stock in catalog?`)) {
                                                  await onMarkOutOfStock(item.productId!);
                                                }
                                              }}
                                              className="mt-1.5 text-[9px] font-black uppercase text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/15 dark:hover:bg-rose-955/25 px-2 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/40 cursor-pointer transition-colors active:scale-95 block w-max print:hidden"
                                            >
                                              Mark Out of Stock
                                            </button>
                                          );
                                        } else {
                                          return (
                                            <span className="mt-1 text-[9px] font-bold text-slate-400 dark:text-zinc-550 block">
                                              Already Out of Stock in Catalog
                                            </span>
                                          );
                                        }
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-center font-extrabold text-xs print:py-2 print:px-3 print:text-black">
                                {item.quantity} <span className="text-[9px] text-slate-400 dark:text-zinc-550 uppercase tracking-wider font-bold">{group.unit}</span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-extrabold text-xs print:py-2 print:px-3 print:text-black">
                                ₹{item.price.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-900 dark:text-white text-xs print:py-2 print:px-3 print:text-black">
                                ₹{(item.price * item.quantity).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/50 dark:bg-zinc-950/50 font-black border-t border-slate-200 dark:border-zinc-800 print:bg-white print:border-t-2 print:border-slate-400">
                      {/* Subtotal */}
                      <tr className="border-b border-slate-100 dark:border-zinc-850/60 print:border-slate-200">
                        <td colSpan={3} className="py-2 px-4 text-right text-xs text-slate-450 print:text-slate-700 font-extrabold">Subtotal:</td>
                        <td className="py-2 px-4 text-right text-xs text-slate-805 dark:text-slate-200 print:text-black font-extrabold">
                          ₹{orderTotal.toLocaleString()}
                        </td>
                      </tr>
                      {/* B2B GST Breakdown */}
                      <tr className="border-b border-slate-100 dark:border-zinc-850/60 print:border-slate-200">
                        <td colSpan={3} className="py-1.5 px-4 text-right text-[10px] text-slate-400 dark:text-zinc-550 print:text-slate-500 font-bold">CGST (2.5%):</td>
                        <td className="py-1.5 px-4 text-right text-[10px] text-slate-550 dark:text-zinc-400 print:text-black font-bold">
                          ₹{Math.round(orderTotal * 0.025).toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 print:border-slate-300">
                        <td colSpan={3} className="py-1.5 px-4 text-right text-[10px] text-slate-400 dark:text-zinc-555 print:text-slate-500 font-bold">SGST (2.5%):</td>
                        <td className="py-1.5 px-4 text-right text-[10px] text-slate-550 dark:text-zinc-400 print:text-black font-bold">
                          ₹{Math.round(orderTotal * 0.025).toLocaleString()}
                        </td>
                      </tr>
                      {/* Grand Total */}
                      <tr className="bg-slate-100/50 dark:bg-zinc-950/80 print:bg-slate-100 print:border-b-2 print:border-slate-400">
                        <td colSpan={3} className="py-3 px-4 text-right text-xs text-slate-900 dark:text-white print:text-black font-black uppercase tracking-wider">Grand Total (Inclusive of GST):</td>
                        <td className="py-3 px-4 text-right text-sm text-[#5d51e8] dark:text-indigo-400 print:text-black font-black">
                          ₹{finalTotal.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Amount in words */}
              <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-855 p-4 rounded-2xl text-xs space-y-1 print:border-none print:p-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-550 uppercase tracking-widest block print:text-slate-500">Amount in Words</span>
                <span className="font-extrabold text-slate-805 dark:text-slate-200 capitalize italic print:text-black">
                  {numberToWords(finalTotal)}
                </span>
              </div>

              {/* Signatures & Terms Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 print:border-slate-300 print:pt-6">
                {/* Terms and Conditions */}
                <div className="text-[10px] text-slate-400 dark:text-zinc-550 space-y-1 text-left print:text-black">
                  <span className="font-black uppercase tracking-wider block text-slate-500 print:text-black">Terms & Conditions</span>
                  <ul className="list-disc pl-4 space-y-0.5 font-bold leading-normal text-slate-450 dark:text-zinc-455 print:text-black">
                    <li>All disputes are subject to New Delhi jurisdiction only.</li>
                    <li>Goods once sold will not be accepted back or exchanged.</li>
                    <li>This is a system-generated commercial order request logistics form.</li>
                  </ul>
                </div>
                
                {/* Signatures */}
                <div className="flex justify-between items-end h-20 px-4 pt-2 print:h-16">
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-305 dark:border-zinc-700 print:border-black"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1 block print:text-black">Receiver Signature</span>
                  </div>
                  <div className="text-center">
                    <div className="w-32 border-b border-slate-305 dark:border-zinc-700 print:border-black"></div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-1 block print:text-black">Authorized Signatory</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800/80 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-zinc-950/20 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-slate-105 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-250 font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-zinc-700"
              >
                Close details
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 print:hidden cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full flex flex-col items-center gap-3.5 select-none animate-in zoom-in-95 duration-200"
          >
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2.5 bg-white/15 hover:bg-white/25 text-white hover:scale-105 active:scale-95 rounded-full transition-all cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-full max-h-[75vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-zinc-950">
              <img 
                src={lightboxImage.url} 
                alt={lightboxImage.title} 
                className="max-w-full max-h-[75vh] object-contain transition-transform duration-300 hover:scale-105 cursor-zoom-out" 
                onClick={() => setLightboxImage(null)}
              />
            </div>
            <p className="text-white text-xs font-black tracking-widest uppercase bg-black/55 backdrop-blur-md px-4 py-1.5 rounded-full shadow border border-white/5">{lightboxImage.title}</p>
          </div>
        </div>
      )}

      {/* Global CSS to hide other elements during printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            overflow: visible;
            background: white !important;
            color: black !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          /* High quality print details */
          .bg-slate-50\\/50, .bg-slate-50, .bg-slate-105\\/50, .bg-slate-105, .bg-zinc-955, .bg-zinc-955\\/20, .bg-zinc-955\\/80, .bg-zinc-955\\/50, .bg-slate-50\\/80 {
            background-color: transparent !important;
            background: transparent !important;
          }
          .border, .border-y, .border-t, .border-b, .border-slate-100, .border-slate-205, .border-zinc-800 {
            border-color: #cbd5e1 !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>

    </div>
  );
}
