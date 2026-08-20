import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  consecutiveFailures: number;
}

interface ServiceStatusState {
  services: ServiceHealth[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

const initialState: ServiceStatusState = {
  services: [],
  isLoading: false,
  error: null,
  lastFetchedAt: null,
};

export const fetchServiceStatus = createAsyncThunk(
  'serviceStatus/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: ServiceHealth[] }>('/service-status');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load service status');
    }
  }
);

const serviceStatusSlice = createSlice({
  name: 'serviceStatus',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchServiceStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchServiceStatus.fulfilled, (state, action: PayloadAction<ServiceHealth[]>) => {
        state.isLoading = false;
        state.services = action.payload;
        state.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchServiceStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default serviceStatusSlice.reducer;