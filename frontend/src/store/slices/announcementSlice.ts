import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

interface AnnouncementState {
  active: Announcement | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: AnnouncementState = {
  active: null,
  isLoading: false,
  isSending: false,
  error: null,
  successMessage: null,
};

export const fetchActiveAnnouncement = createAsyncThunk(
  'announcements/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Announcement | null }>('/announcements/active');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load announcement');
    }
  }
);

export const dismissAnnouncement = createAsyncThunk(
  'announcements/dismiss',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.post(`/announcements/${id}/dismiss`);
      return id;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to dismiss');
    }
  }
);

export const sendBroadcast = createAsyncThunk(
  'announcements/send',
  async ({ title, message }: { title: string; message: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<{ data: Announcement }>('/announcements', { title, message });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to send broadcast');
    }
  }
);

const announcementSlice = createSlice({
  name: 'announcements',
  initialState,
  reducers: {
    clearAnnouncementMessages: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveAnnouncement.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchActiveAnnouncement.fulfilled, (state, action: PayloadAction<Announcement | null>) => {
        state.isLoading = false;
        state.active = action.payload;
      })
      .addCase(fetchActiveAnnouncement.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(dismissAnnouncement.fulfilled, (state) => {
        state.active = null;
      })
      .addCase(sendBroadcast.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendBroadcast.fulfilled, (state, action: PayloadAction<Announcement>) => {
        state.isSending = false;
        state.successMessage = 'Broadcast sent to all users';
      })
      .addCase(sendBroadcast.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAnnouncementMessages } = announcementSlice.actions;
export default announcementSlice.reducer;