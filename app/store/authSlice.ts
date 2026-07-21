import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import {
  User as FirebaseUser,
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
import { getOrCreateUserProfile, getUserProfile, UserProfile, db } from '../lib/db';
import { safeLocalStorage } from '../lib/safeStorage';
import { AppDispatch } from './store';

export type UserStatus = 'pending' | 'approved' | 'rejected' | null;

export interface SerializableUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthState {
  user: SerializableUser | null;
  userProfile: UserProfile | null;
  profileStatus: UserStatus;
  profileName: string;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  userProfile: null,
  profileStatus: null,
  profileName: '',
  loading: true, // starts loading
};

export const signInWithGoogleThunk = createAsyncThunk(
  'auth/signInWithGoogle',
  async (_, { rejectWithValue }) => {
    if (!auth || !googleProvider) {
      return rejectWithValue("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      return rejectWithValue(error.message || "Google Sign-in failed");
    }
  }
);

export const signInWithEmailThunk = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email, password }: any, { rejectWithValue }) => {
    if (!auth) {
      return rejectWithValue("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      return rejectWithValue(error.message || "Sign-in failed");
    }
  }
);

export const signUpWithEmailThunk = createAsyncThunk(
  'auth/signUpWithEmail',
  async ({ email, password, name }: any, { rejectWithValue, dispatch }) => {
    if (!auth) {
      return rejectWithValue("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
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
          safeLocalStorage.setItem(`auth_profile_${userCredential.user.uid}`, JSON.stringify(profile));
          if (name && profile.name !== name && db) {
            const userRef = doc(db, 'users', userCredential.user.uid);
            await updateDoc(userRef, { name });
            profile.name = name;
            dispatch(setAuthState({
              user: {
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                displayName: name
              },
              userProfile: profile,
              profileStatus: profile.status,
              profileName: name
            }));
            safeLocalStorage.setItem(`auth_profile_${userCredential.user.uid}`, JSON.stringify(profile));
          }
        }
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Registration failed");
    }
  }
);

export const sendPasswordResetThunk = createAsyncThunk(
  'auth/sendPasswordReset',
  async (email: string, { rejectWithValue }) => {
    if (!auth) {
      return rejectWithValue("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      return rejectWithValue(error.message || "Password reset request failed");
    }
  }
);

export const refreshProfileThunk = createAsyncThunk(
  'auth/refreshProfile',
  async (_, { rejectWithValue, dispatch }) => {
    if (auth?.currentUser) {
      try {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile) {
          dispatch(setAuthState({
            user: {
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              displayName: auth.currentUser.displayName
            },
            userProfile: profile,
            profileStatus: profile.status,
            profileName: profile.name
          }));
          safeLocalStorage.setItem(`auth_profile_${auth.currentUser.uid}`, JSON.stringify(profile));
        }
      } catch (error: any) {
        return rejectWithValue(error.message || "Profile refresh failed");
      }
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue, dispatch }) => {
    if (!auth) {
      return rejectWithValue("Firebase Auth is not initialized. Please add your credentials in .env.local");
    }
    try {
      safeLocalStorage.removeItem('auth_last_logged_in_uid');
      const currentUser = auth.currentUser;
      if (currentUser) {
        safeLocalStorage.removeItem(`auth_profile_${currentUser.uid}`);
      }
      await signOut(auth);
      dispatch(clearAuth());
    } catch (error: any) {
      return rejectWithValue(error.message || "Logout failed");
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthState: (state, action: PayloadAction<{
      user: SerializableUser | null;
      userProfile: UserProfile | null;
      profileStatus: UserStatus;
      profileName: string;
    }>) => {
      state.user = action.payload.user;
      state.userProfile = action.payload.userProfile;
      state.profileStatus = action.payload.profileStatus;
      state.profileName = action.payload.profileName;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.userProfile = null;
      state.profileStatus = null;
      state.profileName = '';
      state.loading = false;
    }
  }
});

export const { setAuthState, setLoading, clearAuth } = authSlice.actions;

// Authentication lifecycle initialization thunk
export const initAuth = () => (dispatch: AppDispatch) => {
  // 1. Initialize from cache on client-side mount to prevent SSR hydration mismatch
  const initializeFromCache = () => {
    try {
      const lastUid = safeLocalStorage.getItem('auth_last_logged_in_uid');
      if (lastUid) {
        const cached = safeLocalStorage.getItem(`auth_profile_${lastUid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          dispatch(setAuthState({
            user: { uid: lastUid, email: parsed.email, displayName: parsed.name },
            userProfile: parsed,
            profileStatus: parsed.status,
            profileName: parsed.name,
          }));
          dispatch(setLoading(false)); // Hide the loader immediately
          return true;
        }
      }
    } catch (e) {
      console.error('Error initializing Auth from cache:', e);
    }
    return false;
  };

  const hasCache = initializeFromCache();
  if (!hasCache) {
    // If no cached user record, skip loading immediately
    const lastUid = safeLocalStorage.getItem('auth_last_logged_in_uid');
    if (!lastUid) {
      dispatch(setLoading(false));
    }
  }

  if (!auth) {
    dispatch(setLoading(false));
    return () => { };
  }

  // 2. Set up safety timeout to prevent infinite "Verifying session..." UI hang
  let isDone = false;
  const safetyTimeout = setTimeout(() => {
    if (!isDone) {
      console.warn("Redux Auth state ready safety timeout reached. Forcing loading to false.");
      dispatch(setLoading(false));
      isDone = true;
    }
  }, 6000);

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      safeLocalStorage.setItem('auth_last_logged_in_uid', currentUser.uid);
      const serializableUser: SerializableUser = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
      };

      const cacheKey = `auth_profile_${currentUser.uid}`;
      const cached = safeLocalStorage.getItem(cacheKey);
      let userProfile = null;
      let profileStatus: UserStatus = null;
      let profileName = '';

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          userProfile = parsed;
          profileStatus = parsed.status;
          profileName = parsed.name;
          dispatch(setAuthState({
            user: serializableUser,
            userProfile,
            profileStatus,
            profileName,
          }));
          if (!isDone) {
            dispatch(setLoading(false));
          }
        } catch (e) {
          console.error('Error parsing cached user profile:', e);
        }
      }

      if (!cached && !isDone) {
        dispatch(setLoading(true));
      }

      try {
        const profile = await getOrCreateUserProfile(
          currentUser.uid,
          currentUser.email || '',
          currentUser.displayName || ''
        );
        if (profile) {
          dispatch(setAuthState({
            user: serializableUser,
            userProfile: profile,
            profileStatus: profile.status,
            profileName: profile.name,
          }));
          safeLocalStorage.setItem(cacheKey, JSON.stringify(profile));
        } else {
          dispatch(setAuthState({
            user: serializableUser,
            userProfile: null,
            profileStatus: 'pending',
            profileName: '',
          }));
        }
      } catch (err) {
        console.error("Error retrieving fresh user profile:", err);
      } finally {
        if (!isDone) {
          clearTimeout(safetyTimeout);
          dispatch(setLoading(false));
          isDone = true;
        }
      }
    } else {
      safeLocalStorage.removeItem('auth_last_logged_in_uid');
      dispatch(clearAuth());
      if (!isDone) {
        clearTimeout(safetyTimeout);
        dispatch(setLoading(false));
        isDone = true;
      }
    }
  });

  return () => {
    clearTimeout(safetyTimeout);
    unsubscribe();
  };
};
