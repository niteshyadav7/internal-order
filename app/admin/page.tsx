'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from '../components/ui/ConfirmModal';
import Toast, { ToastType } from '../components/ui/Toast';
import { 
  updateUserProfileStatus, 
  UserProfile,
  getOrders,
  updateOrderStatus,
  getProducts,
  createProduct,
  getProfileFields,
  createProfileField,
  deleteProfileField,
  updateProfileField,
  ProfileField,
  Order,
  Product,
  ProductImage,
  ProductVariant,
  subscribeToUserProfiles,
  deleteUserProfile,
  updateUserProfile,
  updateProduct,
  deleteProduct,
  deleteOrder,
  updateOrder,
  subscribeToOrders,
  syncAdminProfile,
  preRegisterUserProfile,
  getGlobalSettings,
  updateGlobalSettings,
  GlobalSettings
} from '../lib/db';
import { FALLBACK_PRODUCTS } from '../components/products/ProductCatalog';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { compressImage } from '../lib/image';
import { useAuth } from '../context/AuthContext';

// Icons for metrics cards
import { Users, CheckCircle, Clock, XCircle, PlusCircle, Loader2, Bell, ShoppingBag, X, Check, Upload, Trash2, Plus, Images, SlidersHorizontal } from 'lucide-react';

// New Atomic / Molecular / Organism components
import Loader from '../components/atoms/Loader';
import StatsCard from '../components/molecules/StatsCard';
import Sidebar from '../components/organisms/Sidebar';
import Header from '../components/organisms/Header';
import UsersTable from '../components/organisms/UsersTable';
import OrdersList from '../components/organisms/OrdersList';
import ProductsTable from '../components/organisms/ProductsTable';
import DynamicFieldsList from '../components/organisms/DynamicFieldsList';
import UserEditModal from '../components/organisms/UserEditModal';
import UserCreateModal from '../components/organisms/UserCreateModal';
import ProductEditModal from '../components/organisms/ProductEditModal';
import StaffManagement from '../components/organisms/StaffManagement';

// Atoms for Form Components
import { Input, Checkbox, Select } from '../components/atoms/Input';
import Button from '../components/atoms/Button';

export default function AdminDashboard() {
  const router = useRouter();
  const { userProfile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'users' | 'staff' | 'orders' | 'products' | 'fields' | 'notifications'>('users');
  
  // Dynamic window/tab title
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      users: 'Admin - User Approvals',
      staff: 'Admin - Staff Management',
      orders: 'Admin - Order Requests',
      products: 'Admin - Manage Catalog',
      fields: 'Admin - Profile Settings',
      notifications: 'Admin - Notifications'
    };
    document.title = tabTitles[activeTab] || 'Admin Portal';
  }, [activeTab]);
  
  // Tab 1: Users
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'client' | 'salesman' | 'admin'>('all');
  const [sortField, setSortField] = useState<'name' | 'createdAt' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Tab 2: Orders
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Notifications read/cleared states
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [clearedNotificationIds, setClearedNotificationIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const read = localStorage.getItem('admin_read_notifications');
      if (read) setReadNotificationIds(JSON.parse(read));
      const cleared = localStorage.getItem('admin_cleared_notifications');
      if (cleared) setClearedNotificationIds(JSON.parse(cleared));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleMarkAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('admin_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleClearNotification = (id: string) => {
    setClearedNotificationIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('admin_cleared_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleMarkAllAsRead = (allIds: string[]) => {
    setReadNotificationIds(prev => {
      const next = Array.from(new Set([...prev, ...allIds]));
      localStorage.setItem('admin_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleClearAllNotifications = (allIds: string[]) => {
    setClearedNotificationIds(prev => {
      const next = Array.from(new Set([...prev, ...allIds]));
      localStorage.setItem('admin_cleared_notifications', JSON.stringify(next));
      return next;
    });
  };

  // Tab 3: Products
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);

  // Product form states
  const [newProdNameEn, setNewProdNameEn] = useState('');
  const [newProdDescEn, setNewProdDescEn] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdUnit, setNewProdUnit] = useState('Trip');
  const [newProdImageUrl, setNewProdImageUrl] = useState('gradient-indigo');
  const [newProdCategory, setNewProdCategory] = useState('Electronics');
  const [newProdInStock, setNewProdInStock] = useState(true);
  const [isNewProdCompressing, setIsNewProdCompressing] = useState(false);
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdDesign, setNewProdDesign] = useState('');
  const [newProdImages, setNewProdImages] = useState<ProductImage[]>([]);
  const [newProdVariants, setNewProdVariants] = useState<ProductVariant[]>([]);
  
  // Automatically sync variants with uploaded images
  useEffect(() => {
    const autoVariants = newProdImages.map((_, idx) => ({
      id: `v_auto_${idx}_${Date.now()}`,
      name: `Model ${idx + 1}`,
      imageIndex: idx
    }));
    setNewProdVariants(autoVariants);
  }, [newProdImages]);
  const [newProdImageUrlInput, setNewProdImageUrlInput] = useState('');

  // Tab 4: Dynamic Fields
  const [fieldsList, setFieldsList] = useState<ProfileField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [addingField, setAddingField] = useState(false);
  
  // Field form states
  const [newFieldLabelEn, setNewFieldLabelEn] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'tel'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);

  // Field editing states
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabelEn, setEditFieldLabelEn] = useState('');
  const [editFieldType, setEditFieldType] = useState<'text' | 'number' | 'tel'>('text');
  const [editFieldRequired, setEditFieldRequired] = useState(true);
  const [updatingField, setUpdatingField] = useState(false);
  
  // Modals / Collapse / Menu States
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selectedUserUids, setSelectedUserUids] = useState<string[]>([]);
  const [deletingUserUid, setDeletingUserUid] = useState<string | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [rejectingUserUid, setRejectingUserUid] = useState<string | null>(null);
  const [showBatchRejectModal, setShowBatchRejectModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserCustomDetails, setEditUserCustomDetails] = useState<Record<string, string>>({});
  const [editUserRole, setEditUserRole] = useState<'client' | 'salesman' | 'admin'>('client');
  const [savingEditedUser, setSavingEditedUser] = useState(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Catalog/Products states
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSortField, setProductSortField] = useState<'nameEn' | 'price' | 'category'>('nameEn');
  const [productSortDirection, setProductSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdNameEn, setEditProdNameEn] = useState('');
  const [editProdDescEn, setEditProdDescEn] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdUnit, setEditProdUnit] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Electronics');
  const [editProdImageUrl, setEditProdImageUrl] = useState('');
  const [editProdInStock, setEditProdInStock] = useState(true);
  const [editProdCode, setEditProdCode] = useState('');
  const [editProdDesign, setEditProdDesign] = useState('');
  const [editProdImages, setEditProdImages] = useState<ProductImage[]>([]);
  const [editProdVariants, setEditProdVariants] = useState<ProductVariant[]>([]);
  const [savingEditedProduct, setSavingEditedProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [showBatchDeleteProductsModal, setShowBatchDeleteProductsModal] = useState(false);
  const [seedingCatalog, setSeedingCatalog] = useState(false);
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  const [deletingFieldId, setDeletingFieldId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [showSeedCatalogConfirm, setShowSeedCatalogConfirm] = useState(false);
  const [csvProductsToImport, setCsvProductsToImport] = useState<any[]>([]);
  const [adminToast, setAdminToast] = useState<{ message: string; type: ToastType; onClick?: () => void } | null>(null);

  // Global B2B Settings
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsCategories, setSettingsCategories] = useState<string[]>([]);
  const [settingsNewCategory, setSettingsNewCategory] = useState('');
  const [settingsPriceRangePct, setSettingsPriceRangePct] = useState('5');
  
  // Product price range inputs (overrides)
  const [newProdPriceRangePct, setNewProdPriceRangePct] = useState('');
  const [newProdMinPrice, setNewProdMinPrice] = useState('');
  const [newProdMaxPrice, setNewProdMaxPrice] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Editing product states
  const [editProdPriceRangePct, setEditProdPriceRangePct] = useState('');
  const [editProdMinPrice, setEditProdMinPrice] = useState('');
  const [editProdMaxPrice, setEditProdMaxPrice] = useState('');
  const [isEditingCustomCategory, setIsEditingCustomCategory] = useState(false);
  const [editCustomCategoryInput, setEditCustomCategoryInput] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Listen to Firebase Auth state for Firestore rules compatibility
  useEffect(() => {
    if (!auth) {
      setIsFirebaseLoaded(true);
      return;
    }
    auth.authStateReady()
      .then(() => {
        setIsFirebaseLoaded(true);
      })
      .catch((err) => {
        console.error("Firebase authStateReady failed:", err);
        setIsFirebaseLoaded(true); // Fallback to prevent UI hang
      });
  }, []);

  // Verification of admin session
  useEffect(() => {
    const verifyAdminSession = async () => {
      try {
        const res = await fetch('/api/admin/check');
        const data = await res.json();
        if (data.authenticated) {
          setIsAdmin(true);
          setAdminEmail(data.adminEmail || 'admin@logistics.com');
        } else {
          router.push('/admin/login');
        }
      } catch (err) {
        console.error("Failed to verify admin session:", err);
        router.push('/admin/login');
      } finally {
        setCheckingSession(false);
      }
    };
    verifyAdminSession();
  }, [router]);

  // Synchronize Firebase Auth and Admin Cookie Session to prevent permission errors
  useEffect(() => {
    if (isAdmin && isFirebaseLoaded && auth) {
      const currentUser = auth.currentUser;
      if (!currentUser || (adminEmail && currentUser.email?.toLowerCase() !== adminEmail.toLowerCase())) {
        console.warn("Admin session mismatch: Firebase Auth user is missing or incorrect. Logging out admin session.");
        const performLogout = async () => {
          try {
            setIsAdmin(false); // set to false immediately to prevent dashboard rendering
            await fetch('/api/admin/logout', { method: 'POST' });
            router.push('/admin/login');
          } catch (err) {
            console.error("Logout during sync failed:", err);
            router.push('/admin/login');
          }
        };
        performLogout();
      } else if (currentUser && adminEmail) {
        // Sync administrative profile under their real UID in Firestore
        syncAdminProfile(currentUser.uid, currentUser.email || adminEmail);
      }
    }
  }, [isAdmin, isFirebaseLoaded, adminEmail, router, auth?.currentUser]);

  // Real-time user profiles listener
  useEffect(() => {
    if (!isAdmin || !isFirebaseLoaded || !auth?.currentUser) return;
    setLoadingData(true);
    const unsubscribeUsers = subscribeToUserProfiles((data) => {
      setUsersList(data);
      setLoadingData(false);
    });
    return () => {
      unsubscribeUsers();
    };
  }, [isAdmin, isFirebaseLoaded]);

  // Fetch functions
  const fetchFields = async () => {
    setLoadingFields(true);
    try {
      const data = await getProfileFields();
      setFieldsList(data);
    } catch (err) {
      console.error("Failed to load profile fields:", err);
    } finally {
      setLoadingFields(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const ordersData = await getOrders();
      setOrdersList(ordersData);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await getProducts();
      setProductsList(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
      gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (err) {
      console.warn("Web Audio API chime could not play:", err);
    }
  };

  useEffect(() => {
    if (!isAdmin || !isFirebaseLoaded || !auth?.currentUser) return;
    setLoadingOrders(true);
    let isFirstLoad = true;

    const unsubscribeOrders = subscribeToOrders((newOrders) => {
      if (!isFirstLoad && newOrders.length > 0) {
        setOrdersList(prevList => {
          const prevIds = new Set(prevList.map(o => o.id));
          const addedOrders = newOrders.filter(o => o.id && !prevIds.has(o.id));
          
          if (addedOrders.length > 0) {
            addedOrders.forEach(order => {
              const orderTotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
              setAdminToast({
                message: `New Order Request from ${order.userName} (₹${orderTotal.toLocaleString()})!`,
                type: 'success',
                onClick: () => {
                  setActiveTab('orders');
                }
              });
              playNotificationSound();
            });
          }
          return newOrders;
        });
      } else {
        setOrdersList(newOrders);
        isFirstLoad = false;
      }
      setLoadingOrders(false);
    });

    return () => {
      unsubscribeOrders();
    };
  }, [isAdmin, isFirebaseLoaded]);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const settings = await getGlobalSettings();
      setGlobalSettings(settings);
      const cats = settings.categories || [];
      setSettingsCategories(cats);
      setSettingsPriceRangePct(String(settings.priceRangePct || 5));
      if (cats.length > 0) {
        setNewProdCategory(cats[0]);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    if (isAdmin && isFirebaseLoaded && auth?.currentUser) {
      fetchFields(); // Load fields to resolve custom field IDs to labels
      fetchSettings(); // Load global settings
      if (activeTab === 'products') {
        fetchProducts();
      } else if (activeTab === 'fields') {
        fetchFields();
      }
    }
  }, [isAdmin, isFirebaseLoaded, activeTab]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearchQuery]);

  // Tab 1 (Users) sorting logic
  const handleSort = (field: 'name' | 'createdAt' | 'status') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Tab 3 (Products) sorting logic
  const handleProductSort = (field: 'nameEn' | 'price' | 'category') => {
    if (productSortField === field) {
      setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setProductSortField(field);
      setProductSortDirection('asc');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = settingsNewCategory.trim();
    if (!cat) return;
    if (settingsCategories.map(c => c.toLowerCase()).includes(cat.toLowerCase())) {
      alert("Category already exists!");
      return;
    }
    const updatedCategories = [...settingsCategories, cat];
    setSavingSettings(true);
    try {
      const success = await updateGlobalSettings({ categories: updatedCategories });
      if (success) {
        setSettingsCategories(updatedCategories);
        setGlobalSettings(prev => prev ? { ...prev, categories: updatedCategories } : null);
        setSettingsNewCategory('');
        setAdminToast({ message: `Category "${cat}" added successfully!`, type: "success" });
      } else {
        alert("Failed to add category.");
      }
    } catch (err) {
      console.error("Failed to add category:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRemoveCategory = async (catToRemove: string) => {
    const confirmRemove = confirm(`Are you sure you want to remove the category "${catToRemove}"? Products in this category will not be deleted, but it will no longer be listed as active.`);
    if (!confirmRemove) return;
    const updatedCategories = settingsCategories.filter(c => c !== catToRemove);
    setSavingSettings(true);
    try {
      const success = await updateGlobalSettings({ categories: updatedCategories });
      if (success) {
        setSettingsCategories(updatedCategories);
        setGlobalSettings(prev => prev ? { ...prev, categories: updatedCategories } : null);
        setAdminToast({ message: `Category "${catToRemove}" removed successfully!`, type: "success" });
      } else {
        alert("Failed to remove category.");
      }
    } catch (err) {
      console.error("Failed to remove category:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSavePriceRangePct = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseInt(settingsPriceRangePct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      alert("Price variance must be a number between 0 and 100.");
      return;
    }
    setSavingSettings(true);
    try {
      const success = await updateGlobalSettings({ priceRangePct: pct });
      if (success) {
        setGlobalSettings(prev => prev ? { ...prev, priceRangePct: pct } : null);
        setAdminToast({ message: `Price range variance set to ±${pct}% successfully!`, type: "success" });
      } else {
        alert("Failed to save price range variance.");
      }
    } catch (err) {
      console.error("Failed to save price range variance:", err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabelEn.trim()) {
      alert("Field label is required.");
      return;
    }
    setAddingField(true);
    try {
      const field = await createProfileField({
        labelEn: newFieldLabelEn,
        labelHi: newFieldLabelEn,
        type: newFieldType,
        required: newFieldRequired
      });
      if (field) {
        setFieldsList(prev => [...prev, field]);
        setNewFieldLabelEn('');
        setNewFieldType('text');
        setNewFieldRequired(true);
      }
    } catch (err) {
      console.error("Error creating field:", err);
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteField = (fieldId: string) => {
    setDeletingFieldId(fieldId);
  };

  const handleConfirmDeleteField = async () => {
    if (!deletingFieldId) return;
    const fieldId = deletingFieldId;
    setDeletingFieldId(null);
    try {
      await deleteProfileField(fieldId);
      setFieldsList(prev => prev.filter(f => f.id !== fieldId));
    } catch (err) {
      console.error("Failed to delete field:", err);
      alert("Error deleting profile field.");
    }
  };

  const startEditingField = (field: ProfileField) => {
    setEditingFieldId(field.id || null);
    setEditFieldLabelEn(field.labelEn);
    setEditFieldType(field.type);
    setEditFieldRequired(field.required);
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditFieldLabelEn('');
    setEditFieldType('text');
    setEditFieldRequired(true);
  };

  const handleUpdateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFieldId) return;
    if (!editFieldLabelEn.trim()) {
      alert("Field label is required.");
      return;
    }
    setUpdatingField(true);
    try {
      await updateProfileField(editingFieldId, {
        labelEn: editFieldLabelEn,
        labelHi: editFieldLabelEn,
        type: editFieldType,
        required: editFieldRequired
      });
      setFieldsList(prev => prev.map(f => f.id === editingFieldId ? {
        ...f,
        labelEn: editFieldLabelEn,
        labelHi: editFieldLabelEn,
        type: editFieldType,
        required: editFieldRequired
      } : f));
      handleCancelEdit();
    } catch (err) {
      console.error("Failed to update profile field:", err);
      alert("Error updating profile field.");
    } finally {
      setUpdatingField(false);
    }
  };

  const getFieldLabel = (fieldId: string) => {
    const field = fieldsList.find(f => f.id === fieldId);
    if (!field) return fieldId;
    return field.labelEn;
  };

  const handleLogout = () => {
    setShowSignOutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowSignOutModal(false);
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn("Firebase sign out failed during admin logout:", err);
    }
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleStatusUpdate = async (uid: string, nextStatus: 'approved' | 'rejected') => {
    setActionLoading(uid);
    try {
      await updateUserProfileStatus(uid, nextStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Error modifying user approval status.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = (uid: string) => {
    setDeletingUserUid(uid);
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUserUid) return;
    const uid = deletingUserUid;
    setDeletingUserUid(null);
    setActionLoading(uid);
    try {
      await deleteUserProfile(uid);
      setSelectedUserUids(prev => prev.filter(id => id !== uid));
    } catch (err) {
      console.error("Failed to delete user profile:", err);
      alert("Error deleting user profile.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmBatchDelete = async () => {
    setShowBatchDeleteModal(false);
    setLoadingData(true);
    try {
      await Promise.all(selectedUserUids.map(uid => deleteUserProfile(uid)));
      setSelectedUserUids([]);
    } catch (err) {
      console.error("Failed to delete selected users:", err);
      alert("Error performing batch delete.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleConfirmRejectUser = async () => {
    if (!rejectingUserUid) return;
    const uid = rejectingUserUid;
    setRejectingUserUid(null);
    setActionLoading(uid);
    try {
      await updateUserProfileStatus(uid, 'rejected');
    } catch (err) {
      console.error("Failed to reject user profile:", err);
      alert("Error rejecting user profile.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBatchStatusUpdate = async (nextStatus: 'approved' | 'rejected') => {
    if (selectedUserUids.length === 0) return;
    try {
      await Promise.all(selectedUserUids.map(uid => updateUserProfileStatus(uid, nextStatus)));
      setSelectedUserUids([]);
    } catch (err) {
      console.error("Failed to update status for selected users:", err);
      alert("Error performing batch update.");
    }
  };

  const handleBatchDelete = () => {
    if (selectedUserUids.length === 0) return;
    setShowBatchDeleteModal(true);
  };

  const handleConfirmBatchReject = async () => {
    setShowBatchRejectModal(false);
    try {
      await Promise.all(selectedUserUids.map(uid => updateUserProfileStatus(uid, 'rejected')));
      setSelectedUserUids([]);
    } catch (err) {
      console.error("Failed to reject selected users:", err);
      alert("Error performing batch reject.");
    }
  };

  const startEditingUser = (user: UserProfile) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserCustomDetails(user.customDetails || {});
    setEditUserRole(user.role || 'client');
  };

  const handleCustomDetailChange = (key: string, value: string) => {
    setEditUserCustomDetails(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveEditedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      alert("Name and Email are required.");
      return;
    }
    setSavingEditedUser(true);
    try {
      await updateUserProfile(editingUser.uid, {
        name: editUserName,
        email: editUserEmail,
        customDetails: editUserCustomDetails,
        role: editUserRole,
        requestedFirmName: ""
      });
      setEditingUser(null);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      alert("Failed to update user profile.");
    } finally {
      setSavingEditedUser(false);
    }
  };

  const handleCreateUserProfile = async (
    name: string,
    email: string,
    role: 'client' | 'salesman' | 'admin',
    status: 'pending' | 'approved' | 'rejected',
    customDetails: Record<string, string>
  ) => {
    setCreatingUser(true);
    try {
      const profile = await preRegisterUserProfile({
        name,
        email,
        role,
        status,
        customDetails,
        registrationCompleted: true
      });
      if (profile) {
        setIsCreateUserOpen(false);
        setAdminToast({
          message: `Successfully pre-registered ${name} as ${role}!`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error("Failed to pre-register user:", err);
      alert("Error creating pre-registered user profile.");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      const uids = filteredUsers.map(u => u.uid);
      setSelectedUserUids(uids);
    } else {
      setSelectedUserUids([]);
    }
  };

  const handleSelectUser = (uid: string, checked: boolean) => {
    if (checked) {
      setSelectedUserUids(prev => [...prev, uid]);
    } else {
      setSelectedUserUids(prev => prev.filter(id => id !== uid));
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, nextStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    try {
      await updateOrderStatus(orderId, nextStatus);
      setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Error updating order status.");
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    setDeletingOrderId(orderId);
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deletingOrderId) return;
    const orderId = deletingOrderId;
    setDeletingOrderId(null);
    try {
      await deleteOrder(orderId);
      setOrdersList(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("Failed to delete order:", err);
      alert("Error deleting order request.");
    }
  };

  const handleUpdateOrderDetails = async (orderId: string, details: any) => {
    try {
      await updateOrder(orderId, details);
      setOrdersList(prev => prev.map(o => o.id === orderId ? { ...o, ...details } : o));
    } catch (err) {
      console.error("Failed to update order details:", err);
      alert("Error updating order details.");
      throw err;
    }
  };

  const handleToggleStock = async (product: Product) => {
    if (!product.id) return;
    const nextInStock = product.inStock !== false ? false : true;
    try {
      await updateProduct(product.id, {
        inStock: nextInStock
      });
      setProductsList(prev => prev.map(p => p.id === product.id ? {
        ...p,
        inStock: nextInStock
      } : p));
    } catch (err) {
      console.error("Failed to toggle product stock status:", err);
      alert("Error updating product stock status.");
    }
  };

  const handleMarkOutOfStock = async (productId: string) => {
    try {
      await updateProduct(productId, { inStock: false });
      setProductsList(prev => prev.map(p => p.id === productId ? { ...p, inStock: false } : p));
      setAdminToast({ message: "Product marked as Out of Stock successfully!", type: "success" });
    } catch (err) {
      console.error("Failed to mark product out of stock:", err);
      alert("Error marking product as out of stock.");
    }
  };

  const handleDeleteProduct = (id: string) => {
    setDeletingProductId(id);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deletingProductId) return;
    const id = deletingProductId;
    setDeletingProductId(null);
    try {
      await deleteProduct(id);
      setProductsList(prev => prev.filter(p => p.id !== id));
      setSelectedProductIds(prev => prev.filter(item => item !== id));
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Error deleting product.");
    }
  };

  const startEditingProduct = (product: Product & { minPrice?: number; maxPrice?: number }) => {
    setEditingProduct(product);
    setEditProdNameEn(product.nameEn);
    setEditProdDescEn(product.descEn);
    setEditProdPrice(product.price.toString());
    setEditProdUnit(product.unit);
    setEditProdCategory(product.category);
    setEditProdImageUrl(product.imageUrl);
    setEditProdInStock(product.inStock !== false);
    setEditProdCode(product.code || '');
    setEditProdDesign(product.design || '');
    setEditProdImages(product.images || []);
    setEditProdVariants(product.variants || []);
    setEditProdPriceRangePct(product.priceRangePct !== undefined ? product.priceRangePct.toString() : '');
    setEditProdMinPrice(product.minPrice !== undefined ? product.minPrice.toString() : '');
    setEditProdMaxPrice(product.maxPrice !== undefined ? product.maxPrice.toString() : '');
  };

  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.id) return;
    if (!editProdNameEn.trim() || !editProdPrice.trim()) {
      alert("Name and Price are required.");
      return;
    }
    setSavingEditedProduct(true);
    try {
      await updateProduct(editingProduct.id, {
        nameEn: editProdNameEn,
        nameHi: editProdNameEn,
        descEn: editProdDescEn,
        descHi: editProdDescEn,
        price: parseFloat(editProdPrice),
        unit: editProdUnit,
        category: editProdCategory,
        imageUrl: editProdImages.length > 0 ? editProdImages[0].url : editProdImageUrl,
        inStock: editProdInStock,
        code: editProdCode,
        design: editProdDesign,
        images: editProdImages,
        variants: editProdVariants,
        priceRangePct: editProdPriceRangePct.trim() ? parseFloat(editProdPriceRangePct) : (null as any),
        minPrice: editProdMinPrice.trim() ? parseFloat(editProdMinPrice) : (null as any),
        maxPrice: editProdMaxPrice.trim() ? parseFloat(editProdMaxPrice) : (null as any)
      });
      setProductsList(prev => prev.map(p => p.id === editingProduct.id ? {
        ...p,
        nameEn: editProdNameEn,
        nameHi: editProdNameEn,
        descEn: editProdDescEn,
        descHi: editProdDescEn,
        price: parseFloat(editProdPrice),
        unit: editProdUnit,
        category: editProdCategory,
        imageUrl: editProdImages.length > 0 ? editProdImages[0].url : editProdImageUrl,
        inStock: editProdInStock,
        code: editProdCode,
        design: editProdDesign,
        images: editProdImages,
        variants: editProdVariants,
        priceRangePct: editProdPriceRangePct.trim() ? parseFloat(editProdPriceRangePct) : undefined,
        minPrice: editProdMinPrice.trim() ? parseFloat(editProdMinPrice) : undefined,
        maxPrice: editProdMaxPrice.trim() ? parseFloat(editProdMaxPrice) : undefined
      } : p));
      setEditingProduct(null);
    } catch (err) {
      console.error("Failed to update product:", err);
      alert("Error updating product.");
    } finally {
      setSavingEditedProduct(false);
    }
  };

  const handleNewProdFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsNewProdCompressing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i]);
        setNewProdImages(prev => {
          const newImages = [...prev, { url: compressed, label: `Image ${prev.length + 1}` }];
          // Also set imageUrl to the first image for backward compat
          if (newImages.length === 1) setNewProdImageUrl(compressed);
          return newImages;
        });
      }
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress and upload image.");
    } finally {
      setIsNewProdCompressing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdNameEn.trim() || !newProdPrice.trim()) {
      alert("Product Name and Price are required.");
      return;
    }
    if (newProdImageUrl === 'upload-placeholder') {
      alert("Please upload an image first.");
      return;
    }
    if (isNewProdCompressing) {
      alert("Please wait for the image to finish optimizing.");
      return;
    }
    setAddingProduct(true);
    try {
      const mainImageUrl = newProdImages.length > 0 ? newProdImages[0].url : newProdImageUrl;
      const addedProduct = await createProduct({
        nameEn: newProdNameEn,
        nameHi: newProdNameEn,
        descEn: newProdDescEn,
        descHi: newProdDescEn,
        price: parseFloat(newProdPrice),
        unit: newProdUnit,
        category: newProdCategory,
        imageUrl: mainImageUrl,
        inStock: newProdInStock,
        code: newProdCode,
        design: newProdDesign,
        images: newProdImages,
        variants: newProdVariants,
        priceRangePct: newProdPriceRangePct.trim() ? parseFloat(newProdPriceRangePct) : undefined,
        minPrice: newProdMinPrice.trim() ? parseFloat(newProdMinPrice) : undefined,
        maxPrice: newProdMaxPrice.trim() ? parseFloat(newProdMaxPrice) : undefined
      } as any);
      if (addedProduct) {
        setProductsList(prev => [addedProduct, ...prev]);
        setNewProdNameEn('');
        setNewProdDescEn('');
        setNewProdPrice('');
        setNewProdUnit('Trip');
        setNewProdImageUrl('gradient-indigo');
        setNewProdCategory(settingsCategories[0] || 'Electronics');
        setNewProdInStock(true);
        setNewProdCode('');
        setNewProdDesign('');
        setNewProdImages([]);
        setNewProdVariants([]);
        setNewProdPriceRangePct('');
        setNewProdMinPrice('');
        setNewProdMaxPrice('');
      }
    } catch (err) {
      console.error("Failed to add product:", err);
      alert("Error adding product to catalog.");
    } finally {
      setAddingProduct(false);
    }
  };

  const handleConfirmBatchDeleteProducts = async () => {
    setShowBatchDeleteProductsModal(false);
    setLoadingProducts(true);
    try {
      await Promise.all(selectedProductIds.map(id => deleteProduct(id)));
      setProductsList(prev => prev.filter(p => !selectedProductIds.includes(p.id || '')));
      setSelectedProductIds([]);
    } catch (err) {
      console.error("Failed to batch delete products:", err);
      alert("Error performing batch delete.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSeedCatalog = () => {
    setShowSeedCatalogConfirm(true);
  };

  const handleConfirmSeedCatalog = async () => {
    setShowSeedCatalogConfirm(false);
    setSeedingCatalog(true);
    setLoadingProducts(true);
    try {
      await Promise.all(FALLBACK_PRODUCTS.map(p => createProduct({
        nameEn: p.nameEn,
        nameHi: p.nameHi,
        descEn: p.descEn,
        descHi: p.descHi,
        price: p.price,
        unit: p.unit,
        imageUrl: p.imageUrl,
        category: p.category
      })));
      const updatedProds = await getProducts();
      setProductsList(updatedProds);
      alert("Database seeded successfully with default catalog!");
    } catch (err) {
      console.error("Failed to seed catalog:", err);
      alert("Error seeding catalog.");
    } finally {
      setSeedingCatalog(false);
      setLoadingProducts(false);
    }
  };

  const handleDownloadCSVTemplate = () => {
    const hints = [
      '# HINT: imageUrl = Primary main thumbnail image shown on storefront grid (essential for backward compatibility).',
      '# HINT: images = Semicolon-separated list of gallery image URLs (e.g. url1;url2;url3) showing inside the product detail gallery.',
      '# HINT: variants = Semicolon-separated list of variant/model names mapped to image index (e.g. Red:0;Blue:1;Green:2).',
      '# HINT: category = One of your active dynamic categories. If a new category is imported, it will automatically register in the system.',
      '# HINT: priceRangePct = Custom price range variance percentage override for this product (optional).',
      '# HINT: minPrice = Custom absolute minimum price range override (optional).',
      '# HINT: maxPrice = Custom absolute maximum price range override (optional).'
    ];
    const headers = ['nameEn', 'descEn', 'price', 'unit', 'category', 'imageUrl', 'images', 'variants', 'priceRangePct', 'minPrice', 'maxPrice'];
    const sampleRow = [
      '"iPhone 15 Pro Max"',
      '"Sleek Titanium design featuring A17 Pro chip"',
      '159900',
      '"Piece"',
      '"Electronics"',
      '"https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80"',
      '"https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80;https://images.unsplash.com/photo-1695048132924-607213e4b7bf?w=600&q=80;https://images.unsplash.com/photo-1695048704763-23e59048a12e?w=600&q=80"',
      '"Natural Titanium:0;Blue Titanium:1;White Titanium:2"',
      '""',
      '""',
      '""'
    ];
    const csvContent = [...hints, headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n');
    if (lines.length <= 1) return [];
    
    // Find the first non-comment line as the header row
    let headerLineIdx = 0;
    while (headerLineIdx < lines.length && lines[headerLineIdx].trim().startsWith('#')) {
      headerLineIdx++;
    }
    
    if (headerLineIdx >= lines.length) return [];

    const headers = lines[headerLineIdx]
      .replace(/^\uFEFF/, '')
      .split(',')
      .map(h => h.trim().replace(/^["']|["']$/g, ''));
      
    const results: any[] = [];
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
      const obj: any = {};
      headers.forEach((header, index) => {
        let val = values[index] || '';
        val = val.replace(/^["']|["']$/g, '');
        obj[header] = val;
      });
      results.push(obj);
    }
    return results;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          alert("No records found in CSV file.");
          return;
        }
        setCsvProductsToImport(parsed);
      } catch (err) {
        console.error("Error parsing CSV:", err);
        alert("Failed to parse CSV file. Ensure it is formatted correctly.");
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = async () => {
    if (csvProductsToImport.length === 0) return;
    const items = csvProductsToImport;
    setCsvProductsToImport([]);
    setLoadingProducts(true);
    try {
      let successCount = 0;
      for (const item of items) {
        const nameEn = item.nameEn || item.name;
        const nameHi = item.nameHi || nameEn;
        const price = parseFloat(item.price);
        const category = item.category || 'Electronics';
        const unit = item.unit || 'Piece';
        const descEn = item.descEn || item.description || '';
        const descHi = item.descHi || descEn;
        const code = item.code || '';
        const design = item.design || '';

        // Auto-register category if not exists
        if (category && !settingsCategories.includes(category)) {
          const updatedCategories = [...settingsCategories, category];
          await updateGlobalSettings({ categories: updatedCategories });
          settingsCategories.push(category);
          setSettingsCategories([...settingsCategories]);
        }

        let images: ProductImage[] = [];
        if (item.images) {
          const urlList = item.images.split(';').map((url: string) => url.trim()).filter(Boolean);
          images = urlList.map((url: string, idx: number) => ({
            url,
            label: `Image ${idx + 1}`
          }));
        }

        let variants: ProductVariant[] = [];
        if (item.variants) {
          const varList = item.variants.split(';').map((v: string) => v.trim()).filter(Boolean);
          variants = varList.map((v: string) => {
            const parts = v.split(':');
            const name = parts[0].trim();
            const imageIndex = parts[1] ? parseInt(parts[1].trim()) : 0;
            return {
              id: `v_csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name,
              imageIndex: isNaN(imageIndex) ? 0 : imageIndex
            };
          });
        }

        const mainImageUrl = images.length > 0 ? images[0].url : (item.imageUrl || item.image || 'gradient-indigo');
        
        if (!nameEn || isNaN(price)) {
          console.warn("Skipping invalid CSV product record:", item);
          continue;
        }

        const priceRangePctVal = item.priceRangePct ? parseFloat(item.priceRangePct) : undefined;
        const minPriceVal = item.minPrice ? parseFloat(item.minPrice) : undefined;
        const maxPriceVal = item.maxPrice ? parseFloat(item.maxPrice) : undefined;

        await createProduct({
          nameEn,
          nameHi,
          descEn,
          descHi,
          price,
          unit,
          imageUrl: mainImageUrl,
          category,
          code,
          design,
          images,
          variants,
          priceRangePct: isNaN(priceRangePctVal as any) ? undefined : priceRangePctVal,
          minPrice: isNaN(minPriceVal as any) ? undefined : minPriceVal,
          maxPrice: isNaN(maxPriceVal as any) ? undefined : maxPriceVal
        } as any);
        successCount++;
      }
      alert(`Successfully imported ${successCount} products!`);
      const updatedProds = await getProducts();
      setProductsList(updatedProds);
    } catch (err) {
      console.error("Error importing CSV:", err);
      alert("Failed to import products. Please try again.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, id]);
    } else {
      setSelectedProductIds(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAllProducts = (checked: boolean) => {
    if (checked) {
      const ids = filteredProducts.map(p => p.id || '');
      setSelectedProductIds(ids);
    } else {
      setSelectedProductIds([]);
    }
  };

  const getFilteredAndSortedProducts = () => {
    let result = [...productsList];
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      result = result.filter(p => 
        p.nameEn.toLowerCase().includes(q) || 
        p.descEn.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      if (productSortField === 'nameEn') {
        valA = a.nameEn.toLowerCase();
        valB = b.nameEn.toLowerCase();
      } else if (productSortField === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (productSortField === 'category') {
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
      }
      if (valA < valB) return productSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return productSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  };

  const filteredProducts = getFilteredAndSortedProducts();
  const totalProductPages = Math.ceil(filteredProducts.length / productPageSize);
  const paginatedProducts = filteredProducts.slice(
    (productPage - 1) * productPageSize,
    productPage * productPageSize
  );

  // Stats calculation
  // Stats only count client users (staff managed separately)
  const clientUsers = usersList.filter(u => !u.role || u.role === 'client');
  const totalUsers = clientUsers.length;
  const approvedUsers = clientUsers.filter(u => u.status === 'approved').length;
  const pendingUsers = clientUsers.filter(u => u.status === 'pending').length;
  const rejectedUsers = clientUsers.filter(u => u.status === 'rejected').length;

  const getFilteredAndSortedUsers = () => {
    // Only show clients in User Approvals tab (staff are managed in Staff Management tab)
    let result = usersList.filter(u => !u.role || u.role === 'client');
    
    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter);
    }
    
    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(q);
        const emailMatch = u.email.toLowerCase().includes(q);
        const customDetailsMatch = u.customDetails 
          ? Object.entries(u.customDetails).some(([key, val]) => 
              val.toLowerCase().includes(q) || getFieldLabel(key).toLowerCase().includes(q)
            )
          : false;
        return nameMatch || emailMatch || customDetailsMatch;
      });
    }
    
    // Sorting
    result.sort((a, b) => {
      let valA: string = '';
      let valB: string = '';
      
      if (sortField === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (sortField === 'createdAt') {
        valA = a.createdAt;
        valB = b.createdAt;
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return result;
  };

  // Notifications Calculations
  const { notificationsList, unreadCount } = useMemo(() => {
    const list: any[] = [];
    let unread = 0;

    // 1. Pending Approvals & Firm Name Change Requests
    usersList.forEach(user => {
      if (user.status === 'pending') {
        const id = `user-pending-${user.uid}`;
        if (!clearedNotificationIds.includes(id)) {
          const isRead = readNotificationIds.includes(id);
          if (!isRead) unread++;
          
          list.push({
            id,
            type: 'user',
            title: 'Pending User Registration',
            message: `${user.name} (${user.email}) submitted a registration request and is waiting for approval.`,
            timestamp: user.createdAt,
            actionLabel: 'Review Profile',
            actionTab: 'users',
            isRead
          });
        }
      }

      if (user.requestedFirmName) {
        const id = `user-firmname-change-${user.uid}-${user.requestedFirmName}`;
        if (!clearedNotificationIds.includes(id)) {
          const isRead = readNotificationIds.includes(id);
          if (!isRead) unread++;
          
          list.push({
            id,
            type: 'user',
            title: 'Firm Name Change Request',
            message: `${user.name} (${user.email}) requested to change their Firm Name to "${user.requestedFirmName}".`,
            timestamp: user.createdAt,
            actionLabel: 'Review Profile',
            actionTab: 'users',
            isRead
          });
        }
      }
    });

    // 2. Pending/Processing Orders
    ordersList.forEach(order => {
      if (order.status === 'pending' || order.status === 'processing') {
        const id = `order-${order.status}-${order.id}`;
        if (clearedNotificationIds.includes(id)) return;

        const isRead = readNotificationIds.includes(id);
        if (order.status === 'pending' && !isRead) unread++;
        
        const total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        list.push({
          id,
          type: 'order',
          title: order.status === 'pending' ? 'New Order Request' : 'Active Order In Transit',
          message: `Order from ${order.userName} (${order.userEmail}) for ₹${total.toLocaleString()} is currently marked as ${order.status}.`,
          timestamp: order.createdAt,
          actionLabel: 'Manage Logistics',
          actionTab: 'orders',
          isRead
        });
      }
    });

    // Sort by timestamp descending
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { notificationsList: list, unreadCount: unread };
  }, [usersList, ordersList, readNotificationIds, clearedNotificationIds]);

  const filteredUsers = getFilteredAndSortedUsers();

  if (checkingSession || !isAdmin || !isFirebaseLoaded || (auth?.currentUser && !userProfile)) {
    return <Loader fullscreen text="Verifying administrator credentials..." />;
  }

  // Deny access if user is not an admin
  if (userProfile && userProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 font-sans">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-955/20 text-rose-605 rounded-full flex items-center justify-center mx-auto border border-rose-200/50 dark:border-rose-900/50">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-905 dark:text-white">Access Denied</h2>
            <p className="text-xs font-semibold text-slate-450 dark:text-zinc-550 leading-relaxed">
              Your account does not have administrator privileges. Only administrators can access the admin panel.
            </p>
          </div>
          <Button variant="danger" className="w-full" onClick={async () => {
            try {
              await fetch('/api/admin/logout', { method: 'POST' });
              if (auth) await signOut(auth);
              router.push('/admin/login');
            } catch (err) {
              console.error(err);
              router.push('/admin/login');
            }
          }}>
            Log Out & Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
        unreadCount={unreadCount}
      />

      {/* Main Content Pane */}
      <div className={`
        flex-grow flex flex-col h-screen overflow-hidden pt-16 md:pt-0 transition-all duration-300
        ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'}
      `}>
        
        {/* Header (Responsive top bar) */}
        <Header
          activeTab={activeTab}
          onMenuClick={() => setIsMobileOpen(true)}
          onLogout={handleLogout}
          unreadCount={unreadCount}
          onNotificationClick={() => setActiveTab('notifications')}
        />

        {/* Content Scroll View */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-zinc-950 p-4 sm:p-8">
          <div className="max-w-6xl w-full mx-auto">
            {isFirebaseLoaded && auth && !auth.currentUser && (
              <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-955/15 border border-amber-200 dark:border-amber-900/35 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Firebase Authentication Inactive</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">
                      This domain (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">{typeof window !== 'undefined' ? window.location.hostname : ''}</code>) is not authorized in your Firebase Console. Database actions (Approve, Reject, Delete) will fail until authorized.
                    </p>
                  </div>
                </div>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap self-end sm:self-auto cursor-pointer"
                >
                  Go to Firebase Console
                </a>
              </div>
            )}

            {/* Tab 0: Notifications Feed */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-3 border-b border-slate-150 dark:border-zinc-800/85 gap-3">
                    <div className="space-y-1">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-5 h-5 text-[#5d51e8]" />
                        <span>Real-Time Notifications Feed</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-bold">
                        Keep track of live registration approvals and order logs
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {unreadCount > 0 && (
                        <span className="bg-rose-50 dark:bg-rose-955/20 text-rose-650 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse border border-rose-100 dark:border-rose-900/35">
                          {unreadCount} Alerts Pending
                        </span>
                      )}
                      {notificationsList.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMarkAllAsRead(notificationsList.map(n => n.id))}
                            className="px-3 py-1.5 text-[10px] font-black text-slate-600 hover:text-[#5d51e8] bg-slate-50 hover:bg-[#5d51e8]/5 dark:bg-zinc-800 dark:text-slate-350 dark:hover:text-indigo-400 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all cursor-pointer shadow-sm uppercase tracking-wide"
                          >
                            Mark all read
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearAllNotifications(notificationsList.map(n => n.id))}
                            className="px-3 py-1.5 text-[10px] font-black text-rose-600 hover:bg-rose-550/10 dark:text-rose-400 dark:hover:bg-rose-955/20 border border-rose-100 dark:border-rose-900/35 rounded-xl transition-all cursor-pointer shadow-sm uppercase tracking-wide"
                          >
                            Clear all
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {notificationsList.length === 0 ? (
                    <div className="py-20 text-center text-slate-400">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-150 dark:border-zinc-855">
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      </div>
                      <p className="font-extrabold text-sm text-slate-555">Everything is caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">No pending registrations or order actions required.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
                      {notificationsList.map((notif: any) => {
                        const isUser = notif.type === 'user';
                        
                        return (
                          <div 
                            key={notif.id} 
                            className={`py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-1 last:pb-1 transition-all ${
                              notif.isRead ? 'opacity-55' : 'opacity-100'
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              <div className={`p-2.5 rounded-2xl flex-shrink-0 mt-0.5 border ${
                                isUser 
                                  ? 'bg-indigo-50 dark:bg-indigo-955/20 text-[#5d51e8] border-indigo-105 dark:border-indigo-900/30' 
                                  : 'bg-amber-50 dark:bg-amber-955/20 text-amber-600 border-amber-105 dark:border-amber-900/30'
                              }`}>
                                {isUser ? <Users className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                              </div>
                              <div className="space-y-1 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 animate-pulse" title="Unread"></span>
                                    )}
                                    {notif.title}
                                  </h4>
                                  <span className="text-[9px] text-slate-400 font-bold block">
                                    {new Date(notif.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold max-w-2xl leading-relaxed">
                                  {notif.message}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                              {!notif.isRead && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkAsRead(notif.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-[#5d51e8] bg-slate-50 hover:bg-[#5d51e8]/5 dark:bg-zinc-800 dark:text-slate-450 dark:hover:text-indigo-400 border border-slate-200 dark:border-zinc-700 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                  title="Mark as Read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Read</span>
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  handleMarkAsRead(notif.id);
                                  setActiveTab(notif.actionTab);
                                  if (notif.actionTab === 'users') {
                                    setStatusFilter('pending');
                                  }
                                }}
                                className={`px-4 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-95 border ${
                                  isUser
                                    ? 'bg-[#5d51e8] hover:bg-[#4a3ecc] text-white border-transparent shadow-indigo-500/10'
                                    : 'bg-white hover:bg-slate-55 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-zinc-700'
                                }`}
                              >
                                {notif.actionLabel}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleClearNotification(notif.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/15 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-450 border border-rose-150/40 dark:border-rose-900/40 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                                title="Dismiss notification"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 1: Users Approvals */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Stats cards grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatsCard
                    label="Total Registrations"
                    value={totalUsers}
                    icon={Users}
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                  />
                  <StatsCard
                    label="Approved Accounts"
                    value={approvedUsers}
                    icon={CheckCircle}
                    active={statusFilter === 'approved'}
                    onClick={() => setStatusFilter('approved')}
                    colorClass="text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20"
                    activeBorderClass="border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-500"
                  />
                  <StatsCard
                    label="Pending Approval"
                    value={pendingUsers}
                    icon={Clock}
                    active={statusFilter === 'pending'}
                    onClick={() => setStatusFilter('pending')}
                    colorClass="text-amber-500 bg-amber-50 dark:bg-amber-950/20"
                    activeBorderClass="border-amber-500 ring-2 ring-amber-500/20 dark:border-amber-500"
                  />
                  <StatsCard
                    label="Rejected Request"
                    value={rejectedUsers}
                    icon={XCircle}
                    active={statusFilter === 'rejected'}
                    onClick={() => setStatusFilter('rejected')}
                    colorClass="text-rose-500 bg-rose-50 dark:bg-rose-950/20"
                    activeBorderClass="border-rose-500 ring-2 ring-rose-500/20 dark:border-rose-500"
                  />
                </div>

                {/* Approvals Table */}
                <UsersTable
                  users={filteredUsers}
                  loading={loadingData}
                  searchQuery={searchQuery}
                  onSearchChange={(e) => setSearchQuery(e.target.value)}
                  selectedUserUids={selectedUserUids}
                  onSelectAllUsers={handleSelectAllUsers}
                  onSelectUser={handleSelectUser}
                  onStatusUpdate={handleStatusUpdate}
                  onDeleteUser={handleDeleteUser}
                  onEditUser={startEditingUser}
                  onBatchStatusUpdate={handleBatchStatusUpdate}
                  onBatchDelete={handleBatchDelete}
                  onBatchReject={() => setShowBatchRejectModal(true)}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  statusFilter={statusFilter}
                  roleFilter={roleFilter}
                  onRoleFilterChange={setRoleFilter}
                  onCreateUserClick={() => setIsCreateUserOpen(true)}
                  getFieldLabel={getFieldLabel}
                  actionLoading={actionLoading}
                />
              </div>
            )}

            {/* Tab: Staff Management */}
            {activeTab === 'staff' && (
              <StaffManagement
                staffList={usersList.filter(u => u.role === 'salesman' || u.role === 'admin')}
                loading={loadingData}
                onRefresh={() => {
                  // Staff data comes from the same usersList subscription,
                  // so it auto-refreshes. This is a manual trigger if needed.
                }}
              />
            )}

            {/* Tab 2: Orders Request View */}
            {activeTab === 'orders' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <OrdersList
                  orders={ordersList}
                  usersList={usersList}
                  loading={loadingOrders}
                  onStatusChange={handleOrderStatusUpdate}
                  onDeleteOrder={handleDeleteOrder}
                  onUpdateOrder={handleUpdateOrderDetails}
                  getFieldLabel={getFieldLabel}
                  onMarkOutOfStock={handleMarkOutOfStock}
                  productsList={productsList}
                />
              </div>
            )}

            {/* Tab 3: Catalog/Products Management View */}
            {activeTab === 'products' && (
              <div className="space-y-6 animate-in fade-in duration-300">

                {/* Add Product Form Inline Header */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-md">
                  <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => setAddingProduct(!addingProduct)}>
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Add New Product</h3>
                      <p className="text-xs text-slate-400 font-bold">Expand to fill in product catalog details</p>
                    </div>
                    <Button variant="secondary" className="px-5 py-2">
                      {addingProduct ? "Collapse" : "Expand Form"}
                    </Button>
                  </div>

                  {addingProduct && (
                    <form onSubmit={handleAddProduct} className="space-y-6 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800/80 animate-in slide-in-from-top-4 duration-300">
                      
                      {/* STEP 1: Product Basics */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805 rounded-2xl p-5 space-y-4 text-left">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5d51e8] text-white text-[10px] font-black">1</span>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Product Basics</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Product Name"
                            required
                            value={newProdNameEn}
                            onChange={(e) => setNewProdNameEn(e.target.value)}
                            placeholder="e.g. iPhone 15 Pro"
                          />
                          <Input
                            label="Description"
                            value={newProdDescEn}
                            onChange={(e) => setNewProdDescEn(e.target.value)}
                            placeholder="Product description..."
                          />
                        </div>
                        <div>
                          {isAddingCustomCategory ? (
                            <div className="space-y-1 animate-in fade-in duration-200">
                              <label className="text-[10px] uppercase font-black text-slate-400">Custom Category Name</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="e.g. Textiles, Toys..."
                                  value={customCategoryInput}
                                  onChange={(e) => setCustomCategoryInput(e.target.value)}
                                  className="flex-grow px-3 py-2 bg-slate-50 dark:bg-zinc-955 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const cat = customCategoryInput.trim();
                                    if (!cat) return;
                                    if (settingsCategories.map(c => c.toLowerCase()).includes(cat.toLowerCase())) {
                                      setNewProdCategory(settingsCategories.find(c => c.toLowerCase() === cat.toLowerCase()) || cat);
                                      setIsAddingCustomCategory(false);
                                      setCustomCategoryInput('');
                                      return;
                                    }
                                    const updated = [...settingsCategories, cat];
                                    setSavingSettings(true);
                                    try {
                                      await updateGlobalSettings({ categories: updated });
                                      setSettingsCategories(updated);
                                      setGlobalSettings(prev => prev ? { ...prev, categories: updated } : null);
                                      setNewProdCategory(cat);
                                      setCustomCategoryInput('');
                                      setIsAddingCustomCategory(false);
                                      setAdminToast({ message: `Category "${cat}" added successfully!`, type: "success" });
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setSavingSettings(false);
                                    }
                                  }}
                                  className="px-3 py-2 bg-[#5d51e8] hover:bg-[#4b3fd3] text-white text-xs font-black rounded-xl cursor-pointer shadow transition-all"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingCustomCategory(false)}
                                  className="px-3 py-2 bg-slate-150 hover:bg-slate-200 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-350 text-xs font-black rounded-xl cursor-pointer transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex justify-between items-baseline">
                                <label className="text-[10px] uppercase font-black text-slate-400">Category</label>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingCustomCategory(true)}
                                  className="text-[9px] text-[#5d51e8] font-black hover:underline cursor-pointer"
                                >
                                  + New Category
                                </button>
                              </div>
                              <select
                                value={newProdCategory}
                                onChange={(e) => setNewProdCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 cursor-pointer"
                              >
                                {settingsCategories.map((cat) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* STEP 2: Pricing & B2B Range */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-left">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5d51e8] text-white text-[10px] font-black">2</span>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Pricing & B2B Range</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Price (INR)"
                            type="number"
                            required
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(e.target.value)}
                            placeholder="₹ Price"
                          />
                          <div className="space-y-1">
                            <Input
                              label="Unit"
                              required
                              value={newProdUnit}
                              onChange={(e) => setNewProdUnit(e.target.value)}
                              placeholder="e.g. Trip, Piece, Box"
                            />
                            {/* Quick Unit select chips */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {['Mtr', 'Pcs', 'Kg', 'Box', 'Set', 'Yard', 'Trip'].map(unit => (
                                <button
                                  key={unit}
                                  type="button"
                                  onClick={() => setNewProdUnit(unit)}
                                  className={`px-2 py-0.5 text-[9px] font-black rounded border transition-all cursor-pointer ${
                                    newProdUnit === unit 
                                      ? 'bg-[#5d51e8] text-white border-[#5d51e8]' 
                                      : 'bg-white dark:bg-zinc-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50'
                                  }`}
                                >
                                  {unit}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Variance & Custom Range setups */}
                        <div className="p-4 bg-slate-50/50 dark:bg-zinc-955/10 border border-slate-200/60 dark:border-zinc-850 rounded-xl space-y-4">
                          <div className="space-y-1">
                            <h4 className="text-[10px] uppercase font-black text-slate-405 flex items-center gap-1">
                              <SlidersHorizontal className="w-3 h-3 text-[#5d51e8]" />
                              B2B Price Range Setup (Optional)
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold leading-normal">
                              Specify custom variance percentage or absolute Min/Max bounds. Otherwise, defaults to global ±{globalSettings?.priceRangePct || 5}%.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Input
                              label="Price Variance (%)"
                              type="number"
                              value={newProdPriceRangePct}
                              onChange={(e) => {
                                setNewProdPriceRangePct(e.target.value);
                                if (e.target.value) {
                                  setNewProdMinPrice('');
                                  setNewProdMaxPrice('');
                                }
                              }}
                              placeholder="e.g. 10"
                            />
                            <Input
                              label="Custom Min Price (INR)"
                              type="number"
                              value={newProdMinPrice}
                              onChange={(e) => {
                                setNewProdMinPrice(e.target.value);
                                if (e.target.value) setNewProdPriceRangePct('');
                              }}
                              placeholder="Min value override"
                            />
                            <Input
                              label="Custom Max Price (INR)"
                              type="number"
                              value={newProdMaxPrice}
                              onChange={(e) => {
                                setNewProdMaxPrice(e.target.value);
                                if (e.target.value) setNewProdPriceRangePct('');
                              }}
                              placeholder="Max value override"
                            />
                          </div>

                          {/* Dynamic Sliders bounded around the original base price */}
                          {(() => {
                            const base = parseFloat(newProdPrice);
                            if (isNaN(base) || base <= 0) return null;

                            const minLimit = Math.floor(base * 0.5);
                            const maxLimit = Math.ceil(base * 1.5);
                            const currentMin = parseFloat(newProdMinPrice) || base;
                            const currentMax = parseFloat(newProdMaxPrice) || base;

                            return (
                              <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-zinc-800/60">
                                <span className="text-[10px] font-black text-slate-450 uppercase block">Interactive Range Adjusters</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                      <span>Min Price: ₹{currentMin}</span>
                                      <span>Limit: ₹{minLimit} - ₹{base}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={minLimit}
                                      max={base}
                                      value={currentMin}
                                      onChange={(e) => {
                                        setNewProdMinPrice(e.target.value);
                                        setNewProdPriceRangePct('');
                                      }}
                                      className="w-full accent-[#5d51e8] h-1 bg-slate-200 dark:bg-zinc-805 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                      <span>Max Price: ₹{currentMax}</span>
                                      <span>Limit: ₹{base} - ₹{maxLimit}</span>
                                    </div>
                                    <input
                                      type="range"
                                      min={base}
                                      max={maxLimit}
                                      value={currentMax}
                                      onChange={(e) => {
                                        setNewProdMaxPrice(e.target.value);
                                        setNewProdPriceRangePct('');
                                      }}
                                      className="w-full accent-[#5d51e8] h-1 bg-slate-200 dark:bg-zinc-805 rounded-lg appearance-none cursor-pointer"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Live storefront price range preview */}
                          {(() => {
                            const price = parseFloat(newProdPrice);
                            if (isNaN(price) || price <= 0) return null;

                            const minVal = parseFloat(newProdMinPrice);
                            const maxVal = parseFloat(newProdMaxPrice);
                            const unit = newProdUnit || 'Unit';

                            let displayRange = '';
                            let reason = '';

                            if (!isNaN(minVal) && !isNaN(maxVal) && minVal > 0 && maxVal > 0) {
                              displayRange = `₹${minVal.toLocaleString('en-IN')} - ₹${maxVal.toLocaleString('en-IN')}`;
                              reason = 'Custom Min/Max overrides';
                            } else {
                              const pct = parseFloat(newProdPriceRangePct);
                              const finalPct = !isNaN(pct) && pct >= 0 && pct <= 100 ? pct : (globalSettings?.priceRangePct || 5);
                              const factor = finalPct / 100;
                              const minCalculated = Math.floor(price * (1 - factor));
                              const maxCalculated = Math.ceil(price * (1 + factor));
                              displayRange = `₹${minCalculated.toLocaleString('en-IN')} - ₹${maxCalculated.toLocaleString('en-IN')}`;
                              reason = !isNaN(pct) ? `Custom ±${finalPct}% variance` : `Global default ±${finalPct}%`;
                            }

                            return (
                              <div className="mt-2 p-3 bg-emerald-50/50 dark:bg-emerald-955/10 border border-emerald-200/60 dark:border-emerald-900/35 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                                <div className="text-left">
                                  <span className="text-[9px] uppercase font-black tracking-wider text-emerald-600 dark:text-emerald-400 block">Live Price Range Preview</span>
                                  <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-300">{displayRange} <span className="text-[10px] font-bold text-slate-400">/ {unit}</span></span>
                                </div>
                                <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                  {reason}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* STEP 3: Catalog Codes */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-left">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5d51e8] text-white text-[10px] font-black">3</span>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Catalog Codes & Stock</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Product Code"
                            required
                            value={newProdCode}
                            onChange={(e) => setNewProdCode(e.target.value)}
                            placeholder="e.g. SKU-100"
                          />
                          <Input
                            label="Design Identifier"
                            required
                            value={newProdDesign}
                            onChange={(e) => setNewProdDesign(e.target.value)}
                            placeholder="e.g. Design-A"
                          />
                        </div>
                        <div className="pt-1">
                          <Checkbox
                            label="Available In Stock"
                            checked={newProdInStock}
                            onChange={(e) => setNewProdInStock(e.target.checked)}
                          />
                        </div>
                      </div>

                      {/* STEP 4: Media & Variants */}
                      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-left">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800/80">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5d51e8] text-white text-[10px] font-black">4</span>
                          <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Product Media & Variants</h4>
                        </div>

                        {/* Multi-Image Section */}
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black text-slate-405 flex items-center gap-1.5">
                            <Images className="w-3.5 h-3.5 text-[#5d51e8]" />
                            Product Images ({newProdImages.length})
                          </label>

                          {/* Uploaded Images Grid */}
                          {newProdImages.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50/50 dark:bg-zinc-955/10 border border-slate-200 dark:border-zinc-800 rounded-xl">
                              {newProdImages.map((img, idx) => (
                                <div key={idx} className="relative group flex flex-col items-center gap-1.5 p-1 border border-slate-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 rounded-xl animate-in zoom-in-95 duration-200">
                                  <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm">
                                    <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                    
                                    {/* Action: remove image */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewProdImages(prev => {
                                          const updated = prev.filter((_, i) => i !== idx);
                                          return updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` }));
                                        });
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
                                      title="Delete Image"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Cover photo indicator/swap action */}
                                    {idx === 0 ? (
                                      <span className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm border border-emerald-400">
                                        ⭐ Cover
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewProdImages(prev => {
                                            const updated = [...prev];
                                            const selected = updated[idx];
                                            updated.splice(idx, 1);
                                            updated.unshift(selected);
                                            return updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` }));
                                          });
                                        }}
                                        className="absolute bottom-1 left-1 bg-black/65 hover:bg-[#5d51e8] text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-white/10"
                                      >
                                        Set Cover
                                      </button>
                                    )}
                                  </div>
                                  <span className="text-[9px] font-black text-slate-400 uppercase truncate max-w-full px-1">{img.label}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Upload Zone */}
                          {true && (
                            <div className="space-y-3">
                              <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] dark:hover:border-[#5d51e8] rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-950/20 transition-colors group">
                                {isNewProdCompressing ? (
                                  <div className="flex flex-col items-center space-y-2 py-2">
                                    <Loader2 className="w-7 h-7 animate-spin text-[#5d51e8]" />
                                    <span className="text-xs font-bold text-slate-500">Compressing & optimizing...</span>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center space-y-2 cursor-pointer w-full py-2">
                                    <div className="p-2 bg-slate-100 dark:bg-zinc-850 text-slate-400 dark:text-slate-500 rounded-xl group-hover:text-[#5d51e8] group-hover:bg-[#5d51e8]/5 transition-colors">
                                      <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-350 block">Click to upload images</span>
                                      <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">JPG, PNG, WebP • Auto-compressed</span>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      onChange={handleNewProdFileChange}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                              </div>

                              {/* URL paste input */}
                              <div className="flex gap-2">
                                <input
                                  type="url"
                                  placeholder="Or paste image URL here..."
                                  value={newProdImageUrlInput}
                                  onChange={(e) => setNewProdImageUrlInput(e.target.value)}
                                  className="flex-grow px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100 placeholder-slate-450"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (newProdImageUrlInput.trim()) {
                                      setNewProdImages(prev => [
                                        ...prev,
                                        { url: newProdImageUrlInput.trim(), label: `Image ${prev.length + 1}` }
                                      ]);
                                      setNewProdImageUrlInput('');
                                    }
                                  }}
                                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-955/20 text-[#5d51e8] dark:text-indigo-300 font-black text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/40 cursor-pointer transition-all active:scale-95"
                                >
                                  Add URL
                                </button>
                              </div>
                            </div>
                          )}
                        {/* Variants Section */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-black text-slate-455 flex items-center gap-1">
                              Variants / Models ({newProdVariants.length})
                            </label>
                          </div>
                          
                          {newProdVariants.length > 0 && (
                            <div className="bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 space-y-2.5">
                              <p className="text-[10px] font-bold text-slate-450">
                                Variants (Models) are automatically generated for each uploaded image. Clients will select the model by swiping/viewing the corresponding photo.
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {newProdVariants.map((variant, idx) => {
                                  const img = newProdImages[variant.imageIndex];
                                  return (
                                    <div key={variant.id} className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-lg">
                                      {img && (
                                        <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-slate-200 dark:border-zinc-800">
                                          <img src={img.url} className="w-full h-full object-cover" alt="" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-[10px] font-black text-slate-800 dark:text-white">{variant.name}</p>
                                        <p className="text-[8px] font-bold text-slate-400">Photo {idx + 1}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                        <Button type="button" variant="secondary" onClick={() => setAddingProduct(false)}>Cancel</Button>
                        <Button type="submit" disabled={isNewProdCompressing}>Create Product</Button>
                      </div>
                    </form>
                  )}
                </div>

                <ProductsTable
                  products={paginatedProducts}
                  allProductsList={productsList}
                  loading={loadingProducts}
                  searchQuery={productSearchQuery}
                  onSearchChange={(e) => setProductSearchQuery(e.target.value)}
                  selectedProductIds={selectedProductIds}
                  onSelectAllProducts={handleSelectAllProducts}
                  onSelectProduct={handleSelectProduct}
                  onSort={handleProductSort}
                  sortField={productSortField}
                  sortDirection={productSortDirection}
                  currentPage={productPage}
                  pageSize={productPageSize}
                  totalPages={totalProductPages}
                  totalItems={filteredProducts.length}
                  onPageChange={setProductPage}
                  onEditProduct={startEditingProduct}
                  onDeleteProduct={handleDeleteProduct}
                  onBatchDeleteProducts={() => setShowBatchDeleteProductsModal(true)}
                  onSeedCatalog={handleSeedCatalog}
                  seedingCatalog={seedingCatalog}
                  onDownloadCSVTemplate={handleDownloadCSVTemplate}
                  onCSVUpload={handleCSVUpload}
                  onToggleStock={handleToggleStock}
                />
              </div>
            )}

            {/* Tab 4: Dynamic Custom Settings Tab */}
            {activeTab === 'fields' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                {/* Form to add Custom Fields */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-md p-6 h-fit space-y-5">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Add Registration Question</h3>
                    <p className="text-xs text-slate-400 font-bold">Define custom dynamic fields for users</p>
                  </div>

                  <form onSubmit={handleAddField} className="space-y-4">
                    <Input
                      label="Question Label"
                      required
                      value={newFieldLabelEn}
                      onChange={(e) => setNewFieldLabelEn(e.target.value)}
                      placeholder="e.g. Firm Name"
                    />

                    <div className="grid grid-cols-1 gap-3">
                      <Select
                        label="Input Type"
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                      >
                        <option value="text">Text (General)</option>
                        <option value="tel">Telephone / Phone</option>
                        <option value="number">Number</option>
                      </Select>

                      <div className="mt-2">
                        <Checkbox
                          label="Required?"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                        />
                      </div>
                    </div>

                    <Button type="submit" loading={addingField} className="w-full py-3.5 mt-2">
                      {!addingField && <PlusCircle className="w-4 h-4" />}
                      <span>Add Profile Field</span>
                    </Button>
                  </form>
                </div>

                {/* List dynamic registration fields */}
                <div className="lg:col-span-2">
                  <DynamicFieldsList
                    fieldsList={fieldsList}
                    loading={loadingFields}
                    onDeleteField={handleDeleteField}
                    editingFieldId={editingFieldId}
                    onStartEdit={startEditingField}
                    onCancelEdit={handleCancelEdit}
                    onUpdateField={handleUpdateField}
                    editLabel={editFieldLabelEn}
                    onEditLabelChange={setEditFieldLabelEn}
                    editType={editFieldType}
                    onEditTypeChange={setEditFieldType}
                    editRequired={editFieldRequired}
                    onEditRequiredChange={setEditFieldRequired}
                    updatingField={updatingField}
                  />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Global Dashboard Modals */}
      <ConfirmModal
        isOpen={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out from the Admin Portal?"
        confirmText="Yes, Sign Out"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={deletingUserUid !== null}
        onClose={() => setDeletingUserUid(null)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User Registration"
        message="Are you sure you want to permanently delete this user profile? All details will be permanently removed. This action cannot be undone."
        confirmText="Yes, Delete Account"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        onConfirm={handleConfirmBatchDelete}
        title="Batch Delete Accounts"
        message={`Are you sure you want to permanently delete the ${selectedUserUids.length} selected user profiles? All details will be permanently removed. This action cannot be undone.`}
        confirmText="Yes, Delete Selected"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={rejectingUserUid !== null}
        onClose={() => setRejectingUserUid(null)}
        onConfirm={handleConfirmRejectUser}
        title="Reject User Registration"
        message="Are you sure you want to reject this user registration? They will not be able to log in or order until approved."
        confirmText="Yes, Reject"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={showBatchRejectModal}
        onClose={() => setShowBatchRejectModal(false)}
        onConfirm={handleConfirmBatchReject}
        title="Batch Reject Accounts"
        message={`Are you sure you want to reject the ${selectedUserUids.length} selected user registrations?`}
        confirmText="Yes, Reject Selected"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={deletingProductId !== null}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Delete Product Item"
        message="Are you sure you want to permanently remove this product from the catalog? This action cannot be undone."
        confirmText="Yes, Delete Product"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={showBatchDeleteProductsModal}
        onClose={() => setShowBatchDeleteProductsModal(false)}
        onConfirm={handleConfirmBatchDeleteProducts}
        title="Batch Delete Products"
        message={`Are you sure you want to permanently delete the ${selectedProductIds.length} selected products from the catalog? This action cannot be undone.`}
        confirmText="Yes, Delete Selected"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={deletingFieldId !== null}
        onClose={() => setDeletingFieldId(null)}
        onConfirm={handleConfirmDeleteField}
        title="Delete Profile Question"
        message="Are you sure you want to delete this profile question? Users will no longer be asked this during registration."
        confirmText="Yes, Delete Question"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={showSeedCatalogConfirm}
        onClose={() => setShowSeedCatalogConfirm(false)}
        onConfirm={handleConfirmSeedCatalog}
        title="Seed Catalog Products"
        message="This will seed the database with 21 default products. Continue?"
        confirmText="Yes, Seed Catalog"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={csvProductsToImport.length > 0}
        onClose={() => setCsvProductsToImport([])}
        onConfirm={handleConfirmCSVImport}
        title="Import Products from CSV"
        message={`Are you sure you want to import ${csvProductsToImport.length} products from the selected CSV file?`}
        confirmText="Yes, Import Products"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={deletingOrderId !== null}
        onClose={() => setDeletingOrderId(null)}
        onConfirm={handleConfirmDeleteOrder}
        title="Archive Order Request"
        message="Are you sure you want to permanently delete this order request? This action cannot be undone."
        confirmText="Yes, Delete Order"
        cancelText="Cancel"
      />

      {/* Edit User Modal */}
      <UserEditModal
        isOpen={editingUser !== null}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        name={editUserName}
        onNameChange={setEditUserName}
        email={editUserEmail}
        onEmailChange={setEditUserEmail}
        customDetails={editUserCustomDetails}
        onCustomDetailChange={handleCustomDetailChange}
        fieldsList={fieldsList}
        role={editUserRole}
        onRoleChange={setEditUserRole}
        onSave={handleSaveEditedUser}
        saving={savingEditedUser}
      />

      {/* Create User Modal */}
      <UserCreateModal
        isOpen={isCreateUserOpen}
        onClose={() => setIsCreateUserOpen(false)}
        fieldsList={fieldsList}
        onSave={handleCreateUserProfile}
        saving={creatingUser}
      />

      {/* Edit Product Modal */}
      <ProductEditModal
        isOpen={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        product={editingProduct}
        nameEn={editProdNameEn}
        onNameEnChange={setEditProdNameEn}
        descEn={editProdDescEn}
        onDescEnChange={setEditProdDescEn}
        price={editProdPrice}
        onPriceChange={setEditProdPrice}
        unit={editProdUnit}
        onUnitChange={setEditProdUnit}
        category={editProdCategory}
        onCategoryChange={setEditProdCategory}
        categoriesList={settingsCategories}
        images={editProdImages}
        onImagesChange={setEditProdImages}
        variants={editProdVariants}
        onVariantsChange={setEditProdVariants}
        inStock={editProdInStock}
        onInStockChange={setEditProdInStock}
        code={editProdCode}
        onCodeChange={setEditProdCode}
        design={editProdDesign}
        onDesignChange={setEditProdDesign}
        onSave={handleSaveEditedProduct}
        saving={savingEditedProduct}
        priceRangePct={editProdPriceRangePct}
        onPriceRangePctChange={setEditProdPriceRangePct}
        minPrice={editProdMinPrice}
        onMinPriceChange={setEditProdMinPrice}
        maxPrice={editProdMaxPrice}
        onMaxPriceChange={setEditProdMaxPrice}
      />

      {adminToast && (
        <Toast
          message={adminToast.message}
          type={adminToast.type}
          onClose={() => setAdminToast(null)}
          onClick={adminToast.onClick}
        />
      )}

    </div>
  );
}
