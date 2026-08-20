import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface Profile {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  phone?: string;
  role: string;
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
  updated_at: string;
  two_fa_enabled?: boolean;
}

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  successMessage: string | null;
}

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  successMessage: null,
};

export const fetchProfile = createAsyncThunk(
  'profile/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: Profile }>('/profile');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load profile');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'profile/update',
  async (data: Partial<Profile>, { rejectWithValue }) => {
    try {
      const res = await apiClient.put<{ data: Profile }>('/profile', data);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update profile');
    }
  }
);

export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async (
    data: { currentPassword: string; newPassword: string; confirmPassword: string },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.put<{ message: string }>('/profile/password', data);
      return res.data.message;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to change password');
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'profile/delete',
  async (data: { password: string; confirmation: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.delete<{ message: string }>('/profile', { data });
      return res.data.message;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete account');
    }
  }
);

export const toggle2FA = createAsyncThunk(
  'profile/toggle2FA',
  async (enabled: boolean, { rejectWithValue }) => {
    try {
      const res = await apiClient.patch<{ data: Profile }>('/profile/2fa', { enabled });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update 2FA setting');
    }
  }
);

export const uploadAvatar = createAsyncThunk(
  'profile/uploadAvatar',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post<{ data: { avatarUrl: string; profile: Profile } }>(
        '/upload/avatar',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data.data.profile;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to upload photo');
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.isLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateProfile.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.isUpdating = false;
        // Merge instead of replace — protects against any future endpoint
        // that returns a partial profile object from silently wiping fields.
        state.profile = state.profile ? { ...state.profile, ...action.payload } : action.payload;
        state.successMessage = 'Profile updated successfully';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(changePassword.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.successMessage = action.payload as string;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(deleteAccount.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(uploadAvatar.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.isUpdating = false;
        state.profile = state.profile ? { ...state.profile, ...action.payload } : action.payload;
        state.successMessage = 'Profile photo updated';
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      .addCase(toggle2FA.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(toggle2FA.fulfilled, (state, action: PayloadAction<Profile>) => {
        state.isUpdating = false;
        state.profile = state.profile ? { ...state.profile, ...action.payload } : action.payload;
        state.successMessage = action.payload.two_fa_enabled
          ? 'Two-factor authentication enabled'
          : 'Two-factor authentication disabled';
      })
      .addCase(toggle2FA.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearProfileError, clearSuccessMessage } = profileSlice.actions;
export default profileSlice.reducer;