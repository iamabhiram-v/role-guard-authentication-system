import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TypingUser {
  userId: string;
  email: string;
  context: string | null;
}

interface ActivityEvent {
  userId: string;
  email: string;
  action: string;
  details: unknown;
  timestamp: string;
}

interface PresenceState {
  // workspaceId -> list of online userIds
  onlineByWorkspace: Record<string, string[]>;
  // workspaceId -> list of currently-typing users
  typingByWorkspace: Record<string, TypingUser[]>;
  // workspaceId -> recent activity events (capped)
  activityByWorkspace: Record<string, ActivityEvent[]>;
  isConnected: boolean;
}

const initialState: PresenceState = {
  onlineByWorkspace: {},
  typingByWorkspace: {},
  activityByWorkspace: {},
  isConnected: false,
};

const MAX_ACTIVITY_EVENTS = 50;

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setPresence: (state, action: PayloadAction<{ workspaceId: string; onlineUserIds: string[] }>) => {
      state.onlineByWorkspace[action.payload.workspaceId] = action.payload.onlineUserIds;
    },
    setTyping: (
      state,
      action: PayloadAction<{
        workspaceId: string;
        userId: string;
        email: string;
        context: string | null;
        isTyping: boolean;
      }>
    ) => {
      const { workspaceId, userId, email, context, isTyping } = action.payload;
      const current = state.typingByWorkspace[workspaceId] || [];

      if (isTyping) {
        const withoutUser = current.filter((u) => u.userId !== userId);
        state.typingByWorkspace[workspaceId] = [...withoutUser, { userId, email, context }];
      } else {
        state.typingByWorkspace[workspaceId] = current.filter((u) => u.userId !== userId);
      }
    },
    addActivityEvent: (
      state,
      action: PayloadAction<{ workspaceId: string; event: ActivityEvent }>
    ) => {
      const { workspaceId, event } = action.payload;
      const current = state.activityByWorkspace[workspaceId] || [];
      state.activityByWorkspace[workspaceId] = [event, ...current].slice(0, MAX_ACTIVITY_EVENTS);
    },
    clearWorkspacePresence: (state, action: PayloadAction<string>) => {
      delete state.onlineByWorkspace[action.payload];
      delete state.typingByWorkspace[action.payload];
      delete state.activityByWorkspace[action.payload];
    },
    resetPresence: () => initialState,
  },
});

export const {
  setConnected,
  setPresence,
  setTyping,
  addActivityEvent,
  clearWorkspacePresence,
  resetPresence,
} = presenceSlice.actions;

export default presenceSlice.reducer;