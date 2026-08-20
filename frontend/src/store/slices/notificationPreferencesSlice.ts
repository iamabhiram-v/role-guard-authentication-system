import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface Preference {
  category: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
}

interface PreferencesState {
  items: Preference[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: PreferencesState = {
  items: [],
  isLoading: false,
  isSaving: false,
  error: null,
  successMessage: null,
};

export const fetchPreferences = createAsyncThunk(
  'notificationPreferences/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Preference[] }>('/notification-preferences');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load preferences');
    }
  }
);

export const updatePreference = createAsyncThunk(
  'notificationPreferences/update',
  async (
    { category, updates }: { category: string; updates: { email_enabled?: boolean; in_app_enabled?: boolean } },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.patch<{ data: Preference }>(`/notification-preferences/${category}`, updates);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update preference');
    }
  }
);

const notificationPreferencesSlice = createSlice({
  name: 'notificationPreferences',
  initialState,
  reducers: {
    clearPreferencesMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPreferences.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchPreferences.fulfilled, (state, action: PayloadAction<Preference[]>) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchPreferences.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updatePreference.pending, (state) => {
        state.isSaving = true;
      })
      .addCase(updatePreference.fulfilled, (state, action: PayloadAction<Preference>) => {
        state.isSaving = false;
        const idx = state.items.findIndex((p) => p.category === action.payload.category);
        if (idx !== -1) state.items[idx] = action.payload;
        state.successMessage = 'Preference updated';
      })
      .addCase(updatePreference.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearPreferencesMessages } = notificationPreferencesSlice.actions;
export default notificationPreferencesSlice.reducer;