import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

interface PaymentState {
  order: RazorpayOrder | null;
  isCreatingOrder: boolean;
  isVerifying: boolean;
  verified: boolean;
  paymentId: string | null;
  error: string | null;
}

const initialState: PaymentState = {
  order: null,
  isCreatingOrder: false,
  isVerifying: false,
  verified: false,
  paymentId: null,
  error: null,
};

export const createOrder = createAsyncThunk(
  'payment/createOrder',
  async (payload: { amountInPaise: number; receipt: string; notes?: Record<string, string> }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<{ data: RazorpayOrder }>('/payments/orders', payload);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create order');
    }
  }
);

export const verifyPayment = createAsyncThunk(
  'payment/verify',
  async (
    payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post<{ data: { verified: boolean; paymentId: string } }>('/payments/verify', payload);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Payment verification failed');
    }
  }
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    resetPayment(state) {
      state.order = null;
      state.verified = false;
      state.paymentId = null;
      state.error = null;
    },
    clearPaymentError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.isCreatingOrder = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action: PayloadAction<RazorpayOrder>) => {
        state.isCreatingOrder = false;
        state.order = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isCreatingOrder = false;
        state.error = action.payload as string;
      })
      .addCase(verifyPayment.pending, (state) => {
        state.isVerifying = true;
        state.error = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.isVerifying = false;
        state.verified = action.payload.verified;
        state.paymentId = action.payload.paymentId;
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.isVerifying = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetPayment, clearPaymentError } = paymentSlice.actions;
export default paymentSlice.reducer;
