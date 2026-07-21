import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { 
  subscribeToOrders, 
  getOrders, 
  claimOrder, 
  completeOrder, 
  releaseOrder, 
  createOrder, 
  deleteOrder,
  updateOrder,
  Order,
  OrderItem
} from '../lib/db';
import { AppDispatch } from './store';

interface OrdersState {
  orders: Order[];
  userOrders: Order[];
  loadingOrders: boolean;
  loadingUserOrders: boolean;
  submittingOrder: boolean;
}

const initialState: OrdersState = {
  orders: [],
  userOrders: [],
  loadingOrders: false,
  loadingUserOrders: false,
  submittingOrder: false,
};

export const fetchUserOrdersThunk = createAsyncThunk(
  'orders/fetchUserOrders',
  async (userUid: string, { rejectWithValue }) => {
    try {
      const allOrders = await getOrders();
      return allOrders.filter(o => o.userUid === userUid);
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to fetch user orders");
    }
  }
);

export const claimOrderThunk = createAsyncThunk(
  'orders/claimOrder',
  async ({ orderId, salesmanUid, salesmanName }: { orderId: string; salesmanUid: string; salesmanName: string }, { rejectWithValue }) => {
    try {
      await claimOrder(orderId, salesmanUid, salesmanName);
      return { orderId, salesmanUid, salesmanName };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to claim order");
    }
  }
);

export const completeOrderThunk = createAsyncThunk(
  'orders/completeOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await completeOrder(orderId);
      return orderId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to complete order");
    }
  }
);

export const releaseOrderThunk = createAsyncThunk(
  'orders/releaseOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await releaseOrder(orderId);
      return orderId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to release order");
    }
  }
);

export const createOrderThunk = createAsyncThunk(
  'orders/createOrder',
  async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>, { rejectWithValue }) => {
    try {
      const created = await createOrder(orderData);
      if (!created) {
        throw new Error("Failed to create order");
      }
      return created;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to place order");
    }
  }
);

export const cancelOrderThunk = createAsyncThunk(
  'orders/cancelOrder',
  async (orderId: string, { rejectWithValue }) => {
    try {
      await deleteOrder(orderId);
      return orderId;
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to cancel order");
    }
  }
);

export const updateOrderThunk = createAsyncThunk(
  'orders/updateOrder',
  async ({ orderId, updatedItems }: { orderId: string; updatedItems: OrderItem[] }, { rejectWithValue }) => {
    try {
      await updateOrder(orderId, { items: updatedItems });
      return { orderId, updatedItems };
    } catch (err: any) {
      return rejectWithValue(err.message || "Failed to update order");
    }
  }
);

export const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload;
      state.loadingOrders = false;
    },
    setLoadingOrders: (state, action: PayloadAction<boolean>) => {
      state.loadingOrders = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch User Orders
      .addCase(fetchUserOrdersThunk.pending, (state) => {
        state.loadingUserOrders = true;
      })
      .addCase(fetchUserOrdersThunk.fulfilled, (state, action) => {
        state.userOrders = action.payload;
        state.loadingUserOrders = false;
      })
      .addCase(fetchUserOrdersThunk.rejected, (state) => {
        state.loadingUserOrders = false;
      })
      // Create Order
      .addCase(createOrderThunk.pending, (state) => {
        state.submittingOrder = true;
      })
      .addCase(createOrderThunk.fulfilled, (state, action) => {
        state.userOrders = [action.payload, ...state.userOrders];
        state.submittingOrder = false;
      })
      .addCase(createOrderThunk.rejected, (state) => {
        state.submittingOrder = false;
      })
      // Cancel Order
      .addCase(cancelOrderThunk.fulfilled, (state, action) => {
        state.userOrders = state.userOrders.filter(o => o.id !== action.payload);
      })
      // Update Order
      .addCase(updateOrderThunk.fulfilled, (state, action) => {
        state.userOrders = state.userOrders.map(o => 
          o.id === action.payload.orderId ? { ...o, items: action.payload.updatedItems } : o
        );
      });
  }
});

export const { setOrders, setLoadingOrders } = ordersSlice.actions;

// Real-time salesman orders subscription thunk
export const subscribeToOrdersAction = () => (dispatch: AppDispatch) => {
  dispatch(setLoadingOrders(true));
  const unsubscribe = subscribeToOrders((orders) => {
    dispatch(setOrders(orders));
  });
  return unsubscribe;
};
