'use client';

'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { 
  signInWithGoogleThunk, 
  signInWithEmailThunk, 
  signUpWithEmailThunk, 
  sendPasswordResetThunk, 
  refreshProfileThunk, 
  logoutThunk 
} from '../store/authSlice';

// Stub provider for backward compatibility
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profileStatus, profileName, userProfile, loading } = useSelector((state: RootState) => state.auth);

  return {
    user,
    profileStatus,
    profileName,
    userProfile,
    loading,
    signInWithGoogle: async () => {
      await dispatch(signInWithGoogleThunk()).unwrap();
    },
    signInWithEmail: async (email: string, password: string) => {
      await dispatch(signInWithEmailThunk({ email, password })).unwrap();
    },
    signUpWithEmail: async (email: string, password: string, name?: string) => {
      await dispatch(signUpWithEmailThunk({ email, password, name })).unwrap();
    },
    sendPasswordReset: async (email: string) => {
      await dispatch(sendPasswordResetThunk(email)).unwrap();
    },
    refreshProfile: async () => {
      await dispatch(refreshProfileThunk()).unwrap();
    },
    logout: async () => {
      await dispatch(logoutThunk()).unwrap();
    }
  };
}
