import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  getProductsPaginated, 
  getGlobalSettings, 
  updateProduct, 
  createStockAlert, 
  Product, 
  GlobalSettings 
} from '../lib/db';
import { safeLocalStorage } from '../lib/safeStorage';

interface ProductsState {
  products: Product[];
  globalSettings: GlobalSettings | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  lastVisible: any; // Firestore DocumentSnapshot (ignored in serialization checks)
}

const initialState: ProductsState = {
  products: [],
  globalSettings: null,
  loading: false,
  loadingMore: false,
  hasMore: true,
  lastVisible: null,
};

export const fetchProductsThunk = createAsyncThunk(
  'products/fetchProducts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getProductsPaginated(null, 15);
      return {
        products: res.products,
        lastVisible: res.lastVisible,
        hasMore: res.hasMore
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch products");
    }
  }
);

export const fetchMoreProductsThunk = createAsyncThunk(
  'products/fetchMoreProducts',
  async (lastVisible: any, { rejectWithValue }) => {
    try {
      const res = await getProductsPaginated(lastVisible, 15);
      return {
        products: res.products,
        lastVisible: res.lastVisible,
        hasMore: res.hasMore
      };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load more products");
    }
  }
);

export const loadGlobalSettingsThunk = createAsyncThunk(
  'products/loadGlobalSettings',
  async (_, { rejectWithValue }) => {
    try {
      const settings = await getGlobalSettings();
      if (settings && typeof window !== 'undefined') {
        safeLocalStorage.setItem('cached_global_settings', JSON.stringify(settings));
      }
      return settings;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to load B2B settings");
    }
  }
);

export const flagProductOutOfStockThunk = createAsyncThunk(
  'products/flagProductOutOfStock',
  async ({ product, user, userProfile }: { product: Product; user: any; userProfile: any }, { rejectWithValue }) => {
    if (!product.id || !user) {
      return rejectWithValue("Invalid product or user context");
    }
    try {
      await updateProduct(product.id, { inStock: false });
      await createStockAlert({
        productId: product.id,
        productName: product.nameEn,
        reportedByUid: user.uid,
        reportedByName: userProfile?.name || 'Salesman',
        reason: 'Manually flagged as out of stock by salesman'
      });
      return product.id;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to flag product");
    }
  }
);

export const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setLocalCachedProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setLocalCachedSettings: (state, action: PayloadAction<GlobalSettings>) => {
      state.globalSettings = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(fetchProductsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        state.products = action.payload.products;
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
        state.loading = false;
      })
      .addCase(fetchProductsThunk.rejected, (state) => {
        state.loading = false;
      })
      // Fetch More Products
      .addCase(fetchMoreProductsThunk.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreProductsThunk.fulfilled, (state, action) => {
        state.products = [...state.products, ...action.payload.products];
        state.lastVisible = action.payload.lastVisible;
        state.hasMore = action.payload.hasMore;
        state.loadingMore = false;
      })
      .addCase(fetchMoreProductsThunk.rejected, (state) => {
        state.loadingMore = false;
      })
      // Global Settings
      .addCase(loadGlobalSettingsThunk.fulfilled, (state, action) => {
        state.globalSettings = action.payload;
      });
  }
});

export const { setLocalCachedProducts, setLocalCachedSettings } = productsSlice.actions;
