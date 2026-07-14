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
import { Order, UserProfile } from '../../lib/db';
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
}

export default function OrdersList({
  orders,
  usersList,
  loading,
  onStatusChange,
  onDeleteOrder,
  onUpdateOrder,
  getFieldLabel
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
                                    {(item.code || item.design) && (
                                      <p className="text-[9px] text-slate-400 dark:text-zinc-550 font-bold uppercase tracking-wider mt-0.5">
                                        Code: {item.code || 'N/A'} | Design: {item.design || 'N/A'}
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
                              {(item.code || item.design) && (
                                <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase mt-0.5">
                                  Code: {item.code || 'N/A'} | Design: {item.design || 'N/A'}
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
          className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-in fade-in duration-250 print:relative print:inset-auto print:bg-white print:p-0 print:z-0"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 max-w-2xl w-full rounded-3xl sm:rounded-[2.2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-250 max-h-[95vh] sm:max-h-[90vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none"
          >
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-zinc-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-zinc-950/20 print:border-b-2 print:border-black print:p-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#5d51e8]/10 text-[#5d51e8] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Logistics Order
                  </span>
                  <span className="text-xs font-bold text-slate-400">#{selectedOrder.id}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white print:text-xl">
                  Order Request Details
                </h3>
              </div>
              
              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 bg-white hover:bg-slate-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-655 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 rounded-xl flex items-center gap-1.5 text-xs font-black shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-grow print:overflow-y-visible print:p-2 print:space-y-4">
              
              {/* Customer & Order Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Details Box */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-4 rounded-2xl print:border-none print:p-0">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Buyer Credentials</h4>
                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-slate-800 dark:text-slate-200">{selectedOrder.userName}</p>
                    <p className="font-bold text-slate-500">{selectedOrder.userEmail}</p>
                    <p className="text-[10px] text-slate-400 pt-1">UID: {selectedOrder.userUid}</p>
                  </div>
                </div>

                {/* Registration Metadata (Address/GSTIN etc.) */}
                <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-4 rounded-2xl print:border-none print:p-0">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2.5">Registration Metadata</h4>
                  <div className="space-y-1 text-xs">
                    {(() => {
                      const profileObj = usersList.find(u => u.uid === selectedOrder.userUid);
                      if (profileObj && profileObj.customDetails && Object.keys(profileObj.customDetails).length > 0) {
                        return Object.entries(profileObj.customDetails).map(([key, val]) => (
                          <div key={key} className="flex justify-between gap-2 border-b border-slate-100/50 dark:border-zinc-850/50 py-0.5">
                            <span className="font-bold text-slate-400">{getFieldLabel(key)}:</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 text-right">{val}</span>
                          </div>
                        ));
                      }
                      return <p className="text-slate-400 font-bold italic">No custom metadata registration fields found.</p>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Order Status & Timestamps */}
              <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-850 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs print:border-none print:p-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Request Logged</span>
                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400">Current Status:</span>
                  <Badge status={selectedOrder.status} type="order" />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ordered Product Logistics</h4>
                <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden print:border-2 print:border-black">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-zinc-950 text-slate-450 border-b border-slate-200 dark:border-zinc-800 print:bg-slate-100 print:text-black">
                      <tr>
                        <th className="py-2.5 px-4 font-black">Product Details</th>
                        <th className="py-2.5 px-4 text-center font-black">Quantity</th>
                        <th className="py-2.5 px-4 text-right font-black">Unit Price</th>
                        <th className="py-2.5 px-4 text-right font-black">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/60 dark:divide-zinc-800/80 text-slate-700 dark:text-slate-300 print:divide-black">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.selectedImageUrl && (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex-shrink-0">
                                  <img 
                                    src={item.selectedImageUrl} 
                                    alt={item.nameEn} 
                                    className="w-full h-full object-cover" 
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-extrabold text-slate-900 dark:text-white print:text-black">{item.nameEn}</p>
                                {item.selectedVariant && (
                                  <p className="text-[10px] text-[#5d51e8] dark:text-indigo-300 font-black uppercase mt-0.5">
                                    Variant: {item.selectedVariant}
                                  </p>
                                )}
                                {(item.code || item.design) && (
                                  <p className="text-[9px] text-slate-400 dark:text-zinc-550 font-bold uppercase mt-0.5">
                                    Code: {item.code || 'N/A'} | Design: {item.design || 'N/A'}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-bold">
                            {item.quantity} <span className="text-[10px] text-slate-400 font-semibold uppercase">{item.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold">
                            ₹{item.price.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white print:text-black">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/50 dark:bg-zinc-950/50 font-black border-t border-slate-200 dark:border-zinc-800 print:bg-white print:border-t-2 print:border-black">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-right text-slate-450">Grand Total Logistics:</td>
                        <td className="py-3 px-4 text-right text-base text-[#5d51e8] dark:text-indigo-400 print:text-black font-extrabold">
                          ₹{selectedOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-zinc-800/80 flex justify-end gap-2.5 bg-slate-50/50 dark:bg-zinc-950/20 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-250 font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer border border-slate-200 dark:border-zinc-700"
              >
                Close details
              </button>
            </div>

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
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

    </div>
  );
}
