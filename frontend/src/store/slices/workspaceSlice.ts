import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  role: WorkspaceRole;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
  email: string;
  username: string;
}

export interface Invite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  status: string;
  expires_at: string;
  created_at: string;
}

export interface PendingInvitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_description: string | null;
  role: 'admin' | 'member';
  status: string;
  expires_at: string;
  created_at: string;
}

export interface ActivityItem {
  type: 'invite' | 'member_joined' | 'workspace_updated';
  occurred_at: string;
  workspace_name: string;
  target: string | null;
  actor_name: string | null;
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: Member[];
  invites: Invite[];
  pendingInvitations: PendingInvitation[];
  recentActivity: ActivityItem[];
  isLoadingActivity: boolean;
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  members: [],
  invites: [],
  pendingInvitations: [],
  recentActivity: [],
  isLoadingActivity: false,
  isLoading: false,
  isMutating: false,
  error: null,
  successMessage: null,
};

const errMsg = (err: any, fallback: string) => err.response?.data?.message || fallback;

export const fetchWorkspaces = createAsyncThunk('workspace/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<{ data: Workspace[] }>('/workspaces');
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(errMsg(err, 'Failed to load workspaces'));
  }
});

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchOne',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Workspace }>(`/workspaces/${workspaceId}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load workspace'));
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/create',
  async (data: { name: string; description?: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<{ data: Workspace }>('/workspaces', data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to create workspace'));
    }
  }
);

export const updateWorkspace = createAsyncThunk(
  'workspace/update',
  async ({ workspaceId, data }: { workspaceId: string; data: { name?: string; description?: string } }, { rejectWithValue }) => {
    try {
      const res = await apiClient.put<{ data: Workspace }>(`/workspaces/${workspaceId}`, data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to update workspace'));
    }
  }
);

export const deleteWorkspace = createAsyncThunk(
  'workspace/delete',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}`);
      return workspaceId;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to delete workspace'));
    }
  }
);

export const leaveWorkspace = createAsyncThunk(
  'workspace/leave',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      await apiClient.post(`/workspaces/${workspaceId}/leave`);
      return workspaceId;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to leave workspace'));
    }
  }
);

export const transferOwnership = createAsyncThunk(
  'workspace/transferOwnership',
  async ({ workspaceId, newOwnerId }: { workspaceId: string; newOwnerId: string }, { rejectWithValue }) => {
    try {
      await apiClient.post(`/workspaces/${workspaceId}/transfer-ownership`, { newOwnerId });
      return { workspaceId };
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to transfer ownership'));
    }
  }
);

export const fetchMembers = createAsyncThunk(
  'workspace/fetchMembers',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Member[] }>(`/workspaces/${workspaceId}/members`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load members'));
    }
  }
);

export const updateMemberRole = createAsyncThunk(
  'workspace/updateMemberRole',
  async (
    { workspaceId, userId, role }: { workspaceId: string; userId: string; role: 'admin' | 'member' },
    { rejectWithValue }
  ) => {
    try {
      await apiClient.put(`/workspaces/${workspaceId}/members/${userId}/role`, { role });
      return { userId, role };
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to update member role'));
    }
  }
);

export const removeMember = createAsyncThunk(
  'workspace/removeMember',
  async ({ workspaceId, userId }: { workspaceId: string; userId: string }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
      return userId;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to remove member'));
    }
  }
);

export const fetchInvites = createAsyncThunk(
  'workspace/fetchInvites',
  async (workspaceId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Invite[] }>(`/workspaces/${workspaceId}/invites`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load invites'));
    }
  }
);

export const inviteMember = createAsyncThunk(
  'workspace/invite',
  async (
    { workspaceId, email, role }: { workspaceId: string; email: string; role: 'admin' | 'member' },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post<{ data: Invite }>(`/workspaces/${workspaceId}/members/invite`, { email, role });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to send invite'));
    }
  }
);

export const revokeInvite = createAsyncThunk(
  'workspace/revokeInvite',
  async ({ workspaceId, inviteId }: { workspaceId: string; inviteId: string }, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}/invites/${inviteId}`);
      return inviteId;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to revoke invite'));
    }
  }
);

export const fetchPendingInvitations = createAsyncThunk(
  'workspace/fetchPendingInvitations',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: PendingInvitation[] }>('/workspaces/invitations/pending');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load pending invitations'));
    }
  }
);

export const acceptInvite = createAsyncThunk(
  'workspace/acceptInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.post<{ data: { workspaceId: string } }>(`/workspaces/invitations/${inviteId}/accept`);
      return { inviteId, ...res.data.data };
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to accept invite'));
    }
  }
);

export const declineInvite = createAsyncThunk(
  'workspace/declineInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await apiClient.post(`/workspaces/invitations/${inviteId}/decline`);
      return inviteId;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to decline invite'));
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'workspace/fetchRecentActivity',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: ActivityItem[] }>('/workspaces/activity/recent');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load recent activity'));
    }
  }
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action: PayloadAction<Workspace | null>) => {
      state.currentWorkspace = action.payload;
    },
    clearWorkspaceError: (state) => {
      state.error = null;
    },
    clearWorkspaceSuccess: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch all
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action: PayloadAction<Workspace[]>) => {
        state.isLoading = false;
        state.workspaces = action.payload;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // fetch one
      .addCase(fetchWorkspace.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspace.fulfilled, (state, action: PayloadAction<Workspace>) => {
        state.isLoading = false;
        state.currentWorkspace = action.payload;
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // create
      .addCase(createWorkspace.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(createWorkspace.fulfilled, (state, action: PayloadAction<Workspace>) => {
        state.isMutating = false;
        state.workspaces.unshift(action.payload);
        state.successMessage = 'Workspace created successfully';
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })
      // update
      .addCase(updateWorkspace.fulfilled, (state, action: PayloadAction<Workspace>) => {
        state.successMessage = 'Workspace updated successfully';
        if (state.currentWorkspace?.id === action.payload.id) {
          state.currentWorkspace = { ...state.currentWorkspace, ...action.payload };
        }
        state.workspaces = state.workspaces.map((w) =>
          w.id === action.payload.id ? { ...w, ...action.payload } : w
        );
      })
      .addCase(updateWorkspace.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // delete
      .addCase(deleteWorkspace.fulfilled, (state, action: PayloadAction<string>) => {
        state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        if (state.currentWorkspace?.id === action.payload) state.currentWorkspace = null;
        state.successMessage = 'Workspace deleted';
      })
      .addCase(deleteWorkspace.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // leave
      .addCase(leaveWorkspace.fulfilled, (state, action: PayloadAction<string>) => {
        state.workspaces = state.workspaces.filter((w) => w.id !== action.payload);
        if (state.currentWorkspace?.id === action.payload) state.currentWorkspace = null;
        state.successMessage = 'You left the workspace';
      })
      .addCase(leaveWorkspace.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // members
      .addCase(fetchMembers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMembers.fulfilled, (state, action: PayloadAction<Member[]>) => {
        state.isLoading = false;
        state.members = action.payload;
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        state.members = state.members.map((m) =>
          m.user_id === action.payload.userId ? { ...m, role: action.payload.role } : m
        );
        state.successMessage = 'Member role updated';
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(removeMember.fulfilled, (state, action: PayloadAction<string>) => {
        state.members = state.members.filter((m) => m.user_id !== action.payload);
        state.successMessage = 'Member removed';
      })
      .addCase(removeMember.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // invites (admin side - sending)
      .addCase(fetchInvites.fulfilled, (state, action: PayloadAction<Invite[]>) => {
        state.invites = action.payload;
      })
      .addCase(inviteMember.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(inviteMember.fulfilled, (state, action: PayloadAction<Invite>) => {
        state.isMutating = false;
        state.invites.unshift(action.payload);
        state.successMessage = 'Invite sent successfully';
      })
      .addCase(inviteMember.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload as string;
      })
      .addCase(revokeInvite.fulfilled, (state, action: PayloadAction<string>) => {
        state.invites = state.invites.filter((i) => i.id !== action.payload);
        state.successMessage = 'Invite revoked';
      })
      .addCase(revokeInvite.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // pending invitations (receiving side)
      .addCase(fetchPendingInvitations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPendingInvitations.fulfilled, (state, action: PayloadAction<PendingInvitation[]>) => {
        state.isLoading = false;
        state.pendingInvitations = action.payload;
      })
      .addCase(fetchPendingInvitations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(acceptInvite.fulfilled, (state, action) => {
        state.pendingInvitations = state.pendingInvitations.filter((i) => i.id !== action.payload.inviteId);
        state.successMessage = 'Invite accepted — welcome to the workspace!';
      })
      .addCase(acceptInvite.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(declineInvite.fulfilled, (state, action: PayloadAction<string>) => {
        state.pendingInvitations = state.pendingInvitations.filter((i) => i.id !== action.payload);
        state.successMessage = 'Invite declined';
      })
      .addCase(declineInvite.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(transferOwnership.fulfilled, (state) => {
        state.successMessage = 'Ownership transferred';
      })
      .addCase(transferOwnership.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // recent activity
      .addCase(fetchRecentActivity.pending, (state) => {
        state.isLoadingActivity = true;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action: PayloadAction<ActivityItem[]>) => {
        state.isLoadingActivity = false;
        state.recentActivity = action.payload;
      })
      .addCase(fetchRecentActivity.rejected, (state) => {
        state.isLoadingActivity = false;
      });
  },
});

export const { setCurrentWorkspace, clearWorkspaceError, clearWorkspaceSuccess } = workspaceSlice.actions;
export default workspaceSlice.reducer;