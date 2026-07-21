import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './authSlice';
import { productsSlice } from './productsSlice';
import { ordersSlice } from './ordersSlice';
import { adminSlice } from './adminSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    products: productsSlice.reducer,
    orders: ordersSlice.reducer,
    admin: adminSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'auth/setAuthState', 
          'products/fetchProducts/fulfilled', 
          'products/fetchMoreProducts/fulfilled',
          'products/fetchProducts/pending',
          'products/fetchMoreProducts/pending'
        ],
        ignoredPaths: ['products.lastVisible']
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
