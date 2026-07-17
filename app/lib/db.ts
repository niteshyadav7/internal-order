import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { app } from './firebase';

export const db = app ? getFirestore(app) : null;

// Strip undefined values recursively — Firestore rejects them
function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeForFirestore(v)])
    );
  }
  return obj;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  customDetails?: Record<string, string>;
  registrationCompleted?: boolean;
  requestedFirmName?: string;
  role?: 'client' | 'salesman' | 'admin';
  plainPassword?: string;  // Only for staff accounts created directly by admin
}

// Create or retrieve user profile in Firestore
export async function getOrCreateUserProfile(
  uid: string,
  email: string,
  name: string
): Promise<UserProfile | null> {
  if (!db) {
    console.warn("Firestore is not initialized. Skipping profile query.");
    return null;
  }
  
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }

    // Check if user was pre-registered by Admin using their email
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    let preRegisteredProfile: UserProfile | null = null;
    let oldDocId = '';
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email && data.email.toLowerCase() === email.toLowerCase()) {
        preRegisteredProfile = data as UserProfile;
        oldDocId = doc.id;
      }
    });

    if (preRegisteredProfile) {
      const profileData = preRegisteredProfile as UserProfile;
      const mergedProfile: UserProfile = {
        ...profileData,
        uid,
        registrationCompleted: profileData.registrationCompleted ?? false,
        role: profileData.role || 'client'
      };
      await setDoc(userRef, mergedProfile);
      
      if (oldDocId !== uid) {
        await deleteDoc(doc(db, 'users', oldDocId));
      }
      return mergedProfile;
    }

    const newProfile: UserProfile = {
      uid,
      email,
      name: name || email.split('@')[0],
      status: 'pending', // default status for any new signups
      createdAt: new Date().toISOString(),
      registrationCompleted: false,
      role: 'client'
    };

    await setDoc(userRef, newProfile);
    return newProfile;
  } catch (error) {
    console.error("Error in getOrCreateUserProfile:", error);
    return null;
  }
}

// Get user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? (userSnap.data() as UserProfile) : null;
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return null;
  }
}

// Sync and approve admin profile in Firestore under their real Auth UID
export async function syncAdminProfile(uid: string, email: string): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data()?.status !== 'approved') {
      console.log("Syncing admin profile in Firestore under UID:", uid);
      await setDoc(userRef, {
        uid,
        email,
        name: 'System Admin',
        status: 'approved',
        createdAt: new Date().toISOString(),
        registrationCompleted: true,
        role: 'admin'
      }, { merge: true });
    }
  } catch (error) {
    console.error("Error in syncAdminProfile:", error);
  }
}

// Update user profile approval status
export async function updateUserProfileStatus(
  uid: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { status });
  } catch (error) {
    console.error("Error in updateUserProfileStatus:", error);
    throw error;
  }
}

// Update user profile details (Admin)
export async function updateUserProfile(
  uid: string,
  details: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, details);
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    throw error;
  }
}

// Delete user profile (Admin)
export async function deleteUserProfile(uid: string): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error in deleteUserProfile:", error);
    throw error;
  }
}

// Get all user profiles (for Admin view)
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserProfile);
    });
    // Sort by join date descending
    return users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error in getAllUserProfiles:", error);
    return [];
  }
}

// Subscribe to all user profiles in real-time (for Admin view)
export function subscribeToUserProfiles(callback: (users: UserProfile[]) => void): () => void {
  if (!db) return () => {};
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const users: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      // Sort by join date descending
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(users);
    }, (error) => {
      console.error("Error subscribing to user profiles:", error);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Failed to setup real-time subscription:", error);
    return () => {};
  }
}

// Subscribe to all orders in real-time (for Admin view)
export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
  if (!db) return () => {};
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const orders: Order[] = [];
      querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() } as Order);
      });
      // Sort by creation date descending
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(orders);
    }, (error) => {
      console.error("Error subscribing to orders:", error);
    });
    return unsubscribe;
  } catch (error) {
    console.error("Failed to setup real-time orders subscription:", error);
    return () => {};
  }
}

// Product Image Entry
export interface ProductImage {
  url: string;       // base64 data URL or http URL
  label: string;     // Auto-generated: "Image 1", "Image 2", etc.
}

// Product Variant/Model Option
export interface ProductVariant {
  id: string;        // auto-generated unique ID
  name: string;      // e.g. "Red", "128GB", "Model-A"
  imageIndex: number; // which image from images[] to show for this variant
}

// Product Interface
export interface Product {
  id?: string;
  nameEn: string;
  nameHi: string;
  descEn: string;
  descHi: string;
  price: number;
  unit: string;
  imageUrl: string;
  category: string;
  createdAt: string;
  inStock?: boolean;
  code?: string;
  design?: string;
  images?: ProductImage[];      // Multiple product images
  variants?: ProductVariant[];  // Model/variant options
  priceRangePct?: number;       // Custom product price variance % override
  minPrice?: number;            // Custom product minimum price override
  maxPrice?: number;            // Custom product maximum price override
}

// Order Item Interface
export interface OrderItem {
  productId: string;
  nameEn: string;
  nameHi: string;
  price: number;
  unit: string;
  quantity: number;
  code?: string;
  design?: string;
  selectedVariant?: string;     // Variant name chosen by user
  selectedImageUrl?: string;    // Image URL of selected variant (for PDF)
  priceRangePct?: number;       // Snapshot of custom price variance % override
  minPrice?: number;            // Snapshot of custom min price override
  maxPrice?: number;            // Snapshot of custom max price override
  prepStatus?: 'found' | 'hold' | 'not_found'; // Salesman packing status
}

// Helper to format price range (protects from changing daily rate issues)
export function getPriceRange(price: number, pct: number = 5, minPrice?: number, maxPrice?: number): string {
  if (!price || price <= 0) return 'N/A';
  if (minPrice !== undefined && maxPrice !== undefined && minPrice !== null && maxPrice !== null && minPrice > 0 && maxPrice > 0) {
    return `₹${minPrice.toLocaleString('en-IN')} - ₹${maxPrice.toLocaleString('en-IN')}`;
  }
  const factor = pct / 100;
  let min = price * (1 - factor);
  let max = price * (1 + factor);
  if (price >= 10000) {
    min = Math.floor(min / 1000) * 1000;
    max = Math.ceil(max / 1000) * 1000;
  } else if (price >= 1000) {
    min = Math.floor(min / 100) * 100;
    max = Math.ceil(max / 100) * 100;
  } else {
    min = Math.floor(min / 10) * 10;
    max = Math.ceil(max / 10) * 10;
  }
  return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
}

// Order Interface
export interface Order {
  id?: string;
  userUid: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  trackingNumber?: string;
  adminNotes?: string;
  salesmanNotes?: string;
  assignedSalesmanUid?: string;
  assignedSalesmanName?: string;
}

// Fetch all products from Firestore
export async function getProducts(): Promise<Product[]> {
  if (!db) return [];
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    // Sort by creation date descending
    return products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error in getProducts:", error);
    return [];
  }
}

export interface PaginatedProductsResult {
  products: Product[];
  lastVisible: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

// Fetch products from Firestore paginated in batches
export async function getProductsPaginated(
  lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null,
  batchSize: number = 15
): Promise<PaginatedProductsResult> {
  if (!db) return { products: [], lastVisible: null, hasMore: false };
  try {
    const productsRef = collection(db, 'products');
    let q;
    if (lastVisibleDoc) {
      q = query(
        productsRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastVisibleDoc),
        limit(batchSize)
      );
    } else {
      q = query(
        productsRef,
        orderBy('createdAt', 'desc'),
        limit(batchSize)
      );
    }
    const querySnapshot = await getDocs(q);
    const products: Product[] = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
    const hasMore = querySnapshot.docs.length === batchSize;

    return { products, lastVisible, hasMore };
  } catch (error) {
    console.error("Error in getProductsPaginated:", error);
    return { products: [], lastVisible: null, hasMore: false };
  }
}
// Add a new product (Admin)
export async function createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> {
  if (!db) return null;
  try {
    const productsRef = collection(db, 'products');
    const newProduct = sanitizeForFirestore({
      inStock: true,
      ...product,
      createdAt: new Date().toISOString()
    });
    const docRef = await addDoc(productsRef, newProduct);
    return { id: docRef.id, ...newProduct };
  } catch (error) {
    console.error("Error in createProduct:", error);
    throw error;
  }
}

// Update product details (Admin)
export async function updateProduct(
  id: string,
  details: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<void> {
  if (!db) return;
  try {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, sanitizeForFirestore(details));
  } catch (error) {
    console.error("Error in updateProduct:", error);
    throw error;
  }
}

// Delete product (Admin)
export async function deleteProduct(id: string): Promise<void> {
  if (!db) return;
  try {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    throw error;
  }
}


// Create a new order (User)
export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order | null> {
  if (!db) return null;
  try {
    const ordersRef = collection(db, 'orders');
    const newOrder = sanitizeForFirestore({
      ...order,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    });
    const docRef = await addDoc(ordersRef, newOrder);
    const createdOrder = { id: docRef.id, ...newOrder };

    // Send email notification alert (fire-and-forget style to avoid blocking the user)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order: createdOrder,
          origin
        })
      }).catch(err => console.error("Email notification dispatch failed:", err));
    } catch (e) {
      console.error("Email notification fetch call failed:", e);
    }

    return createdOrder;
  } catch (error) {
    console.error("Error in createOrder:", error);
    return null;
  }
}

// Fetch all orders (Admin)
export async function getOrders(): Promise<Order[]> {
  if (!db) return [];
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef);
    const querySnapshot = await getDocs(q);
    const orders: Order[] = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    // Sort by creation date descending (latest orders first)
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Error in getOrders:", error);
    return [];
  }
}

// Update order status (Admin)
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status });
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    throw error;
  }
}

// Profile Field Interface
export interface ProfileField {
  id?: string;
  labelEn: string;
  labelHi: string;
  type: 'text' | 'number' | 'tel';
  required: boolean;
  createdAt: string;
}

// Fetch all custom profile fields defined by Admin
export async function getProfileFields(): Promise<ProfileField[]> {
  if (!db) return [];
  try {
    const fieldsRef = collection(db, 'profile_fields');
    const q = query(fieldsRef);
    const querySnapshot = await getDocs(q);
    const fields: ProfileField[] = [];
    querySnapshot.forEach((doc) => {
      fields.push({ id: doc.id, ...doc.data() } as ProfileField);
    });
    
    // Seed default fields only once using a metadata initialization flag
    const initRef = doc(db, 'metadata', 'fields_init');
    const initSnap = await getDoc(initRef);
    if (!initSnap.exists()) {
      const defaultField = { labelEn: "Firm Name", labelHi: "फर्म का नाम", type: "text" as const, required: true };
      const created = await createProfileField(defaultField);
      if (created) fields.push(created);
      await setDoc(initRef, { initialized: true });
    }
    
    // Sort by creation date
    return fields.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (error) {
    console.error("Error in getProfileFields:", error);
    return [];
  }
}

// Create a new profile field (Admin)
export async function createProfileField(field: Omit<ProfileField, 'id' | 'createdAt'>): Promise<ProfileField | null> {
  if (!db) return null;
  try {
    const fieldsRef = collection(db, 'profile_fields');
    const newField = {
      ...field,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(fieldsRef, newField);
    return { id: docRef.id, ...newField };
  } catch (error) {
    console.error("Error in createProfileField:", error);
    return null;
  }
}

// Delete a profile field (Admin)
export async function deleteProfileField(fieldId: string): Promise<void> {
  if (!db) return;
  try {
    const fieldRef = doc(db, 'profile_fields', fieldId);
    await deleteDoc(fieldRef);
  } catch (error) {
    console.error("Error in deleteProfileField:", error);
    throw error;
  }
}

// Update a profile field (Admin)
export async function updateProfileField(
  fieldId: string,
  updates: Partial<Omit<ProfileField, 'id' | 'createdAt'>>
): Promise<void> {
  if (!db) return;
  try {
    const fieldRef = doc(db, 'profile_fields', fieldId);
    await updateDoc(fieldRef, updates);
  } catch (error) {
    console.error("Error in updateProfileField:", error);
    throw error;
  }
}

// Update User Custom Profile Details (User)
export async function updateUserProfileDetails(
  uid: string,
  customDetails: Record<string, string>
): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { customDetails });
  } catch (error) {
    console.error("Error in updateUserProfileDetails:", error);
    throw error;
  }
}

// Complete User Profile Registration (User)
export async function completeUserProfileRegistration(
  uid: string,
  customDetails: Record<string, string>,
  name?: string
): Promise<void> {
  if (!db) return;
  try {
    const userRef = doc(db, 'users', uid);
    const updateData: any = {
      customDetails,
      registrationCompleted: true
    };
    if (name) {
      updateData.name = name;
    }
    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error("Error in completeUserProfileRegistration:", error);
    throw error;
  }
}

// Update order details (User/Admin)
export async function updateOrder(
  id: string,
  details: Partial<Omit<Order, 'id' | 'createdAt'>>
): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', id);
    await updateDoc(orderRef, details);
  } catch (error) {
    console.error("Error in updateOrder:", error);
    throw error;
  }
}

// Delete / Cancel order (User/Admin)
export async function deleteOrder(id: string): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', id);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    throw error;
  }
}

// Pre-register user profiles (Admin)
export async function preRegisterUserProfile(
  profile: Omit<UserProfile, 'uid' | 'createdAt'>
): Promise<UserProfile | null> {
  if (!db) return null;
  try {
    const usersRef = collection(db, 'users');
    const newProfile = {
      ...profile,
      uid: '', // generated empty until they sign up
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(usersRef, newProfile);
    return { ...newProfile, uid: docRef.id } as any;
  } catch (error) {
    console.error("Error in preRegisterUserProfile:", error);
    return null;
  }
}

// Claim order (Salesman)
export async function claimOrder(
  orderId: string,
  salesmanUid: string,
  salesmanName: string
): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'processing',
      assignedSalesmanUid: salesmanUid,
      assignedSalesmanName: salesmanName
    });
  } catch (error) {
    console.error("Error in claimOrder:", error);
    throw error;
  }
}

// Complete / Dispatch order (Salesman)
export async function completeOrder(orderId: string): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: 'completed' });
  } catch (error) {
    console.error("Error in completeOrder:", error);
    throw error;
  }
}

// Release order back to queue (Salesman)
export async function releaseOrder(orderId: string): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'pending',
      assignedSalesmanUid: null,
      assignedSalesmanName: null
    });
  } catch (error) {
    console.error("Error in releaseOrder:", error);
    throw error;
  }
}

// Global Settings Interface
export interface GlobalSettings {
  categories: string[];
  priceRangePct: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  categories: ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty & Care', 'Furniture & Decor', 'Fitness'],
  priceRangePct: 5
};

// Retrieve Global Settings from Firestore
export async function getGlobalSettings(): Promise<GlobalSettings> {
  if (!db) return DEFAULT_SETTINGS;
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        categories: data.categories || DEFAULT_SETTINGS.categories,
        priceRangePct: data.priceRangePct !== undefined ? data.priceRangePct : DEFAULT_SETTINGS.priceRangePct
      };
    }
    // Seed default settings if not exists
    await setDoc(docRef, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  } catch (err) {
    console.error("Error fetching global settings:", err);
    return DEFAULT_SETTINGS;
  }
}

// Update Global Settings in Firestore
export async function updateGlobalSettings(settings: Partial<GlobalSettings>): Promise<boolean> {
  if (!db) return false;
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, settings, { merge: true });
    return true;
  } catch (err) {
    console.error("Error updating global settings:", err);
    return false;
  }
}

// ─── STOCK ALERTS ───────────────────────────────────────────────────

export interface StockAlert {
  id?: string;
  productId: string;
  productName: string;
  reportedByUid: string;
  reportedByName: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

// Create a stock alert (Salesman reports out-of-stock)
export async function createStockAlert(
  alert: Omit<StockAlert, 'id' | 'createdAt' | 'resolved'>
): Promise<StockAlert | null> {
  if (!db) return null;
  try {
    const alertsRef = collection(db, 'stock_alerts');
    const newAlert = sanitizeForFirestore({
      ...alert,
      resolved: false,
      createdAt: new Date().toISOString()
    });
    const docRef = await addDoc(alertsRef, newAlert);
    return { id: docRef.id, ...newAlert };
  } catch (error) {
    console.error('Error creating stock alert:', error);
    return null;
  }
}

// Subscribe to stock alerts in real-time (Admin)
export function subscribeToStockAlerts(
  callback: (alerts: StockAlert[]) => void
): () => void {
  if (!db) { callback([]); return () => {}; }
  const alertsRef = collection(db, 'stock_alerts');
  const q = query(alertsRef, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const alerts: StockAlert[] = [];
    snapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() } as StockAlert);
    });
    callback(alerts);
  });
}

// Resolve a stock alert (Admin)
export async function resolveStockAlert(id: string): Promise<void> {
  if (!db) return;
  try {
    const alertRef = doc(db, 'stock_alerts', id);
    await updateDoc(alertRef, {
      resolved: true,
      resolvedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resolving stock alert:', error);
    throw error;
  }
}

// Add salesman note to an order
export async function addSalesmanNote(
  orderId: string,
  note: string
): Promise<void> {
  if (!db) return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { salesmanNotes: note });
  } catch (error) {
    console.error('Error adding salesman note:', error);
    throw error;
  }
}
