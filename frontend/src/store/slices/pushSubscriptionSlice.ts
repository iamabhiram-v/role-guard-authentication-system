import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface PushSubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  isToggling: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: PushSubscriptionState = {
  isSubscribed: false,
  isLoading: false,
  isToggling: false,
  error: null,
  successMessage: null,
};

export const fetchPushStatus = createAsyncThunk(
  'pushSubscription/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: { isSubscribed: boolean } }>('/push-subscriptions/status');
      return res.data.data.isSubscribed;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load push status');
    }
  }
);

// Since we're not doing real browser push delivery (spec only requires the
// structure), this stores a lightweight placeholder subscription record
// rather than requesting real browser Notification permission + VAPID keys.
//
// Enabling push also unmutes all other notification channels (email +
// in-app) via /notification-mute — this toggle acts as the account-wide
// master switch the UI presents it as, not just a browser-push stub.
export const enablePush = createAsyncThunk(
  'pushSubscription/enable',
  async (_, { rejectWithValue }) => {
    try {
      const endpoint = `local-${crypto.randomUUID()}`;
      await apiClient.post('/push-subscriptions/subscribe', {
        endpoint,
        keys: { p256dh: 'placeholder', auth: 'placeholder' },
      });
      await apiClient.put('/notification-mute', { muted: false });
      return true;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to enable push notifications');
    }
  }
);

// Disabling push also mutes all other notification channels (email +
// in-app) via /notification-mute. The OTP login-code email is never
// affected by this — it bypasses the preference system entirely since
// it's the authentication mechanism itself.
export const disablePush = createAsyncThunk(
  'pushSubscription/disable',
  async (_, { rejectWithValue }) => {
    try {
      // Unsubscribe requires the exact endpoint used to subscribe; since this is
      // structure-only, we re-fetch subscriptions and remove all of this user's.
      const res = await apiClient.get<{ data: { subscriptions: { endpoint: string }[] } }>('/push-subscriptions/status');
      for (const sub of res.data.data.subscriptions) {
        await apiClient.post('/push-subscriptions/unsubscribe', { endpoint: sub.endpoint });
      }
      await apiClient.put('/notification-mute', { muted: true });
      return false;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to disable push notifications');
    }
  }
);

const pushSubscriptionSlice = createSlice({
  name: 'pushSubscription',
  initialState,
  reducers: {
    clearPushMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPushStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPushStatus.fulfilled, (state, action: PayloadAction<boolean>) => {
        state.isLoading = false;
        state.isSubscribed = action.payload;
      })
      .addCase(fetchPushStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(enablePush.pending, (state) => {
        state.isToggling = true;
      })
      .addCase(enablePush.fulfilled, (state) => {
        state.isToggling = false;
        state.isSubscribed = true;
        state.successMessage = 'Push notifications enabled on this device';
      })
      .addCase(enablePush.rejected, (state, action) => {
        state.isToggling = false;
        state.error = action.payload as string;
      })
      .addCase(disablePush.pending, (state) => {
        state.isToggling = true;
      })
      .addCase(disablePush.fulfilled, (state) => {
        state.isToggling = false;
        state.isSubscribed = false;
        state.successMessage = 'Push notifications disabled on this device';
      })
      .addCase(disablePush.rejected, (state, action) => {
        state.isToggling = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPushMessages } = pushSubscriptionSlice.actions;
export default pushSubscriptionSlice.reducer;