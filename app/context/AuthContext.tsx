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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const lastUid = localStorage.getItem('auth_last_logged_in_uid');
        if (lastUid) {
          const cached = localStorage.getItem(`auth_profile_${lastUid}`);
          return cached ? JSON.parse(cached) : null;
        }
      } catch (e) {}
    }
    return null;
  });
  const [profileStatus, setProfileStatus] = useState<UserStatus>(() => {
    if (typeof window !== 'undefined') {
      try {
        const lastUid = localStorage.getItem('auth_last_logged_in_uid');
        if (lastUid) {
          const cached = localStorage.getItem(`auth_profile_${lastUid}`);
          return cached ? JSON.parse(cached)?.status : null;
        }
      } catch (e) {}
    }
    return null;
  });
  const [profileName, setProfileName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const lastUid = localStorage.getItem('auth_last_logged_in_uid');
        if (lastUid) {
          const cached = localStorage.getItem(`auth_profile_${lastUid}`);
          return cached ? JSON.parse(cached)?.name : '';
        }
      } catch (e) {}
    }
    return '';
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const lastUid = localStorage.getItem('auth_last_logged_in_uid');
        if (lastUid) {
          const cached = localStorage.getItem(`auth_profile_${lastUid}`);
          return !cached;
        }
        return false; // If no user was logged in, they are a guest - skip loader!
      } catch (e) {
        return true;
      }
    }
    return true;
  });

  // Sync profile details when auth state transitions
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('auth_last_logged_in_uid', currentUser.uid);
          } catch (e) {}
        }
        // Try reading cached profile from localStorage first
        const cacheKey = `auth_profile_${currentUser.uid}`;
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
        let hasCache = false;
        
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setUserProfile(parsed);
            setProfileStatus(parsed.status);
            setProfileName(parsed.name);
            setLoading(false); // Hide the loader immediately!
            hasCache = true;
          } catch (e) {
            console.error('Error parsing cached user profile:', e);
          }
        }
        
        if (!hasCache) {
          setLoading(true);
        }

        // Fetch fresh profile in background
        try {
          const profile = await getOrCreateUserProfile(
            currentUser.uid,
            currentUser.email || '',
            currentUser.displayName || ''
          );
          if (profile) {
            setUserProfile(profile);
            setProfileStatus(profile.status);
            setProfileName(profile.name);
            if (typeof window !== 'undefined') {
              try {
                localStorage.setItem(cacheKey, JSON.stringify(profile));
              } catch (e) {}
            }
          } else {
            setUserProfile(null);
            setProfileStatus('pending');
          }
        } catch (err) {
          console.error("Error retrieving fresh user profile:", err);
        } finally {
          setLoading(false);
        }
      } else {
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('auth_last_logged_in_uid');
          } catch (e) {}
        }
        setUserProfile(null);
        setProfileStatus(null);
        setProfileName('');
        setLoading(false);
      }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(`auth_profile_${auth.currentUser.uid}`, JSON.stringify(profile));
        }
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
        if (profile) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(`auth_profile_${userCredential.user.uid}`, JSON.stringify(profile));
          }
          if (name && profile.name !== name && db) {
            const userRef = doc(db, 'users', userCredential.user.uid);
            await updateDoc(userRef, { name });
            profile.name = name;
            setUserProfile(profile);
            setProfileName(name);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`auth_profile_${userCredential.user.uid}`, JSON.stringify(profile));
            }
          }
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
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('auth_last_logged_in_uid');
          if (user) {
            localStorage.removeItem(`auth_profile_${user.uid}`);
          }
        } catch (e) {}
      }
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
