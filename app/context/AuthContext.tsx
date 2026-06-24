'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signOut, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUserProfile, updateUserProfileStatus, getUserProfile, UserProfile, db } from '../lib/db';

export type UserStatus = 'pending' | 'approved' | 'rejected' | null;

interface AuthContextType {
  user: User | null;
  profileStatus: UserStatus;
  profileName: string;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<UserStatus>(null);
  const [profileName, setProfileName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Sync profile details when auth state transitions
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        // Query or initialize user profile in Firestore
        const profile = await getOrCreateUserProfile(
          currentUser.uid,
          currentUser.email || '',
          currentUser.displayName || ''
        );
        if (profile) {
          setUserProfile(profile);
          setProfileStatus(profile.status);
          setProfileName(profile.name);
        } else {
          setUserProfile(null);
          setProfileStatus('pending');
        }
      } else {
        setUserProfile(null);
        setProfileStatus(null);
        setProfileName('');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (auth?.currentUser) {
      const profile = await getUserProfile(auth.currentUser.uid);
      if (profile) {
        setUserProfile(profile);
        setProfileStatus(profile.status);
        setProfileName(profile.name);
      }
    }
  };

  const signInWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        // Write the default pending profile in Firestore, handling race conditions gracefully
        const profile = await getOrCreateUserProfile(
          userCredential.user.uid,
          email,
          name || email.split('@')[0]
        );
        if (profile && name && profile.name !== name && db) {
          const userRef = doc(db, 'users', userCredential.user.uid);
          await updateDoc(userRef, { name });
          profile.name = name;
          setUserProfile(profile);
          setProfileName(name);
        }
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (!auth) {
      throw new Error("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    setLoading(true);
    try {
      await signOut(auth);
      setUserProfile(null);
      setProfileStatus(null);
      setProfileName('');
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profileStatus, 
      profileName, 
      userProfile,
      loading, 
      signInWithGoogle, 
      signInWithEmail, 
      signUpWithEmail, 
      sendPasswordReset, 
      refreshProfile,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
