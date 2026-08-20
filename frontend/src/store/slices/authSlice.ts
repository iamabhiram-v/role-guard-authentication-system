import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'manager' | 'user';
  isActive?: boolean;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastUpdated: number | null;
  pendingOtpEmail: string | null; // set once login() succeeds and an OTP has been sent
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
  lastUpdated: null,
  pendingOtpEmail: null,
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const register = createAsyncThunk(
  'auth/register',
  async (data: { email: string; username: string; password: string; confirmPassword: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, data, {
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

// Step 1: password check → triggers an OTP email/SMS, unless 2FA is disabled
// for the account, in which case this authenticates the session directly.
export const login = createAsyncThunk(
  'auth/login',
  async (data: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, data, {
        withCredentials: true,
      });
      return response.data.data; // { requiresOtp: true, email } OR { requiresOtp: false, user, tokens }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// Step 2: OTP check — only reached when requiresOtp was true
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (data: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, data, {
        withCredentials: true,
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    return null;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Logout failed');
  }
});

export const refreshToken = createAsyncThunk('auth/refreshToken', async (_, { rejectWithValue }) => {
  try {
    await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    return null;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
  }
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await axios.get(`${API_URL}/auth/me`, { withCredentials: true });
    return response.data.data;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPendingOtp: (state) => {
      state.pendingOtpEmail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.lastUpdated = Date.now();
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Login (step 1) — success means either "OTP sent" (requiresOtp: true)
    // or, if 2FA is off for this account, the login already fully
    // authenticated the session server-side (requiresOtp: false).
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.requiresOtp) {
          state.pendingOtpEmail = action.payload.email;
        } else {
          state.isInitialized = true;
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.pendingOtpEmail = null;
          state.lastUpdated = Date.now();
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Verify OTP (step 2) — only reached when login() returned requiresOtp: true
    builder
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.pendingOtpEmail = null;
        state.lastUpdated = Date.now();
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.lastUpdated = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.user = null;
        state.isAuthenticated = false;
      });

    builder.addCase(refreshToken.rejected, (state) => {
      state.isAuthenticated = false;
      state.user = null;
    });

    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastUpdated = Date.now();
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.isAuthenticated = false;
        state.user = null;
      });
  },
});

export const { clearError, clearPendingOtp } = authSlice.actions;
export default authSlice.reducer;