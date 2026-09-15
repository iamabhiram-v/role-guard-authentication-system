import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface ChatMessage {
  id: string;
  workspace_id: string;
  sender_id: string;
  sender_email: string;
  sender_username: string;
  message: string;
  created_at: string;
}

interface MessagesState {
  // workspaceId -> messages, oldest first
  byWorkspace: Record<string, ChatMessage[]>;
  isLoading: boolean;
  error: string | null;
}

const initialState: MessagesState = {
  byWorkspace: {},
  isLoading: false,
  error: null,
};

// One-time load of recent history when the chat panel opens.
// New messages after that arrive live over the socket (see useSocket.ts).
export const fetchMessages = createAsyncThunk(
  'messages/fetchAll',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: ChatMessage[] }>(`/workspaces/${workspaceId}/messages`);
      return { workspaceId, messages: res.data.data };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load messages');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // Called from useSocket.ts when a 'new-message' event arrives.
    messageReceived: (state, action: PayloadAction<ChatMessage>) => {
      const msg = action.payload;
      const list = state.byWorkspace[msg.workspace_id] ?? [];
      // Guard against duplicates if the socket briefly reconnects/replays.
      if (list.some((m) => m.id === msg.id)) return;
      state.byWorkspace[msg.workspace_id] = [...list, msg];
    },
    clearMessagesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.byWorkspace[action.payload.workspaceId] = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { messageReceived, clearMessagesError } = messagesSlice.actions;
export default messagesSlice.reducer;