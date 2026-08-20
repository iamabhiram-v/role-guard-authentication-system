import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  pagination: Pagination;
  filter: 'all' | 'unread';
  isLoading: boolean;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
  filter: 'all',
  isLoading: false,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async () => {
    const res = await apiClient.get<{ data: Notification[] }>('/notifications');
    return res.data.data;
  }
);

// Separate thunk for the full Notification Center page — supports pagination + filter
export const fetchNotificationHistory = createAsyncThunk(
  'notifications/fetchHistory',
  async (params: { filter?: 'all' | 'unread'; page?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.filter && params.filter !== 'all') query.set('filter', params.filter);
    if (params.page) query.set('page', String(params.page));
    const qs = query.toString() ? `?${query.toString()}` : '';

    const res = await apiClient.get<{ data: Notification[]; pagination: Pagination }>(`/notifications${qs}`);
    return { items: res.data.data, pagination: res.data.pagination, filter: params.filter || 'all' };
  }
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    const res = await apiClient.get<{ data: { count: number } }>('/notifications/unread-count');
    return res.data.data.count;
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id: string) => {
    await apiClient.patch(`/notifications/${id}/read`);
    return id;
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await apiClient.patch('/notifications/read-all');
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (id: string) => {
    await apiClient.delete(`/notifications/${id}`);
    return id;
  }
);

export const bulkDeleteNotifications = createAsyncThunk(
  'notifications/bulkDeleteNotifications',
  async (ids: string[]) => {
    await apiClient.post('/notifications/bulk-delete', { ids });
    return ids;
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Changing the filter always resets to page 1 — a stale page number from
    // the previous filter would otherwise be reused on the next fetch and can
    // land you on an out-of-range page.
    setNotificationFilter: (state, action: PayloadAction<'all' | 'unread'>) => {
      state.filter = action.payload;
      state.pagination.page = 1;
    },
    setNotificationPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<Notification[]>) => {
        state.items = action.payload;
      })
      .addCase(fetchNotificationHistory.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNotificationHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.pagination = action.payload.pagination;
        state.filter = action.payload.filter;
      })
      .addCase(fetchNotificationHistory.rejected, (state) => {
        state.isLoading = false;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action: PayloadAction<number>) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAsRead.fulfilled, (state, action: PayloadAction<string>) => {
        const item = state.items.find((n) => n.id === action.payload);
        if (item && !item.is_read) {
          item.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.is_read = true; });
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action: PayloadAction<string>) => {
        const item = state.items.find((n) => n.id === action.payload);
        state.items = state.items.filter((n) => n.id !== action.payload);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        if (item && !item.is_read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(bulkDeleteNotifications.fulfilled, (state, action: PayloadAction<string[]>) => {
        const idSet = new Set(action.payload);
        const unreadRemoved = state.items.filter((n) => idSet.has(n.id) && !n.is_read).length;
        state.items = state.items.filter((n) => !idSet.has(n.id));
        state.pagination.total = Math.max(0, state.pagination.total - action.payload.length);
        state.unreadCount = Math.max(0, state.unreadCount - unreadRemoved);
      });
  },
});

export const { setNotificationFilter, setNotificationPage } = notificationSlice.actions;
export default notificationSlice.reducer;