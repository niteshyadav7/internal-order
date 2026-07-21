import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  subscribeToUserProfiles, 
  getProfileFields, 
  updateUserProfileStatus, 
  deleteUserProfile, 
  updateUserProfile, 
  createProfileField, 
  deleteProfileField, 
  updateProfileField, 
  UserProfile, 
  ProfileField 
} from '../lib/db';
import { AppDispatch } from './store';

interface AdminState {
  usersList: UserProfile[];
  fieldsList: ProfileField[];
  loadingUsers: boolean;
  loadingFields: boolean;
}

const initialState: AdminState = {
  usersList: [],
  fieldsList: [],
  loadingUsers: false,
  loadingFields: false,
};

export const fetchProfileFieldsThunk = createAsyncThunk(
  'admin/fetchProfileFields',
  async (_, { rejectWithValue }) => {
    try {
      return await getProfileFields();
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch profile fields");
    }
  }
);

export const updateUserProfileStatusThunk = createAsyncThunk(
  'admin/updateUserProfileStatus',
  async ({ uid, status }: { uid: string; status: 'approved' | 'rejected' | 'pending' }, { rejectWithValue }) => {
    try {
      await updateUserProfileStatus(uid, status);
      return { uid, status };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update profile status");
    }
  }
);

export const deleteUserProfileThunk = createAsyncThunk(
  'admin/deleteUserProfile',
  async (uid: string, { rejectWithValue }) => {
    try {
      await deleteUserProfile(uid);
      return uid;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete user profile");
    }
  }
);

export const updateUserProfileThunk = createAsyncThunk(
  'admin/updateUserProfile',
  async ({ uid, updates }: { uid: string; updates: Partial<UserProfile> }, { rejectWithValue }) => {
    try {
      await updateUserProfile(uid, updates);
      return { uid, updates };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update user profile");
    }
  }
);

export const createProfileFieldThunk = createAsyncThunk(
  'admin/createProfileField',
  async (field: Omit<ProfileField, 'id' | 'createdAt'>, { rejectWithValue }) => {
    try {
      const created = await createProfileField(field);
      if (!created) {
        throw new Error("Failed to create profile field");
      }
      return created;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to create profile field");
    }
  }
);

export const deleteProfileFieldThunk = createAsyncThunk(
  'admin/deleteProfileField',
  async (fieldId: string, { rejectWithValue }) => {
    try {
      await deleteProfileField(fieldId);
      return fieldId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to delete profile field");
    }
  }
);

export const updateProfileFieldThunk = createAsyncThunk(
  'admin/updateProfileField',
  async ({ fieldId, updates }: { fieldId: string; updates: Partial<Omit<ProfileField, 'id' | 'createdAt'>> }, { rejectWithValue }) => {
    try {
      await updateProfileField(fieldId, updates);
      return { fieldId, updates };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update profile field");
    }
  }
);

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setUsersList: (state, action: PayloadAction<UserProfile[]>) => {
      state.usersList = action.payload;
      state.loadingUsers = false;
    },
    setLoadingUsers: (state, action: PayloadAction<boolean>) => {
      state.loadingUsers = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile Fields
      .addCase(fetchProfileFieldsThunk.pending, (state) => {
        state.loadingFields = true;
      })
      .addCase(fetchProfileFieldsThunk.fulfilled, (state, action) => {
        state.fieldsList = action.payload;
        state.loadingFields = false;
      })
      .addCase(fetchProfileFieldsThunk.rejected, (state) => {
        state.loadingFields = false;
      })
      // Create Field
      .addCase(createProfileFieldThunk.fulfilled, (state, action) => {
        state.fieldsList = [...state.fieldsList, action.payload].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      })
      // Delete Field
      .addCase(deleteProfileFieldThunk.fulfilled, (state, action) => {
        state.fieldsList = state.fieldsList.filter(f => f.id !== action.payload);
      })
      // Update Field
      .addCase(updateProfileFieldThunk.fulfilled, (state, action) => {
        state.fieldsList = state.fieldsList.map(f => 
          f.id === action.payload.fieldId ? { ...f, ...action.payload.updates } : f
        );
      });
  }
});

export const { setUsersList, setLoadingUsers } = adminSlice.actions;

// Real-time user profiles subscription thunk
export const subscribeToUsersAction = () => (dispatch: AppDispatch) => {
  dispatch(setLoadingUsers(true));
  const unsubscribe = subscribeToUserProfiles((users) => {
    dispatch(setUsersList(users));
  });
  return unsubscribe;
};
