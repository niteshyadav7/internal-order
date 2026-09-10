'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Order,
  getPriceRange,
  Product,
  OrderItem,
  abandonVariant,
  addSalesmanNote,
  subscribeToUserProfiles,
  UserProfile
} from '../lib/db';
import { playOrderChime, initAudioContext, enableAudio } from '../lib/audio';
import { requestNotificationPermissionAndGetToken } from '../lib/fcmClient';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  subscribeToOrdersAction,
  claimOrderThunk,
  completeOrderThunk,
  releaseOrderThunk,
  updateOrderThunk,
  joinOrderThunk,
  leaveOrderThunk,
  updateOrderItemPrepThunk
} from '../store/ordersSlice';
import {
  fetchProductsThunk,
  flagProductOutOfStockThunk
} from '../store/productsSlice';
import {
  ShoppingBag,
  CheckCircle,
  Clock,
  User,
  Building2,
  LogOut,
  Calendar,
  Truck,
  Sparkles,
  Loader2,
  X,
  XCircle,
  Smartphone,
  Shirt,
  Bed,
  Activity,
  Package,
  Home as HomeIcon,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  PackageX,
  Volume2,
  Users,
  UserPlus,
  ListChecks,
  CheckCheck,
  Check,
  LayoutGrid,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import Button from '../components/atoms/Button';
import ClientProductGrid from '../components/organisms/ClientProductGrid';
import { getTranslation, LangType } from '../lib/translations';

export default function SalesmanPortal() {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loadingOrders } = useSelector((state: RootState) => state.orders);
  const { products: productsList, loading: loadingProducts, globalSettings } = useSelector((state: RootState) => state.products);

  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed' | 'products'>('available');
  const [productsSearchQuery, setProductsSearchQuery] = useState('');
  const [lang, setLang] = useState<LangType>('en');
  const t = (key: any) => getTranslation(lang, key);

  // Dynamic window/tab title
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      available: 'Sales - Available Orders',
      active: 'Sales - My Active Orders',
      completed: 'Sales - Completed Orders',
      products: 'Sales - Products Catalog'
    };
    document.title = tabTitles[activeTab] || 'Salesman Portal';
  }, [activeTab]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const priceRangePct = globalSettings?.priceRangePct || 5;

  // Authenticate user and restrict access to Salesmen only
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  // Real-time listener for user profiles to resolve Firm Names
  useEffect(() => {
    if (!user || (userProfile && userProfile.role !== 'salesman')) return;
    const unsub = subscribeToUserProfiles((profiles) => {
      setUserProfiles(profiles);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user, userProfile]);

  const getFirmName = (o: Order) => {
    if (o.userFirmName && o.userFirmName.trim()) return o.userFirmName;
    const match = userProfiles.find(
      p => p.uid === o.userUid || (p.email && o.userEmail && p.email.toLowerCase() === o.userEmail.toLowerCase())
    );
    if (match) {
      if (match.customDetails && Object.values(match.customDetails).length > 0) {
        const val = Object.values(match.customDetails)[0];
        if (val) return val;
      }
      if (match.requestedFirmName) return match.requestedFirmName;
    }
    return '';
  };

  // Real-time listener for orders
  useEffect(() => {
    if (!user || (userProfile && userProfile.role !== 'salesman')) return;
    const unsubscribe = dispatch(subscribeToOrdersAction());
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user, userProfile, dispatch]);

  // Option 4: Register FCM Push Token for mobile & desktop notifications + Mobile Audio Unlock
  useEffect(() => {
    if (user && userProfile?.role === 'salesman') {
      requestNotificationPermissionAndGetToken(user.uid);
    }
    const handleGesture = () => {
      initAudioContext();
    };
    window.addEventListener('touchstart', handleGesture, { once: true });
    window.addEventListener('click', handleGesture, { once: true });
    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, [user, userProfile]);

  // Option 1: Live Order Arrival Detector for Audio Chime & Animated Toast Alerts
  const prevPendingOrderIdsRef = React.useRef<Set<string>>(new Set());
  const isInitialOrderLoadRef = React.useRef(true);

  useEffect(() => {
    if (loadingOrders || !orders) return;

    const currentPendingIds = new Set(
      orders.filter(o => o.status === 'pending' && !o.assignedSalesmanUid).map(o => o.id!).filter(Boolean)
    );

    if (isInitialOrderLoadRef.current) {
      prevPendingOrderIdsRef.current = currentPendingIds;
      isInitialOrderLoadRef.current = false;
      return;
    }

    // Check if any new pending order arrived that wasn't in previous snapshot
    let newlyArrivedOrder: Order | null = null;
    currentPendingIds.forEach(id => {
      if (!prevPendingOrderIdsRef.current.has(id)) {
        const found = orders.find(o => o.id === id);
        if (found) newlyArrivedOrder = found;
      }
    });

    if (newlyArrivedOrder) {
      // Play pleasant bell chime sound
      playOrderChime();
      // Show animated visual toast banner
      showToast(`🚨 NEW ORDER RECEIVED! Order from ${(newlyArrivedOrder as Order).userName}`, 'success');
    }

    prevPendingOrderIdsRef.current = currentPendingIds;
  }, [orders, loadingOrders]);

  // Eagerly fetch product catalog so live design-wise locations are available across all order views
  useEffect(() => {
    if (user && userProfile?.role === 'salesman') {
      dispatch(fetchProductsThunk());
    }
  }, [user, userProfile, dispatch]);

  // Helper to dynamically resolve design-wise location from live product variants or item snapshot
  const getItemDesignLocation = (item: OrderItem): string => {
    const product = productsList.find(p => p.id === item.productId);
    if (product && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => 
        (item.designNo && v.designNo && v.designNo.trim().toLowerCase() === item.designNo.trim().toLowerCase()) ||
        (item.selectedVariant && (
          (v.name && v.name.trim().toLowerCase() === item.selectedVariant.trim().toLowerCase()) ||
          (v.designNo && v.designNo.trim().toLowerCase() === item.selectedVariant.trim().toLowerCase())
        )) ||
        (item.design && v.designNo && v.designNo.trim().toLowerCase() === item.design.trim().toLowerCase()) ||
        (item.selectedImageUrl && product.images?.[v.imageIndex]?.url === item.selectedImageUrl)
      );
      if (variant?.location && variant.location.trim()) {
        return variant.location.trim();
      }
    }
    return item.location?.trim() || product?.location?.trim() || '';
  };

  const getItemDesignNo = (item: OrderItem): string => {
    const product = productsList.find(p => p.id === item.productId);
    if (product && product.variants && product.variants.length > 0) {
      const variant = product.variants.find(v => 
        (item.designNo && v.designNo && v.designNo.trim().toLowerCase() === item.designNo.trim().toLowerCase()) ||
        (item.selectedVariant && (
          (v.name && v.name.trim().toLowerCase() === item.selectedVariant.trim().toLowerCase()) ||
          (v.designNo && v.designNo.trim().toLowerCase() === item.selectedVariant.trim().toLowerCase())
        )) ||
        (item.design && v.designNo && v.designNo.trim().toLowerCase() === item.design.trim().toLowerCase()) ||
        (item.selectedImageUrl && product.images?.[v.imageIndex]?.url === item.selectedImageUrl)
      );
      if (variant?.designNo && variant.designNo.trim()) {
        return variant.designNo.trim();
      }
    }
    return item.designNo || item.design || item.selectedVariant || '';
  };

  // Helper to get Category/Product Icons for Retail Store
  const getProductIcon = (category: string, size = "w-6 h-6") => {
    switch (category.toLowerCase()) {
      case 'electronics':
        return <Smartphone className={size} />;
      case 'fashion':
        return <Shirt className={size} />;
      case 'home & kitchen':
        return <HomeIcon className={size} />;
      case 'beauty & care':
        return <Sparkles className={size} />;
      case 'furniture & decor':
        return <Bed className={size} />;
      case 'fitness':
        return <Activity className={size} />;
      default:
        return <Package className={size} />;
    }
  };

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

  // In-progress orders where current salesman is NOT the primary and NOT in collaborators (available to join)
  const inProgressCoOrders = useMemo(() => {
    return orders.filter(o => 
      o.status === 'processing' && 
      o.assignedSalesmanUid !== user?.uid && 
      !o.collaborators?.some(c => c.uid === user?.uid)
    );
  }, [orders, user]);

  const myActiveOrders = useMemo(() => {
    return orders.filter(o => 
      (o.assignedSalesmanUid === user?.uid || o.collaborators?.some(c => c.uid === user?.uid)) && 
      o.status === 'processing'
    );
  }, [orders, user]);

  const myCompletedOrders = useMemo(() => {
    return orders.filter(o => 
      (o.assignedSalesmanUid === user?.uid || o.collaborators?.some(c => c.uid === user?.uid)) && 
      o.status === 'completed'
    );
  }, [orders, user]);

  const handleClaim = async (orderId: string) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      const name = userProfile?.name || user.email || 'Salesman';
      await dispatch(claimOrderThunk({ orderId, salesmanUid: user.uid, salesmanName: name })).unwrap();
      showToast('Order claimed! Opening in your Active Tasks.', 'success');
      setActiveTab('active');
    } catch (e) {
      console.error(e);
      alert("Error claiming order.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoin = async (orderId: string) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      const name = userProfile?.name || user.email || 'Salesman';
      await dispatch(joinOrderThunk({ orderId, salesmanUid: user.uid, salesmanName: name })).unwrap();
      showToast('🤝 Joined order! Added to your Active Tasks for co-picking.', 'success');
      setActiveTab('active');
    } catch (e) {
      console.error(e);
      alert("Error joining order.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (orderId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to leave this order collaboration?")) return;
    setActionLoading(orderId);
    try {
      await dispatch(leaveOrderThunk({ orderId, salesmanUid: user.uid })).unwrap();
      showToast('You left the order collaboration.', 'success');
    } catch (e) {
      console.error(e);
      alert("Error leaving order.");
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Preparation Wizard State ───
  type PrepStatus = 'found' | 'hold' | 'not_found';
  const [prepOrderId, setPrepOrderId] = useState<string | null>(null); // Order ID currently being prepared
  const [prepPhase, setPrepPhase] = useState<'prep' | 'review' | 'summary'>('prep');
  const [wizardView, setWizardView] = useState<'checklist' | 'stepper'>('checklist');
  const [prepIndex, setPrepIndex] = useState(0);   // Current item index for stepper
  const [prepSubmitting, setPrepSubmitting] = useState(false);
  const [itemUpdatingIndex, setItemUpdatingIndex] = useState<number | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'unpicked' | 'hold' | 'found'>('all');

  // Real-time synced order from Redux state
  const livePrepOrder = useMemo(() => {
    if (!prepOrderId) return null;
    return orders.find(o => o.id === prepOrderId) || null;
  }, [orders, prepOrderId]);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Stock flag loading state for Products tab
  const [flaggingProductId, setFlaggingProductId] = useState<string | null>(null);

  const startPreparation = (order: Order) => {
    if (!order.id) return;
    setPrepOrderId(order.id);
    setPrepPhase('prep');
    setWizardView('checklist'); // Default to warehouse checklist
    // Find first unpicked item for stepper
    const firstUnpicked = order.items.findIndex(i => !i.prepStatus);
    setPrepIndex(firstUnpicked !== -1 ? firstUnpicked : 0);
  };

  const markItem = async (index: number, status: PrepStatus) => {
    if (!livePrepOrder || !livePrepOrder.id || !user) return;
    setItemUpdatingIndex(index);
    const salesmanName = userProfile?.name || user.email || 'Salesman';
    try {
      await dispatch(updateOrderItemPrepThunk({
        orderId: livePrepOrder.id,
        itemIndex: index,
        prepStatus: status,
        salesmanUid: user.uid,
        salesmanName
      })).unwrap();

      // In stepper view, advance to the next unpicked item
      if (wizardView === 'stepper') {
        const totalItems = livePrepOrder.items.length;
        let nextIdx = -1;
        for (let i = index + 1; i < totalItems; i++) {
          if (!livePrepOrder.items[i]?.prepStatus) {
            nextIdx = i;
            break;
          }
        }
        if (nextIdx !== -1) {
          setPrepIndex(nextIdx);
        } else {
          // Check from beginning for any unpicked
          const anyUnpicked = livePrepOrder.items.findIndex((item, i) => i !== index && !item.prepStatus);
          if (anyUnpicked !== -1) {
            setPrepIndex(anyUnpicked);
          }
        }
      }
    } catch (err) {
      console.error("Error updating item prep:", err);
      showToast("Error updating item status", "error");
    } finally {
      setItemUpdatingIndex(null);
    }
  };

  const submitPreparation = async () => {
    if (!livePrepOrder || !livePrepOrder.id || !user) return;
    
    // Check if any items are unpicked or on hold
    const pendingItems = livePrepOrder.items.filter(item => !item.prepStatus || item.prepStatus === 'hold');
    if (pendingItems.length > 0) {
      if (!confirm(`Warning: There are ${pendingItems.length} item(s) that are still unpicked or on hold. Are you sure you want to finalize and dispatch now? Any remaining unpicked items will be marked as found.`)) {
        return;
      }
    }

    setPrepSubmitting(true);
    try {
      const salesmanName = userProfile?.name || user.email || 'Salesman';
      const updatedItems = livePrepOrder.items.map((item) => ({
        ...item,
        prepStatus: (item.prepStatus && item.prepStatus !== 'hold') ? item.prepStatus : 'found',
        pickedByUid: item.pickedByUid || user.uid,
        pickedByName: item.pickedByName || salesmanName
      }));
      await dispatch(updateOrderThunk({ orderId: livePrepOrder.id, updatedItems: updatedItems as any })).unwrap();
      await dispatch(completeOrderThunk(livePrepOrder.id)).unwrap();

      // Auto-create stock alerts and soft-archive to abandoned for items marked as not_found
      const notFoundItems = updatedItems.filter(i => i.prepStatus === 'not_found');
      for (const item of notFoundItems) {
        try {
          const prod = productsList.find(p => p.id === item.productId);
          if (prod && prod.id && prod.variants && prod.variants.length > 0) {
            const vIdx = prod.variants.findIndex(v => 
              (item.designNo && v.designNo && v.designNo.toLowerCase() === item.designNo.toLowerCase()) ||
              (item.selectedVariant && v.name && v.name.toLowerCase() === item.selectedVariant.toLowerCase()) ||
              (item.selectedImageUrl && prod.images?.[v.imageIndex]?.url === item.selectedImageUrl)
            );
            if (vIdx !== -1) {
              await abandonVariant(prod.id, vIdx, prod.variants, 'salesman_unfound');
            }
          }
          await dispatch(flagProductOutOfStockThunk({
            product: { id: item.productId, nameEn: item.nameEn } as any,
            user,
            userProfile
          })).unwrap();
        } catch (alertErr) {
          console.warn("Stock alert creation warning:", alertErr);
        }
      }
      if (notFoundItems.length > 0) {
        showToast(`${notFoundItems.length} design(s) moved to Abandoned & stock alert sent`, 'success');
      } else {
        showToast("🎉 Order completed and marked dispatched successfully!", "success");
      }

      setPrepOrderId(null);
    } catch (e) {
      console.error(e);
      alert("Error completing preparation.");
    } finally {
      setPrepSubmitting(false);
    }
  };

  const handleComplete = async (orderId: string) => {
    const order = myActiveOrders.find(o => o.id === orderId);
    if (order) {
      startPreparation(order);
    }
  };

  const handleRelease = async (orderId: string) => {
    if (!confirm("Are you sure you want to release this order back to the queue?")) return;
    setActionLoading(orderId);
    try {
      await dispatch(releaseOrderThunk(orderId)).unwrap();
      showToast('Order released back to available queue.', 'success');
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

  // Performance stats computed from orders
  const todayStr = new Date().toDateString();
  const todayCompleted = myCompletedOrders.filter(o => new Date(o.createdAt).toDateString() === todayStr);
  const allCompletedItems = myCompletedOrders.flatMap(o => o.items);
  const itemsFoundRate = allCompletedItems.length > 0
    ? Math.round((allCompletedItems.filter(i => i.prepStatus === 'found' || !i.prepStatus).length / allCompletedItems.length) * 100)
    : 100;

  // Handle stock flagging from Products tab
  const handleFlagOutOfStock = async (product: Product) => {
    if (!product.id || !user) return;
    setFlaggingProductId(product.id);
    try {
      await dispatch(flagProductOutOfStockThunk({ product, user, userProfile })).unwrap();
      showToast(`"${product.nameEn}" flagged out of stock. Admin notified.`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to update stock status', 'error');
    } finally {
      setFlaggingProductId(null);
    }
  };

  // Handle adding salesman note to an order
  const handleAddNote = async (orderId: string, note: string) => {
    try {
      await addSalesmanNote(orderId, note);
      showToast('Note saved successfully', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to save note', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-300 font-sans pb-12">
      {/* Live Animated Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-5 duration-300 max-w-md w-full px-4">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center justify-between backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-slate-900/90 text-white border-indigo-500/40 shadow-indigo-500/10'
              : 'bg-rose-950/90 text-white border-rose-500/40 shadow-rose-500/10'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#5d51e8] rounded-xl text-white animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs font-black tracking-wide">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="p-1 hover:bg-white/10 rounded-lg text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              enableAudio();
              playOrderChime();
              showToast('🔔 Sound Alert Active & Tested!', 'success');
            }}
            className="p-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-[#5d51e8] dark:text-indigo-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-extrabold border border-indigo-200/50 dark:border-indigo-800/40"
            title="Enable and test audio chime alert"
          >
            <Volume2 className="w-4 h-4 text-[#5d51e8] dark:text-indigo-300" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-550 dark:text-zinc-450 hover:text-rose-600 dark:hover:text-rose-450 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="max-w-4xl w-full mx-auto p-6 space-y-6">

        {/* Salesman Welcome & Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in duration-300">
          <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-500 to-[#5d51e8] text-white p-5 rounded-3xl shadow-md space-y-2 relative overflow-hidden flex flex-col justify-between min-h-[110px]">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
              <User className="w-32 h-32" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Welcome Back</p>
              <h2 className="text-base font-black truncate">{userProfile?.name || 'Salesperson'}</h2>
            </div>
            <p className="text-[10px] font-bold text-indigo-100/90">Ready to pack today's shipments?</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Available</p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{availableOrders.length + inProgressCoOrders.length}</span>
              <span className="text-[10px] font-bold text-slate-450">in queue</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: (availableOrders.length + inProgressCoOrders.length) > 0 ? '50%' : '0%' }} />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
            <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Today Done</p>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-[#5d51e8] dark:text-indigo-400">{todayCompleted.length}</span>
              <span className="text-[10px] font-bold text-slate-450">dispatched</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1 rounded-full overflow-hidden">
              <div className="bg-[#5d51e8] h-full rounded-full transition-all duration-500" style={{ width: todayCompleted.length > 0 ? '100%' : '0%' }} />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <p className="text-[10px] uppercase font-black tracking-wider text-slate-400">Find Rate</p>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className={`text-2xl sm:text-3xl font-black ${itemsFoundRate >= 90 ? 'text-emerald-600 dark:text-emerald-400' : itemsFoundRate >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                {itemsFoundRate}%
              </span>
              <span className="text-[10px] font-bold text-slate-450">items found</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-1 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${itemsFoundRate >= 90 ? 'bg-emerald-500' : itemsFoundRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${itemsFoundRate}%` }} />
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
              {availableOrders.length + inProgressCoOrders.length}
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

          <button
            onClick={() => setActiveTab('products')}
            className={`w-full py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] min-[375px]:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer ${activeTab === 'products'
                ? 'bg-[#5d51e8] text-white shadow-md shadow-[#5d51e8]/10'
                : 'text-slate-500 hover:text-slate-800 dark:text-zinc-450 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
              }`}
          >
            <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 hidden sm:inline" />
            <span>Products</span>
          </button>
        </div>

        {/* Content list */}
        {activeTab === 'products' ? (
          <ClientProductGrid
            products={productsList}
            filteredProducts={productsList}
            loading={loadingProducts}
            searchQuery={productsSearchQuery}
            onSearchChange={setProductsSearchQuery}
            selectedIds={new Set<string>()}
            onToggleProduct={() => {}}
            onPlaceOrder={() => {}}
            submittingOrder={false}
            lang={lang}
            t={t}
            profileName={userProfile?.name || 'Salesman'}
            getProductIcon={getProductIcon}
            categoriesList={globalSettings?.categories || []}
            priceRangePct={priceRangePct}
            readOnly={true}
            onFlagStock={handleFlagOutOfStock}
            flaggingProductId={flaggingProductId}
          />
        ) : loadingOrders ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <Loader2 className="animate-spin h-8 w-8 text-[#5d51e8]" />
            <p className="text-xs font-bold text-slate-400">Loading live orders feed Feed...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'available' && (
              (availableOrders.length === 0 && inProgressCoOrders.length === 0) ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/20 text-[#5d51e8] rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Orders Available</p>
                  <p className="text-xs text-slate-400">All incoming orders have been claimed and are being packed.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Section 1: Unclaimed New Orders */}
                  {availableOrders.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                          New Unclaimed Orders ({availableOrders.length})
                        </h3>
                      </div>
                      {availableOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          currentUserUid={user?.uid}
                          firmName={getFirmName(order)}
                          primaryActionText="Claim & Start Preparing"
                          onPrimaryAction={handleClaim}
                          actionLoading={actionLoading}
                          priceRangePct={priceRangePct}
                          onImageClick={setLightboxUrl}
                          getItemDesignLocation={getItemDesignLocation}
                          getItemDesignNo={getItemDesignNo}
                        />
                      ))}
                    </div>
                  )}

                  {/* Section 2: In-Progress Orders Open for Co-Picking */}
                  {inProgressCoOrders.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200/80 dark:border-zinc-850">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] rounded-xl">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                              <span>🤝 Open for Co-Pick / Team Sharing</span>
                              <span className="bg-indigo-100 dark:bg-indigo-950/60 text-[#5d51e8] dark:text-indigo-300 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                                {inProgressCoOrders.length}
                              </span>
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold">
                              Join your teammates on large orders to pick items together simultaneously
                            </p>
                          </div>
                        </div>
                      </div>
                      {inProgressCoOrders.map(order => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          currentUserUid={user?.uid}
                          firmName={getFirmName(order)}
                          primaryActionText="🤝 Join Co-Pick"
                          onPrimaryAction={handleJoin}
                          actionLoading={actionLoading}
                          priceRangePct={priceRangePct}
                          onImageClick={setLightboxUrl}
                          getItemDesignLocation={getItemDesignLocation}
                          getItemDesignNo={getItemDesignNo}
                          isCoPicking={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            )}

            {activeTab === 'active' && (
              myActiveOrders.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-2">
                  <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">No Active Tasks</p>
                  <p className="text-xs text-slate-400">Claim an order or join a teammate on a large order to start packing.</p>
                </div>
              ) : (
                myActiveOrders.map(order => {
                  const isCollaborator = order.collaborators?.some(c => c.uid === user?.uid);
                  return (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentUserUid={user?.uid}
                      firmName={getFirmName(order)}
                      primaryActionText="📦 Open Preparation Assistant"
                      onPrimaryAction={handleComplete}
                      secondaryActionText={isCollaborator ? "Leave Collaboration" : "Release Order"}
                      onSecondaryAction={isCollaborator ? handleLeave : handleRelease}
                      actionLoading={actionLoading}
                      priceRangePct={priceRangePct}
                      onImageClick={setLightboxUrl}
                      showNotes={true}
                      onAddNote={handleAddNote}
                      getItemDesignLocation={getItemDesignLocation}
                      getItemDesignNo={getItemDesignNo}
                    />
                  );
                })
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
                    firmName={getFirmName(order)}
                    isCompleted={true}
                    priceRangePct={priceRangePct}
                    onImageClick={setLightboxUrl}
                    getItemDesignLocation={getItemDesignLocation}
                    getItemDesignNo={getItemDesignNo}
                  />
                ))
              )
            )}
          </div>
        )}

      </main>

      {/* ─── Collaborative Order Preparation Assistant Modal ─── */}
      {livePrepOrder && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPrepOrderId(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 w-full max-w-3xl sm:rounded-3xl shadow-2xl flex flex-col min-h-screen sm:min-h-[88dvh] max-h-screen sm:max-h-[92dvh] overflow-hidden border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 cursor-default"
          >
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-150 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-[#5d51e8]/10 text-[#5d51e8] dark:bg-indigo-950/40 dark:text-indigo-400 border border-[#5d51e8]/20 dark:border-indigo-800/60 rounded-md text-[10px] font-black uppercase tracking-wider">
                    Order #{livePrepOrder.id ? (livePrepOrder.id.length > 8 ? livePrepOrder.id.slice(-6).toUpperCase() : livePrepOrder.id) : ''}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {livePrepOrder.userName}
                  </span>
                  {getFirmName(livePrepOrder) && (
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-zinc-400">
                      ({getFirmName(livePrepOrder)})
                    </span>
                  )}
                </div>

                {/* Team Badges in Header */}
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                  <Users className="w-3.5 h-3.5 text-[#5d51e8]" />
                  <span>Lead: <strong className="text-slate-800 dark:text-slate-200">{livePrepOrder.assignedSalesmanName || 'Unassigned'}</strong></span>
                  {livePrepOrder.collaborators && livePrepOrder.collaborators.length > 0 && (
                    <>
                      <span>•</span>
                      <span>Co-Pickers: <strong className="text-purple-600 dark:text-purple-400">{livePrepOrder.collaborators.map(c => c.name).join(', ')}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* View Switcher & Close */}
              <div className="flex items-center gap-2">
                <div className="bg-slate-200/70 dark:bg-zinc-800 p-1 rounded-xl flex items-center gap-1 text-[10px] font-black">
                  <button
                    onClick={() => {
                      setPrepPhase('prep');
                      setWizardView('checklist');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      prepPhase !== 'summary' && wizardView === 'checklist'
                        ? 'bg-white dark:bg-zinc-900 text-[#5d51e8] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                    }`}
                    title="Warehouse Rack & Item Checklist"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Checklist</span>
                  </button>
                  <button
                    onClick={() => {
                      setPrepPhase('prep');
                      setWizardView('stepper');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      prepPhase !== 'summary' && wizardView === 'stepper'
                        ? 'bg-white dark:bg-zinc-900 text-[#5d51e8] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                    }`}
                    title="Visual Photo Stepper"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Stepper</span>
                  </button>
                  <button
                    onClick={() => setPrepPhase('summary')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      prepPhase === 'summary'
                        ? 'bg-white dark:bg-zinc-900 text-[#5d51e8] shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                    }`}
                    title="Review & Dispatch Summary"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Dispatch</span>
                  </button>
                </div>

                <button
                  onClick={() => setPrepOrderId(null)}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-xl transition-colors cursor-pointer"
                  title="Close Assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Collaborative Live Stats & Progress Bar */}
            {(() => {
              const total = livePrepOrder.items.length;
              const found = livePrepOrder.items.filter(i => i.prepStatus === 'found').length;
              const hold = livePrepOrder.items.filter(i => i.prepStatus === 'hold').length;
              const notFound = livePrepOrder.items.filter(i => i.prepStatus === 'not_found').length;
              const unpicked = livePrepOrder.items.filter(i => !i.prepStatus).length;
              const myPicks = livePrepOrder.items.filter(i => i.prepStatus === 'found' && i.pickedByUid === user?.uid).length;
              const teamPicks = found - myPicks;
              const pct = total > 0 ? Math.round((found / total) * 100) : 0;

              return (
                <div className="bg-slate-100/70 dark:bg-zinc-950/70 px-5 sm:px-6 py-2.5 border-b border-slate-150 dark:border-zinc-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-black flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        ✅ Packed: {found}/{total} ({pct}%)
                      </span>
                      {hold > 0 && (
                        <span className="text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                          ⏳ Hold: {hold}
                        </span>
                      )}
                      {notFound > 0 && (
                        <span className="text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                          ❌ Missing: {notFound}
                        </span>
                      )}
                      {unpicked > 0 && (
                        <span className="text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                          📦 Unpicked: {unpicked}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-extrabold flex items-center gap-1.5">
                      <span className="text-[#5d51e8]">You: {myPicks}</span>
                      {livePrepOrder.collaborators && livePrepOrder.collaborators.length > 0 && (
                        <span>• Teammates: {teamPicks}</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-[#5d51e8] to-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Modal Body / Scrollable Content */}
            <div className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-4">

              {/* ─── VIEW 1: WAREHOUSE RACK & ITEM CHECKLIST VIEW ─── */}
              {prepPhase !== 'summary' && wizardView === 'checklist' && (() => {
                const total = livePrepOrder.items.length;
                const unpickedCount = livePrepOrder.items.filter(i => !i.prepStatus).length;
                const holdCount = livePrepOrder.items.filter(i => i.prepStatus === 'hold').length;
                const foundCount = livePrepOrder.items.filter(i => i.prepStatus === 'found').length;

                // Filter items according to active pill
                const itemsWithIdx = livePrepOrder.items.map((item, idx) => ({ item, idx }));
                const filteredItems = itemsWithIdx.filter(({ item }) => {
                  if (checklistFilter === 'unpicked') return !item.prepStatus;
                  if (checklistFilter === 'hold') return item.prepStatus === 'hold';
                  if (checklistFilter === 'found') return item.prepStatus === 'found';
                  return true;
                });

                return (
                  <div className="space-y-4 text-left">
                    
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-slate-100 dark:border-zinc-800">
                      <button
                        onClick={() => setChecklistFilter('all')}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          checklistFilter === 'all'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                        }`}
                      >
                        All Items ({total})
                      </button>
                      <button
                        onClick={() => setChecklistFilter('unpicked')}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          checklistFilter === 'unpicked'
                            ? 'bg-[#5d51e8] text-white shadow-sm'
                            : 'bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 hover:bg-indigo-100'
                        }`}
                      >
                        📦 Unpicked ({unpickedCount})
                      </button>
                      {holdCount > 0 && (
                        <button
                          onClick={() => setChecklistFilter('hold')}
                          className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            checklistFilter === 'hold'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          ⏳ On Hold ({holdCount})
                        </button>
                      )}
                      <button
                        onClick={() => setChecklistFilter('found')}
                        className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          checklistFilter === 'found'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        ✅ Packed ({foundCount})
                      </button>
                    </div>

                    {/* Items Checklist Rows */}
                    <div className="space-y-2.5">
                      {filteredItems.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs font-bold bg-slate-50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
                          No items match this filter.
                        </div>
                      ) : (
                        filteredItems.map(({ item, idx }) => {
                          const loc = getItemDesignLocation(item);
                          const des = getItemDesignNo(item);
                          const isUpdating = itemUpdatingIndex === idx;

                          return (
                            <div
                              key={idx}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                item.prepStatus === 'found'
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-900/30'
                                  : item.prepStatus === 'hold'
                                  ? 'bg-amber-50/40 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/30'
                                  : item.prepStatus === 'not_found'
                                  ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-900/30'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {item.selectedImageUrl ? (
                                  <div 
                                    onClick={() => setLightboxUrl(item.selectedImageUrl || null)}
                                    className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 flex-shrink-0 cursor-zoom-in hover:border-[#5d51e8] transition-all"
                                    title="Click to zoom fullscreen"
                                  >
                                    <img src={item.selectedImageUrl} alt={item.nameEn} className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center flex-shrink-0 text-slate-400">
                                    <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                                  </div>
                                )}

                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm truncate">
                                      {item.nameEn}
                                    </h4>
                                    {item.brand && (
                                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                        {item.brand}
                                      </span>
                                    )}
                                    <span className="text-xs font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 rounded-lg">
                                      Qty: {item.quantity} {item.unit}
                                    </span>
                                  </div>

                                  {/* Single-Line Location & Detailing */}
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-250 border border-amber-500/30 rounded-lg font-black text-xs flex items-center gap-1">
                                      <span>📦 Rack:</span>
                                      <span className="underline">{loc || 'Not Set'}</span>
                                    </span>
                                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg font-black text-xs">
                                      Design: {des || 'N/A'}
                                    </span>
                                    {item.code && (
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                        Code: {item.code}
                                      </span>
                                    )}
                                  </div>

                                  {/* Pick Attribution Tag */}
                                  {item.prepStatus && (
                                    <div className="text-[10px] font-extrabold flex items-center gap-1.5 pt-0.5">
                                      {item.prepStatus === 'found' && (
                                        <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          Packed by <strong>{item.pickedByName || 'Teammate'}</strong> {item.pickedByUid === user?.uid ? '(You)' : ''}
                                        </span>
                                      )}
                                      {item.prepStatus === 'hold' && (
                                        <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                          ⚠️ Held by <strong>{item.pickedByName || 'Teammate'}</strong>
                                        </span>
                                      )}
                                      {item.prepStatus === 'not_found' && (
                                        <span className="text-rose-700 dark:text-rose-300 flex items-center gap-1">
                                          ❌ Marked Out of Stock by <strong>{item.pickedByName || 'Teammate'}</strong>
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action Buttons for this item */}
                              <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                                {isUpdating ? (
                                  <div className="px-4 py-1.5 flex items-center gap-1 text-xs text-[#5d51e8] font-bold">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Syncing...</span>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => markItem(idx, 'found')}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                        item.prepStatus === 'found'
                                          ? 'bg-emerald-600 text-white shadow-sm'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40'
                                      }`}
                                      title="Mark item as found & packed"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Found</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => markItem(idx, 'hold')}
                                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                        item.prepStatus === 'hold'
                                          ? 'bg-amber-500 text-white shadow-sm'
                                          : 'bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40'
                                      }`}
                                      title="Put item on hold for recheck"
                                    >
                                      <span>⏳ Hold</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => markItem(idx, 'not_found')}
                                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                        item.prepStatus === 'not_found'
                                          ? 'bg-rose-600 text-white shadow-sm'
                                          : 'bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/40'
                                      }`}
                                      title="Mark as out of stock / missing"
                                    >
                                      <span>❌ Missing</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })()}

              {/* ─── VIEW 2: VISUAL PHOTO STEPPER VIEW ─── */}
              {prepPhase !== 'summary' && wizardView === 'stepper' && (() => {
                const item = livePrepOrder.items[prepIndex];
                if (!item) return null;
                const loc = getItemDesignLocation(item);
                const des = getItemDesignNo(item);
                const isUpdating = itemUpdatingIndex === prepIndex;

                return (
                  <div className="space-y-6 text-center">
                    
                    {/* Stepper Navigation & Pick Status */}
                    <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                      <div className="flex items-center gap-2">
                        <span>Item {prepIndex + 1} of {livePrepOrder.items.length}</span>
                        {item.prepStatus === 'found' && (
                          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-black">
                            ✅ Packed by {item.pickedByName}
                          </span>
                        )}
                        {item.prepStatus === 'hold' && (
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-black">
                            ⚠️ On Hold by {item.pickedByName}
                          </span>
                        )}
                        {item.prepStatus === 'not_found' && (
                          <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-2 py-0.5 rounded text-[10px] font-black">
                            ❌ Marked Missing
                          </span>
                        )}
                      </div>

                      {/* Navigation pills */}
                      <div className="flex items-center gap-1">
                        <button
                          disabled={prepIndex === 0}
                          onClick={() => setPrepIndex(prev => Math.max(0, prev - 1))}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 rounded-lg"
                          title="Previous Item"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          disabled={prepIndex >= livePrepOrder.items.length - 1}
                          onClick={() => setPrepIndex(prev => Math.min(livePrepOrder.items.length - 1, prev + 1))}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-30 rounded-lg"
                          title="Next Item"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Full Size Design Image */}
                    <div className="relative group max-w-2xl mx-auto">
                      {item.selectedImageUrl ? (
                        <div 
                          onClick={() => setLightboxUrl(item.selectedImageUrl || null)}
                          className="w-full h-[380px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 shadow-inner flex items-center justify-center cursor-zoom-in group/img transition-all hover:border-[#5d51e8] hover:shadow-lg relative"
                          title="Click to view full screen"
                        >
                          <img 
                            src={item.selectedImageUrl} 
                            alt={item.nameEn}
                            className="max-w-full max-h-full object-contain"
                            loading="eager"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-200">
                            <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-black px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                              🔍 Click to Zoom Fullscreen
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-[380px] sm:h-[480px] rounded-2xl border border-dashed border-slate-250 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-slate-400 p-6">
                          <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2" />
                          <p className="text-xs font-bold">No Image Available for this Product</p>
                        </div>
                      )}
                    </div>

                    {/* Product & Single-Line Detailing Bar */}
                    <div className="bg-slate-50 dark:bg-zinc-950/40 rounded-2xl p-4 border border-slate-150/60 dark:border-zinc-850 text-left space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {item.nameEn} {item.nameHi && <span className="text-slate-400 dark:text-zinc-500 font-medium">({item.nameHi})</span>}
                        </h4>
                        <span className="text-xs font-black uppercase px-3 py-1 bg-gradient-to-r from-indigo-500 to-[#5d51e8] text-white rounded-xl shadow-sm">
                          Quantity: {item.quantity} {item.unit}
                        </span>
                      </div>

                      {/* Single-Line Detailing Row */}
                      <div className="flex items-center gap-2 flex-wrap text-xs bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/70 dark:border-zinc-800 shadow-sm">
                        <span className="px-2.5 py-1 bg-amber-500/15 text-amber-800 dark:text-amber-250 border border-amber-500/30 rounded-lg font-black text-xs flex items-center gap-1.5">
                          <span>📦 Location / Rack:</span>
                          <span className="text-sm font-black underline">{loc || 'Not Specified'}</span>
                        </span>
                        <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-lg font-black text-xs">
                          Design: {des || 'N/A'}
                        </span>
                        {item.code && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg font-bold text-xs">
                            Code: {item.code}
                          </span>
                        )}
                        {item.brand && (
                          <span className="px-2 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 rounded-lg font-bold text-xs">
                            Brand: {item.brand}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stepper Action Buttons */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        disabled={isUpdating}
                        onClick={() => markItem(prepIndex, 'hold')}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>⏳ Put on Hold</span>
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => markItem(prepIndex, 'found')}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>✅ Found & Packed</span>
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => markItem(prepIndex, 'not_found')}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/10 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <span>❌ Missing</span>
                      </button>
                    </div>

                  </div>
                );
              })()}

              {/* ─── VIEW 3: DISPATCH SUMMARY VIEW ─── */}
              {prepPhase === 'summary' && (() => {
                const total = livePrepOrder.items.length;
                const found = livePrepOrder.items.filter(i => i.prepStatus === 'found').length;
                const hold = livePrepOrder.items.filter(i => i.prepStatus === 'hold').length;
                const notFound = livePrepOrder.items.filter(i => i.prepStatus === 'not_found').length;
                const unpicked = livePrepOrder.items.filter(i => !i.prepStatus).length;

                return (
                  <div className="space-y-6 text-left">
                    <div className="text-center space-y-1">
                      <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Review Order Status Before Dispatch
                      </h4>
                      <p className="text-xs text-slate-400">
                        Verify that all items have been found and packed by the sales team.
                      </p>
                    </div>

                    {/* Unresolved Alert Banner */}
                    {(unpicked > 0 || hold > 0) && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-250">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                        <div className="text-xs">
                          <p className="font-black">Items Still Pending</p>
                          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            {unpicked} item(s) are unpicked and {hold} item(s) are on hold. Please resolve them or they will be marked packed upon dispatch.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="border border-slate-150 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-zinc-800">
                      {livePrepOrder.items.map((item, idx) => {
                        const status = item.prepStatus || 'unpicked';
                        const loc = getItemDesignLocation(item);
                        const des = getItemDesignNo(item);

                        return (
                          <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-zinc-950/30 transition-colors">
                            <div className="flex items-center gap-3">
                              {item.selectedImageUrl && (
                                <div 
                                  onClick={() => setLightboxUrl(item.selectedImageUrl || null)}
                                  className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-850 flex-shrink-0 bg-slate-50 dark:bg-zinc-950 cursor-zoom-in"
                                >
                                  <img src={item.selectedImageUrl} alt={item.nameEn} className="w-full h-full object-cover" />
                                </div>
                              )}
                              <div className="text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 max-w-[200px] sm:max-w-[320px] truncate">{item.nameEn}</p>
                                  {item.brand && (
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                                      {item.brand}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold flex items-center gap-2 flex-wrap mt-1">
                                  <span>Qty: {item.quantity} {item.unit}</span>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-250 border border-amber-500/30 rounded font-black flex items-center gap-1">
                                    <span>📦 Loc:</span>
                                    <span className="underline">{loc || 'Not Specified'}</span>
                                  </span>
                                  <span>•</span>
                                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded font-black">
                                    Design: {des || 'N/A'}
                                  </span>
                                </div>
                                {item.pickedByName && (
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    Picked by: <strong>{item.pickedByName}</strong> {item.pickedByUid === user?.uid ? '(You)' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              {status === 'found' ? (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-250/20 px-2.5 py-1 rounded-lg">
                                  ✅ Found
                                </span>
                              ) : status === 'hold' ? (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-250/20 px-2.5 py-1 rounded-lg">
                                  ⏳ On Hold
                                </span>
                              ) : status === 'not_found' ? (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-955/40 dark:text-rose-300 border border-rose-250/20 px-2.5 py-1 rounded-lg">
                                  ❌ Out of Stock
                                </span>
                              ) : (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 px-2.5 py-1 rounded-lg">
                                  📦 Unpicked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Modal Footer / Controls */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-slate-150 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between gap-2">
              
              <div>
                {prepPhase === 'summary' ? (
                  <button
                    onClick={() => {
                      setPrepPhase('prep');
                      setWizardView('checklist');
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl text-xs font-black text-slate-600 dark:text-zinc-350 cursor-pointer"
                  >
                    ← Back to Items
                  </button>
                ) : (
                  <button
                    onClick={() => setPrepOrderId(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200/50 dark:hover:bg-zinc-800 rounded-xl text-xs font-black text-slate-600 dark:text-zinc-350 cursor-pointer"
                  >
                    Close (Saved)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {prepPhase !== 'summary' ? (
                  <button
                    onClick={() => setPrepPhase('summary')}
                    className="px-5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-[#5d51e8] dark:text-indigo-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    <span>Review & Dispatch →</span>
                  </button>
                ) : (
                  <button
                    disabled={prepSubmitting}
                    onClick={submitPreparation}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-[#5d51e8] hover:from-emerald-700 hover:to-[#4b3fd3] text-white rounded-xl text-xs font-black shadow-lg shadow-[#5d51e8]/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-75"
                  >
                    {prepSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Finalizing Dispatch...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Complete & Dispatch Order</span>
                      </>
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

// Reusable Sub-component Card for order
interface OrderCardProps {
  order: Order;
  currentUserUid?: string;
  firmName?: string;
  primaryActionText?: string;
  onPrimaryAction?: (id: string) => Promise<void>;
  secondaryActionText?: string;
  onSecondaryAction?: (id: string) => Promise<void>;
  isCompleted?: boolean;
  actionLoading?: string | null;
  priceRangePct?: number;
  onImageClick?: (url: string) => void;
  showNotes?: boolean;
  onAddNote?: (id: string, note: string) => Promise<void>;
  getItemDesignLocation?: (item: OrderItem) => string;
  getItemDesignNo?: (item: OrderItem) => string;
  isCoPicking?: boolean;
}

function OrderCard({
  order,
  currentUserUid,
  firmName,
  primaryActionText,
  onPrimaryAction,
  secondaryActionText,
  onSecondaryAction,
  isCompleted = false,
  actionLoading = null,
  priceRangePct = 5,
  onImageClick,
  showNotes = false,
  onAddNote,
  getItemDesignLocation,
  getItemDesignNo,
  isCoPicking = false
}: OrderCardProps) {
  const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const isLoading = actionLoading === order.id;
  const [noteText, setNoteText] = React.useState(order.salesmanNotes || '');
  const [savingNote, setSavingNote] = React.useState(false);
  const orderNum = order.id ? (order.id.length > 8 ? order.id.slice(-6).toUpperCase() : order.id) : '';

  // Sync state if order changes
  React.useEffect(() => {
    setNoteText(order.salesmanNotes || '');
  }, [order.salesmanNotes]);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 hover:shadow-md transition-shadow text-left">

      {/* Client details & Order Number */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {orderNum && (
              <span className="px-2 py-0.5 bg-[#5d51e8]/10 text-[#5d51e8] dark:bg-indigo-950/40 dark:text-indigo-400 border border-[#5d51e8]/20 dark:border-indigo-800/60 rounded-md text-[10px] font-black uppercase tracking-wider">
                Order #{orderNum}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="p-1 bg-[#5d51e8]/10 text-[#5d51e8] rounded-lg">
                <User className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{order.userName}</h4>
            </div>
          </div>

          {firmName && (
            <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-zinc-400 pl-0.5">
              <Building2 className="w-3.5 h-3.5 text-[#5d51e8] flex-shrink-0" />
              <span>{firmName}</span>
            </div>
          )}

          {/* Team Members & Collaborators Badge */}
          {order.assignedSalesmanName && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-extrabold bg-purple-50/70 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-xl border border-purple-200/50 dark:border-purple-900/40 w-fit">
              <Users className="w-3.5 h-3.5 text-[#5d51e8]" />
              <span>Lead: <strong>{order.assignedSalesmanName}</strong></span>
              {order.collaborators && order.collaborators.length > 0 && (
                <>
                  <span className="text-slate-300 dark:text-zinc-700">|</span>
                  <span>Co-Pickers: <strong>{order.collaborators.map(c => c.name).join(', ')}</strong></span>
                </>
              )}
            </div>
          )}
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

      {/* Picking Progress Bar for Processing Orders */}
      {order.status === 'processing' && (() => {
        const foundCount = order.items.filter(i => i.prepStatus === 'found').length;
        const totalCount = order.items.length;
        const pct = totalCount > 0 ? Math.round((foundCount / totalCount) * 100) : 0;
        return (
          <div className="bg-slate-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border border-slate-150 dark:border-zinc-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              <span>Picking Progress</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {foundCount} / {totalCount} items packed ({pct}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#5d51e8] to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })()}

      {/* Items list */}
      <div className="space-y-2">
        <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Ordered Items</h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {order.items.map((item, idx) => {
            const loc = getItemDesignLocation ? getItemDesignLocation(item) : (item.location || '');
            const des = getItemDesignNo ? getItemDesignNo(item) : (item.designNo || item.design || item.selectedVariant || '');
            return (
              <div
                key={idx}
                className="bg-slate-50/50 dark:bg-zinc-950 border border-slate-150/40 dark:border-zinc-850 p-2.5 rounded-xl flex items-center justify-between gap-3 animate-in fade-in duration-200"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {item.selectedImageUrl ? (
                    <div 
                      onClick={() => onImageClick?.(item.selectedImageUrl || '')}
                      className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-150 dark:bg-zinc-900 flex-shrink-0 cursor-zoom-in hover:border-[#5d51e8] transition-all hover:scale-105 active:scale-95"
                      title="Click to view full screen"
                    >
                      <img src={item.selectedImageUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 flex items-center justify-center flex-shrink-0 text-slate-400">
                      <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                    </div>
                  )}
                  <div className="text-left space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate">{item.nameEn}</p>
                      {item.brand && (
                        <span className="text-[8px] font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-zinc-800">
                          {item.brand}
                        </span>
                      )}
                      {item.prepStatus === 'found' && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded text-[9px] font-black">
                          ✅ Packed {item.pickedByName ? `(${item.pickedByName})` : ''}
                        </span>
                      )}
                      {item.prepStatus === 'hold' && (
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded text-[9px] font-black">
                          ⏳ Hold {item.pickedByName ? `(${item.pickedByName})` : ''}
                        </span>
                      )}
                      {item.prepStatus === 'not_found' && (
                        <span className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded text-[9px] font-black">
                          ❌ Missing
                        </span>
                      )}
                    </div>
                    {/* Single-Line Detailing */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                      <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-250 border border-amber-500/30 rounded font-black flex items-center gap-1">
                        <span>📦 Loc:</span>
                        <span className="underline">{loc || 'N/A'}</span>
                      </span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-[#5d51e8] dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded font-black">
                        Design: {des || 'N/A'}
                      </span>
                      {item.code && (
                        <>
                          <span>•</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            Code: {item.code}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2.5 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg flex-shrink-0 shadow-sm">
                  x{item.quantity} {item.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Salesman Notes block */}
      {showNotes && (
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-2 text-left">
          <div className="flex items-center gap-1 text-[10px] uppercase font-black text-slate-400 tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
            <span>Salesman Packing Note</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Red fabric out of stock, packing green instead..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="flex-grow px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#5d51e8] text-slate-900 dark:text-white"
            />
            <button
              type="button"
              disabled={savingNote || noteText === (order.salesmanNotes || '')}
              onClick={async () => {
                if (!onAddNote) return;
                setSavingNote(true);
                await onAddNote(order.id || '', noteText);
                setSavingNote(false);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              {savingNote ? '...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* If completed or just showing read-only completed notes */}
      {!showNotes && order.salesmanNotes && (
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 text-left bg-amber-50/50 dark:bg-amber-950/10 p-3 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
          <div className="flex items-center gap-1 text-[10px] uppercase font-black text-amber-650 dark:text-amber-400 tracking-wider">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Salesman Note</span>
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-1">{order.salesmanNotes}</p>
        </div>
      )}

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
