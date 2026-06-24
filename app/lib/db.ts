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
  onSnapshot
} from 'firebase/firestore';
import { app } from './firebase';

export const db = app ? getFirestore(app) : null;

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  customDetails?: Record<string, string>;
  registrationCompleted?: boolean;
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

    const newProfile: UserProfile = {
      uid,
      email,
      name: name || email.split('@')[0],
      status: 'pending', // default status for any new signups
      createdAt: new Date().toISOString(),
      registrationCompleted: false
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
}

// Order Item Interface
export interface OrderItem {
  productId: string;
  nameEn: string;
  nameHi: string;
  price: number;
  unit: string;
  quantity: number;
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
  trackingNumber?: string;
  adminNotes?: string;
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

// Add a new product (Admin)
export async function createProduct(product: Omit<Product, 'id' | 'createdAt'>): Promise<Product | null> {
  if (!db) return null;
  try {
    const productsRef = collection(db, 'products');
    const newProduct = {
      inStock: true,
      ...product,
      createdAt: new Date().toISOString()
    };
    const docRef = await addDoc(productsRef, newProduct);
    return { id: docRef.id, ...newProduct };
  } catch (error) {
    console.error("Error in createProduct:", error);
    return null;
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
    await updateDoc(productRef, details);
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
    const newOrder = {
      ...order,
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };
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
