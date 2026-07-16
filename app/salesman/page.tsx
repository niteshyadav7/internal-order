'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Order,
  subscribeToOrders,
  claimOrder,
  completeOrder,
  updateOrder,
  releaseOrder,
  getPriceRange,
  getGlobalSettings
} from '../lib/db';
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  User,
  LogOut,
  Calendar,
  Truck,
  Sparkles,
  Loader2,
  X,
  XCircle
} from 'lucide-react';
import Button from '../components/atoms/Button';

export default function SalesmanPortal() {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');

  // Dynamic window/tab title
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      available: 'Sales - Available Orders',
      active: 'Sales - My Active Orders',
      completed: 'Sales - Completed Orders'
    };
    document.title = tabTitles[activeTab] || 'Salesman Portal';
  }, [activeTab]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [priceRangePct, setPriceRangePct] = useState(5);

  useEffect(() => {
    getGlobalSettings().then(settings => {
      setPriceRangePct(settings.priceRangePct || 5);
    });
  }, []);

  // Authenticate user and restrict access to Salesmen only
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Real-time listener for orders
  useEffect(() => {
    if (!user || (userProfile && userProfile.role !== 'salesman')) return;
    setLoadingOrders(true);
    const unsubscribe = subscribeToOrders((newOrders) => {
      setOrders(newOrders);
      setLoadingOrders(false);
    });
    return () => unsubscribe();
  }, [user, userProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Filter orders into categories
  const availableOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pending' && !o.assignedSalesmanUid);
  }, [orders]);

  const myActiveOrders = useMemo(() => {
    return orders.filter(o => o.assignedSalesmanUid === user?.uid && o.status === 'processing');
  }, [orders, user]);

  const myCompletedOrders = useMemo(() => {
    return orders.filter(o => o.assignedSalesmanUid === user?.uid && o.status === 'completed');
  }, [orders, user]);

  const handleClaim = async (orderId: string) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      const name = userProfile?.name || user.email || 'Salesman';
      await claimOrder(orderId, user.uid, name);
    } catch (e) {
      console.error(e);
      alert("Error claiming order.");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Preparation Wizard State ───
  type PrepStatus = 'found' | 'hold' | 'not_found';
  const [prepOrder, setPrepOrder] = useState<Order | null>(null); // The order being prepared
  const [prepPhase, setPrepPhase] = useState<'prep' | 'review' | 'summary'>('prep');
  const [prepIndex, setPrepIndex] = useState(0);   // Current item index
  const [prepStates, setPrepStates] = useState<Record<number, PrepStatus>>({}); // item index -> status
  const [prepSubmitting, setPrepSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const startPreparation = (order: Order) => {
    setPrepOrder(order);
    setPrepPhase('prep');
    setPrepIndex(0);
    setPrepStates({});
  };

  const markItem = (index: number, status: PrepStatus) => {
    setPrepStates(prev => ({ ...prev, [index]: status }));
    if (!prepOrder) return;
    const nextIndex = index + 1;
    if (nextIndex < prepOrder.items.length) {
      setPrepIndex(nextIndex);
    } else {
      // All items done — check if any are on hold
      const updatedStates = { ...prepStates, [index]: status };
      const heldIndices = Object.entries(updatedStates)
        .filter(([, s]) => s === 'hold')
        .map(([i]) => Number(i));
      if (heldIndices.length > 0) {
        setPrepPhase('review');
        setPrepIndex(heldIndices[0]);
      } else {
        setPrepPhase('summary');
      }
    }
  };

  const resolveHeldItem = (index: number, status: 'found' | 'not_found') => {
    setPrepStates(prev => ({ ...prev, [index]: status }));
    if (!prepOrder) return;
    const updatedStates = { ...prepStates, [index]: status };
    const remainingHeld = Object.entries(updatedStates)
      .filter(([, s]) => s === 'hold')
      .map(([i]) => Number(i));
    if (remainingHeld.length > 0) {
      setPrepIndex(remainingHeld[0]);
    } else {
      setPrepPhase('summary');
    }
  };

  const submitPreparation = async () => {
    if (!prepOrder || !prepOrder.id) return;
    setPrepSubmitting(true);
    try {
      const updatedItems = prepOrder.items.map((item, idx) => ({
        ...item,
        prepStatus: prepStates[idx] || 'found'
      }));
      await updateOrder(prepOrder.id, { items: updatedItems as any });
      await completeOrder(prepOrder.id);
      setPrepOrder(null);
    } catch (e) {
      console.error(e);
      alert("Error completing preparation.");
    } finally {
      setPrepSubmitting(false);
    }
  };

  const handleComplete = async (orderId: string) => {
    // Find the order and start preparation wizard instead of directly completing
    const order = myActiveOrders.find(o => o.id === orderId);
    if (order) {
      startPreparation(order);
    }
  };

  const handleRelease = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await releaseOrder(orderId);
    } catch (e) {
      console.error(e);
      alert("Error releasing order.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || (user && !userProfile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-10 w-10 text-[#5d51e8]" />
          <p className="text-sm font-bold text-slate-500 dark:text-zinc-400">Verifying role details...</p>
        </div>
      </div>
    );
  }

  // Deny access if not a salesman
  if (userProfile && userProfile.role !== 'salesman') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 text-red-650 rounded-full flex items-center justify-center mx-auto border border-red-200/50 dark:border-red-900/50">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Access Denied</h2>
            <p className="text-xs font-semibold text-slate-450 dark:text-zinc-550 leading-relaxed">
              Your account is not registered as a Salesman. If you believe this is an error, please ask your administrator to update your account role.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="w-full" onClick={() => router.push('/')}>
              Go to Storefront
            </Button>
            <Button variant="danger" className="w-full" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300 font-sans pb-12">
      {/* Header bar */}
      <header className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200 dark:border-zinc-800 shadow-sm py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#5d51e8] text-white p-2 rounded-xl shadow-lg shadow-[#5d51e8]/20">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h1 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Salesman Dashboard</span>
              <span className="bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                Salesman
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold">Logged in as {userProfile?.name}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-550 dark:text-zinc-450 hover:text-rose-600 dark:hover:text-rose-450 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* Main Grid View */}
      <main className="max-w-4xl w-full mx-auto p-6 space-y-6">

        {/* Salesman Welcome & Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-indigo-500 to-[#5d51e8] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <User className="w-32 h-32" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Welcome Back</p>
              <h2 className="text-base font-black truncate">{userProfile?.name || 'Salesperson'}</h2>
            </div>
            <p className="text-[10px] font-bold text-indigo-100/90">Ready to pack today's shipments?</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Available Orders</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{availableOrders.length}</span>
              <span className="text-xs font-bold text-slate-450">waiting in queue</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: availableOrders.length > 0 ? '50%' : '0%' }} />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Your Shipments Today</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-[#5d51e8] dark:text-indigo-400">{myCompletedOrders.length}</span>
              <span className="text-xs font-bold text-slate-450">dispatched orders</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1 rounded-full overflow-hidden">
              <div className="bg-[#5d51e8] h-full rounded-full transition-all duration-500" style={{ width: myCompletedOrders.length > 0 ? '100%' : '0%' }} />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-zinc-900 p-1 rounded-[1.25rem] sm:p-1.5 sm:rounded-[1.5rem] border border-slate-150 dark:border-zinc-800 shadow-sm flex gap-1 animate-in fade-in duration-300">
          <button
            onClick={() => setActiveTab('available')}
            className={`w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] min-[375px]:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${activeTab === 'available'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
              }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" />
            <span>Available</span>
            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full transition-all ${
              activeTab === 'available'
                ? 'bg-white text-[#5d51e8] scale-105'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-350'
            }`}>
              {availableOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] min-[375px]:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${activeTab === 'active'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
              }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" />
            <span>Active</span>
            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full transition-all ${
              activeTab === 'active'
                ? 'bg-white text-[#5d51e8] scale-105'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-350'
            }`}>
              {myActiveOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] min-[375px]:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${activeTab === 'completed'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
              }`}
          >
            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" />
            <span>Finished</span>
            <span className={`text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full transition-all ${
              activeTab === 'completed'
                ? 'bg-white text-[#5d51e8] scale-105'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-350'
            }`}>
              {myCompletedOrders.length}
            </span>
          </button>
        </div>

        {/* Content list */}
        {loadingOrders ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-[#5d51e8]" />
            <p className="text-xs font-bold text-slate-400">Loading live orders feed...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'available' && (
              availableOrders.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-[#5d51e8] rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No New Orders Available</p>
                  <p className="text-xs text-slate-400">All incoming orders have been claimed by the sales crew.</p>
                </div>
              ) : (
                availableOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    primaryActionText="Claim & Start Preparing"
                    onPrimaryAction={handleClaim}
                    actionLoading={actionLoading}
                    priceRangePct={priceRangePct}
                    onImageClick={setLightboxUrl}
                  />
                ))
              )
            )}

            {activeTab === 'active' && (
              myActiveOrders.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-2">
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Active Tasks</p>
                  <p className="text-xs text-slate-400">Claim an order from the available tab to start preparing it.</p>
                </div>
              ) : (
                myActiveOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    primaryActionText="Complete & Dispatch"
                    onPrimaryAction={handleComplete}
                    secondaryActionText="Release Order"
                    onSecondaryAction={handleRelease}
                    actionLoading={actionLoading}
                    priceRangePct={priceRangePct}
                    onImageClick={setLightboxUrl}
                  />
                ))
              )
            )}

            {activeTab === 'completed' && (
              myCompletedOrders.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-2">
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Completed Tasks</p>
                  <p className="text-xs text-slate-400">Completed order dispatches will show up here.</p>
                </div>
              ) : (
                myCompletedOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isCompleted={true}
                    priceRangePct={priceRangePct}
                    onImageClick={setLightboxUrl}
                  />
                ))
              )
            )}
          </div>
        )}

      </main>

      {/* ─── Order Preparation Assistant Modal ─── */}
      {prepOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col min-h-screen sm:min-h-[85dvh] max-h-screen sm:max-h-[90dvh] overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 dark:border-zinc-800/80 flex items-center justify-between bg-slate-50 dark:bg-zinc-955">
              <div>
                <h3 className="text-xs font-black uppercase text-[#5d51e8] tracking-widest">
                  {prepPhase === 'prep' ? 'Phase 1: Order Packing' : prepPhase === 'review' ? 'Phase 2: Review Held Items' : 'Phase 3: Dispatch Summary'}
                </h3>
                <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 mt-0.5">
                  Preparing Order for <span className="text-slate-900 dark:text-white font-extrabold">{prepOrder.userName}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to exit order preparation? Your progress for this session will not be saved.")) {
                    setPrepOrder(null);
                  }
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1.5 relative overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#5d51e8] to-[#8c82ff] h-full transition-all duration-300 rounded-r"
                style={{ 
                  width: `${((prepPhase === 'summary' ? prepOrder.items.length : prepIndex) / prepOrder.items.length) * 100}%` 
                }}
              />
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              
              {/* PHASES 1 & 2: Packing and Review */}
              {(prepPhase === 'prep' || prepPhase === 'review') && (() => {
                const item = prepOrder.items[prepIndex];
                if (!item) return null;
                return (
                  <div className="space-y-6 text-center">
                    
                    {/* Step Info */}
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                      <span>Item {prepIndex + 1} of {prepOrder.items.length}</span>
                      {prepPhase === 'review' && (
                        <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded text-[9px]">
                          ⚠️ Rechecking Hold Item
                        </span>
                      )}
                    </div>

                    {/* Full Size Design Image */}
                    <div className="relative group max-w-2xl mx-auto">
                      {item.selectedImageUrl ? (
                        <div 
                          onClick={() => setLightboxUrl(item.selectedImageUrl || null)}
                          className="w-full h-[500px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 shadow-inner flex items-center justify-center cursor-zoom-in group/img transition-all hover:border-[#5d51e8] hover:shadow-lg relative"
                          title="Click to view full screen"
                        >
                          <img 
                            src={item.selectedImageUrl} 
                            alt={item.nameEn}
                            className="max-w-full max-h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-200">
                            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-black px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                              🔍 Click to Zoom Fullscreen
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-[500px] rounded-2xl border border-dashed border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-slate-400 p-6">
                          <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2" />
                          <p className="text-xs font-bold">No Image Available for this Product</p>
                        </div>
                      )}
                    </div>

                    {/* Product & Variant Specs */}
                    <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-5 border border-slate-150/60 dark:border-zinc-850 text-left space-y-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {item.nameEn} {item.nameHi && <span className="text-slate-400 dark:text-zinc-500 font-medium">({item.nameHi})</span>}
                        </h4>
                        <p className="text-xs text-indigo-500 font-black uppercase mt-1">
                          {item.selectedVariant ? `Variant: ${item.selectedVariant}` : 'Standard Variant'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 text-xs font-bold text-slate-500 dark:text-zinc-400">
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Product Code</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{item.code || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Design Number</span>
                          <span className="text-slate-800 dark:text-slate-200 font-extrabold">{item.design || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Required Quantity display */}
                      <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-950/10 border border-indigo-150/60 dark:border-indigo-900/30 rounded-xl p-4 flex items-center justify-between mt-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black uppercase text-[#5d51e8] tracking-wider block">Quantity Requested</span>
                          <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">Standard measurement unit</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-[#5d51e8] dark:text-indigo-400">
                            {item.quantity}
                          </span>
                          <span className="text-xs font-black text-slate-450 dark:text-zinc-500 uppercase tracking-widest ml-1.5">
                            {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })()}

              {/* PHASE 3: Summary Display */}
              {prepPhase === 'summary' && (
                <div className="space-y-6">
                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Review Order Status</h4>
                    <p className="text-xs text-slate-400">Double check found and missing stock items before saving.</p>
                  </div>

                  <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-zinc-800">
                    {prepOrder.items.map((item, idx) => {
                      const status = prepStates[idx] || 'found';
                      return (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-950/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {item.selectedImageUrl && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-850 flex-shrink-0 bg-slate-50 dark:bg-zinc-950">
                                <img src={item.selectedImageUrl} alt={item.nameEn} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="text-left">
                              <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 max-w-[200px] sm:max-w-[320px] truncate">{item.nameEn}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                Qty: {item.quantity} {item.unit} | {item.selectedVariant || 'Standard'}
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            {status === 'found' ? (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250/20 px-2.5 py-1 rounded-lg">
                                ✅ Found
                              </span>
                            ) : (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-955/40 dark:text-rose-300 border border-rose-250/20 px-2.5 py-1 rounded-lg">
                                ❌ Not Found
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer / Controls */}
            <div className="px-6 py-4 border-t border-slate-150 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-955 flex items-center justify-between">
              
              {/* Back navigation during phase 1 */}
              {prepPhase === 'prep' && prepIndex > 0 ? (
                <button
                  onClick={() => setPrepIndex(prepIndex - 1)}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl text-xs font-black text-slate-600 dark:text-zinc-350 cursor-pointer"
                >
                  Previous
                </button>
              ) : (
                <div />
              )}

              {/* Action Buttons based on Phase */}
              <div className="flex gap-2">
                
                {/* Phase 1 Packing Controls */}
                {prepPhase === 'prep' && (
                  <>
                    <button
                      onClick={() => markItem(prepIndex, 'hold')}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all"
                    >
                      ⏳ Put on Hold
                    </button>
                    <button
                      onClick={() => markItem(prepIndex, 'found')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 cursor-pointer active:scale-95 transition-all"
                    >
                      ✅ Found & Packed
                    </button>
                  </>
                )}

                {/* Phase 2 Review Controls */}
                {prepPhase === 'review' && (
                  <>
                    <button
                      onClick={() => resolveHeldItem(prepIndex, 'not_found')}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-705 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/10 cursor-pointer active:scale-95 transition-all"
                    >
                      ❌ Reject (Not Found)
                    </button>
                    <button
                      onClick={() => resolveHeldItem(prepIndex, 'found')}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 cursor-pointer active:scale-95 transition-all"
                    >
                      ✅ Found
                    </button>
                  </>
                )}

                {/* Phase 3 Summary Controls */}
                {prepPhase === 'summary' && (
                  <button
                    disabled={prepSubmitting}
                    onClick={submitPreparation}
                    className="px-6 py-2.5 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white rounded-xl text-xs font-black shadow-md shadow-[#5d51e8]/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-75"
                  >
                    {prepSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Complete & Dispatch</span>
                    )}
                  </button>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal for High Resolution Design Inspection */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <button 
            type="button"
            onClick={() => setLightboxUrl(null)} 
            className="absolute top-4 right-4 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer border border-white/20 shadow-lg z-[120]"
            title="Close Zoom"
          >
            <X className="w-6 h-6" />
          </button>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full h-full flex items-center justify-center p-0 cursor-default"
          >
            <img 
              src={lightboxUrl} 
              alt="High-resolution design" 
              className="w-full h-full object-cover animate-in zoom-in-95 duration-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Sub-component Card for order подготовка
interface OrderCardProps {
  order: Order;
  primaryActionText?: string;
  onPrimaryAction?: (id: string) => Promise<void>;
  secondaryActionText?: string;
  onSecondaryAction?: (id: string) => Promise<void>;
  isCompleted?: boolean;
  actionLoading?: string | null;
  priceRangePct?: number;
  onImageClick?: (url: string) => void;
}

function OrderCard({
  order,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  isCompleted = false,
  actionLoading = null,
  priceRangePct = 5,
  onImageClick
}: OrderCardProps) {
  const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isLoading = actionLoading === order.id;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow text-left">

      {/* Client details */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-[#5d51e8]/10 text-[#5d51e8] rounded-lg">
              <User className="w-3.5 h-3.5" />
            </span>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{order.userName}</h4>
          </div>
          <p className="text-[10px] text-slate-450 dark:text-zinc-550 pl-6">{order.userEmail}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-black">
            <Calendar className="w-3.5 h-3.5" />
            <span>{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">Total Est Range</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {(() => {
                let minTotal = 0;
                let maxTotal = 0;
                order.items.forEach(item => {
                  const qty = item.quantity || 1;
                  if (item.minPrice !== undefined && item.maxPrice !== undefined && item.minPrice !== null && item.maxPrice !== null && item.minPrice > 0 && item.maxPrice > 0) {
                    minTotal += item.minPrice * qty;
                    maxTotal += item.maxPrice * qty;
                  } else {
                    const itemPct = item.priceRangePct !== undefined ? item.priceRangePct : priceRangePct;
                    const factor = itemPct / 100;
                    minTotal += item.price * (1 - factor) * qty;
                    maxTotal += item.price * (1 + factor) * qty;
                  }
                });
                return `₹${Math.floor(minTotal).toLocaleString('en-IN')} - ₹${Math.ceil(maxTotal).toLocaleString('en-IN')}`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Ordered Items</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {order.items.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/50 dark:bg-zinc-950 border border-slate-150/40 dark:border-zinc-850 p-2 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {item.selectedImageUrl ? (
                  <div 
                    onClick={() => onImageClick?.(item.selectedImageUrl || '')}
                    className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-150 dark:bg-zinc-900 flex-shrink-0 cursor-zoom-in hover:border-[#5d51e8] transition-all hover:scale-105 active:scale-95"
                    title="Click to view full screen"
                  >
                    <img src={item.selectedImageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 text-slate-400">
                    <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                  </div>
                )}
                <div className="text-left space-y-0.5 min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{item.nameEn}</p>
                  {item.selectedVariant && (
                    <p className="text-[10px] text-indigo-500 dark:text-indigo-450 font-extrabold uppercase truncate">
                      Variant: {item.selectedVariant}
                    </p>
                  )}
                  <p className="text-[9px] text-[#5d51e8] dark:text-indigo-400 font-bold uppercase truncate">
                    {(item.code || item.design) ? `C: ${item.code || 'N/A'} | D: ${item.design || 'N/A'}` : 'No Code/Design'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded flex-shrink-0">
                x{item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action block */}
      {!isCompleted && (onPrimaryAction || onSecondaryAction) && (
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
          {onSecondaryAction && secondaryActionText && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onSecondaryAction(order.id || '')}
              className="px-4 py-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl text-xs font-extrabold text-slate-600 dark:text-zinc-350 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
            >
              {secondaryActionText}
            </button>
          )}

          {onPrimaryAction && primaryActionText && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onPrimaryAction(order.id || '')}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white rounded-xl text-xs font-black shadow-md shadow-[#5d51e8]/10 cursor-pointer active:scale-95 transition-all disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{primaryActionText}</span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
