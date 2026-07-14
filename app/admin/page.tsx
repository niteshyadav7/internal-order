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
  preRegisterUserProfile
} from '../lib/db';
import { FALLBACK_PRODUCTS } from '../components/products/ProductCatalog';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { compressImage } from '../lib/image';

// Icons for metrics cards
import { Users, CheckCircle, Clock, XCircle, PlusCircle, Loader2, Bell, ShoppingBag, X, Check, Upload, Trash2, Plus, Images } from 'lucide-react';

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

// Atoms for Form Components
import { Input, Checkbox, Select } from '../components/atoms/Input';
import Button from '../components/atoms/Button';

export default function AdminDashboard() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'products' | 'fields' | 'notifications'>('users');
  
  // Dynamic window/tab title
  useEffect(() => {
    const tabTitles: Record<string, string> = {
      users: 'Admin - User Approvals',
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
  }, [isAdmin, isFirebaseLoaded, adminEmail, router]);

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

  useEffect(() => {
    if (isAdmin && isFirebaseLoaded && auth?.currentUser) {
      fetchFields(); // Load fields to resolve custom field IDs to labels
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

  const startEditingProduct = (product: Product) => {
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
        variants: editProdVariants
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
        variants: editProdVariants
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
        variants: newProdVariants
      });
      if (addedProduct) {
        setProductsList(prev => [addedProduct, ...prev]);
        setNewProdNameEn('');
        setNewProdDescEn('');
        setNewProdPrice('');
        setNewProdUnit('Trip');
        setNewProdImageUrl('gradient-indigo');
        setNewProdCategory('Electronics');
        setNewProdInStock(true);
        setNewProdCode('');
        setNewProdDesign('');
        setNewProdImages([]);
        setNewProdVariants([]);
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
      '# HINT: category = One of: Electronics, Fashion, Home & Kitchen, Beauty & Care, Furniture & Decor, Fitness.'
    ];
    const headers = ['nameEn', 'descEn', 'price', 'unit', 'category', 'imageUrl', 'images', 'variants'];
    const sampleRow = [
      '"iPhone 15 Pro Max"',
      '"Sleek Titanium design featuring A17 Pro chip"',
      '159900',
      '"Piece"',
      '"Electronics"',
      '"https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80"',
      '"https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80;https://images.unsplash.com/photo-1695048132924-607213e4b7bf?w=600&q=80;https://images.unsplash.com/photo-1695048704763-23e59048a12e?w=600&q=80"',
      '"Natural Titanium:0;Blue Titanium:1;White Titanium:2"'
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
          variants
        });
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
  const totalUsers = usersList.length;
  const approvedUsers = usersList.filter(u => u.status === 'approved').length;
  const pendingUsers = usersList.filter(u => u.status === 'pending').length;
  const rejectedUsers = usersList.filter(u => u.status === 'rejected').length;

  const getFilteredAndSortedUsers = () => {
    let result = [...usersList];
    
    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(u => u.status === statusFilter);
    }
    
    // Role Filter
    if (roleFilter !== 'all') {
      result = result.filter(u => {
        const uRole = u.role || 'client';
        return uRole === roleFilter;
      });
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

  if (checkingSession || !isAdmin || !isFirebaseLoaded) {
    return <Loader fullscreen text="Verifying administrator credentials..." />;
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
                      This domain (<code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px]">balajitextiles.phyteam.com</code>) is not authorized in your Firebase Console. Database actions (Approve, Reject, Delete) will fail until authorized.
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
                    <form onSubmit={handleAddProduct} className="space-y-4 mt-6 pt-6 border-t border-slate-100 dark:border-zinc-800/80 animate-in slide-in-from-top-4 duration-300">
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
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <Input
                          label="Price (INR)"
                          type="number"
                          required
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(e.target.value)}
                          placeholder="₹ Price"
                        />
                        <Input
                          label="Unit"
                          required
                          value={newProdUnit}
                          onChange={(e) => setNewProdUnit(e.target.value)}
                          placeholder="e.g. Trip, Piece, Box"
                        />
                        <Select
                          label="Category"
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Fashion">Fashion</option>
                          <option value="Home & Kitchen">Home & Kitchen</option>
                          <option value="Beauty & Care">Beauty & Care</option>
                          <option value="Furniture & Decor">Furniture & Decor</option>
                          <option value="Fitness">Fitness</option>
                        </Select>
                      </div>

                      {/* Multi-Image Upload Section */}
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <label className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1.5">
                          <Images className="w-3 h-3" />
                          Product Images ({newProdImages.length}/8)
                        </label>

                        {/* Uploaded Images Grid */}
                        {newProdImages.length > 0 && (
                          <div className="flex flex-wrap gap-3 p-3 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                            {newProdImages.map((img, idx) => (
                              <div key={idx} className="relative group flex flex-col items-center gap-1.5">
                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 dark:border-zinc-700 shadow-sm">
                                  <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewProdImages(prev => {
                                        const updated = prev.filter((_, i) => i !== idx);
                                        // Re-label all images
                                        return updated.map((im, i) => ({ ...im, label: `Image ${i + 1}` }));
                                      });
                                    }}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase">{img.label}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Upload Zone */}
                        {newProdImages.length < 8 && (
                          <div className="space-y-3">
                            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 hover:border-[#5d51e8] dark:hover:border-[#5d51e8] rounded-2xl p-4 bg-slate-50/50 dark:bg-zinc-950/20 transition-colors group">
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
                                    <span className="text-[10px] text-slate-400 font-bold mt-0.5 block">JPG, PNG, WebP • Max 8 images • Auto-compressed</span>
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
                                className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 text-[#5d51e8] dark:text-indigo-300 font-black text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/40 cursor-pointer transition-all active:scale-95"
                              >
                                Add URL
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Variants / Models Section */}
                      <div className="space-y-2 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-black text-slate-400">
                            Variants / Models ({newProdVariants.length})
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setNewProdVariants(prev => [...prev, {
                                id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                name: '',
                                imageIndex: 0
                              }]);
                            }}
                            className="flex items-center gap-1 text-[10px] font-black text-[#5d51e8] hover:text-[#4b3fd3] cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Variant
                          </button>
                        </div>

                        {newProdVariants.length > 0 && (
                          <div className="space-y-2 p-3 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-800 rounded-2xl">
                            {newProdVariants.map((variant, idx) => (
                              <div key={variant.id} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={variant.name}
                                  onChange={(e) => {
                                    setNewProdVariants(prev => prev.map((v, i) => i === idx ? { ...v, name: e.target.value } : v));
                                  }}
                                  placeholder={`e.g. Model-${String.fromCharCode(65 + idx)}, Red, 128GB`}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800 dark:text-slate-100"
                                />
                                <select
                                  value={variant.imageIndex}
                                  onChange={(e) => {
                                    setNewProdVariants(prev => prev.map((v, i) => i === idx ? { ...v, imageIndex: parseInt(e.target.value) } : v));
                                  }}
                                  className="w-28 px-2 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold outline-none focus:border-[#5d51e8] text-slate-800"
                                >
                                  {newProdImages.length > 0 ? (
                                    newProdImages.map((img, imgIdx) => (
                                      <option key={imgIdx} value={imgIdx}>{img.label}</option>
                                    ))
                                  ) : (
                                    <option value={0}>No images</option>
                                  )}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => setNewProdVariants(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-1 animate-in fade-in duration-200">
                        <Checkbox
                          label="Available In Stock"
                          checked={newProdInStock}
                          onChange={(e) => setNewProdInStock(e.target.checked)}
                        />
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
