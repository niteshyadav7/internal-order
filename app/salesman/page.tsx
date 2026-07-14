'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { 
  Order, 
  subscribeToOrders, 
  claimOrder, 
  completeOrder, 
  releaseOrder, 
  getPriceRange 
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
  Loader2 
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

  const handleComplete = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await completeOrder(orderId);
    } catch (e) {
      console.error(e);
      alert("Error completing order.");
    } finally {
      setActionLoading(null);
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
            <XCircleIcon className="w-8 h-8" />
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
        
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-[1.5rem] border border-slate-150 dark:border-zinc-800 shadow-sm flex gap-1">
          <button
            onClick={() => setActiveTab('available')}
            className={`w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'available'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Available ({availableOrders.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('active')}
            className={`w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Active ({myActiveOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finished ({myCompletedOrders.length})</span>
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
                  />
                ))
              )
            )}
          </div>
        )}

      </main>
    </div>
  );
}

// XCircle Icon mock
function XCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
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
}

function OrderCard({
  order,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  isCompleted = false,
  actionLoading = null
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
            <span className="text-xs font-black text-slate-900 dark:text-white">{getPriceRange(orderTotal)}</span>
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
              className="bg-slate-50/50 dark:bg-zinc-950 border border-slate-150/40 dark:border-zinc-850 p-2.5 rounded-xl flex items-center justify-between"
            >
              <div className="text-left space-y-0.5 max-w-[70%]">
                <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{item.nameEn}</p>
                <p className="text-[9px] text-[#5d51e8] dark:text-indigo-400 font-bold uppercase">
                  {(item.code || item.design) ? `C: ${item.code || 'N/A'} | D: ${item.design || 'N/A'}` : 'No Code/Design'}
                </p>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded">
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
