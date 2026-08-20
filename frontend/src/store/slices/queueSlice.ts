import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

interface Job {
  id: string;
  type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error: string | null;
  payload?: Record<string, any>;
  created_at: string;
  started_at?: string | null;
  completed_at: string | null;
  is_held?: boolean;
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface ThroughputPoint {
  hour: string;
  completed: number;
  failed: number;
}

interface LatencyStats {
  p50: number | null;
  p95: number | null;
  avg: number | null;
  sampleSize: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface JobFilters {
  status?: string;
  type?: string;
  page?: number;
}

interface QueueState {
  jobs: Job[];
  stats: QueueStats;
  throughput: ThroughputPoint[];
  latency: LatencyStats;
  workerLastPollAt: string | null;
  isPaused: boolean;
  isTogglingPause: boolean;
  pagination: Pagination;
  filters: JobFilters;
  isLoading: boolean;
  hasLoadedOnce: boolean;
  lastUpdated: string | null;
  error: string | null;
}

const initialState: QueueState = {
  jobs: [],
  stats: { pending: 0, processing: 0, completed: 0, failed: 0 },
  throughput: [],
  latency: { p50: null, p95: null, avg: null, sampleSize: 0 },
  workerLastPollAt: null,
  isPaused: false,
  isTogglingPause: false,
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
  filters: {},
  isLoading: false,
  hasLoadedOnce: false,
  lastUpdated: null,
  error: null,
};

export const fetchJobs = createAsyncThunk(
  'queue/fetchJobs',
  async (filters: JobFilters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.type) params.set('type', filters.type);
      if (filters.page) params.set('page', String(filters.page));

      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiClient.get<{ data: Job[]; pagination: Pagination }>(`/queue/jobs${query}`);
      return { jobs: res.data.data, pagination: res.data.pagination, filters };
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to load jobs');
    }
  }
);

export const fetchStats = createAsyncThunk('queue/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<{ data: QueueStats }>('/queue/stats');
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load stats');
  }
});

export const fetchThroughput = createAsyncThunk('queue/fetchThroughput', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<{ data: ThroughputPoint[] }>('/queue/throughput');
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load throughput');
  }
});

export const fetchWorkerHealth = createAsyncThunk('queue/fetchWorkerHealth', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<{ data: { lastPollAt: string | null; isPaused: boolean; pausedAt: string | null } }>('/queue/health');
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load worker health');
  }
});

export const pauseQueue = createAsyncThunk('queue/pauseQueue', async (_, { rejectWithValue }) => {
  try {
    await apiClient.post('/queue/pause');
    return true;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to pause queue');
  }
});

export const resumeQueue = createAsyncThunk('queue/resumeQueue', async (_, { rejectWithValue }) => {
  try {
    await apiClient.post('/queue/resume');
    return true;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to resume queue');
  }
});

export const fetchLatencyStats = createAsyncThunk('queue/fetchLatencyStats', async (_, { rejectWithValue }) => {
  try {
    const res = await apiClient.get<{ data: LatencyStats }>('/queue/latency');
    return res.data.data;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load latency stats');
  }
});

export const retryJob = createAsyncThunk('queue/retryJob', async (jobId: string, { rejectWithValue }) => {
  try {
    await apiClient.post(`/queue/jobs/${jobId}/retry`);
    return jobId;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to retry job');
  }
});

export const holdJob = createAsyncThunk('queue/holdJob', async (jobId: string, { rejectWithValue }) => {
  try {
    await apiClient.post(`/queue/jobs/${jobId}/hold`);
    return jobId;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to hold job');
  }
});

export const releaseJob = createAsyncThunk('queue/releaseJob', async (jobId: string, { rejectWithValue }) => {
  try {
    await apiClient.post(`/queue/jobs/${jobId}/release`);
    return jobId;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to release job');
  }
});

export const retryJobs = createAsyncThunk('queue/retryJobs', async (jobIds: string[]) => {
  const results = await Promise.allSettled(jobIds.map((id) => apiClient.post(`/queue/jobs/${id}/retry`)));
  return { succeeded: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length };
});

export const createJob = createAsyncThunk(
  'queue/createJob',
  async (
    input:
      | { type: 'email'; payload: { to: string; subject: string; body: string } }
      | { type: 'notification'; payload: { userId: string; title: string; message: string } },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiClient.post<{ data: Job }>('/queue/jobs', input);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create job');
    }
  }
);

const queueSlice = createSlice({
  name: 'queue',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<JobFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        if (!state.hasLoadedOnce) state.isLoading = true;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.hasLoadedOnce = true;
        state.jobs = action.payload.jobs;
        state.pagination = action.payload.pagination;
        state.filters = action.payload.filters;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.hasLoadedOnce = true;
        state.error = action.payload as string;
      })
      .addCase(fetchStats.fulfilled, (state, action: PayloadAction<QueueStats>) => {
        state.stats = action.payload;
      })
      .addCase(fetchThroughput.fulfilled, (state, action: PayloadAction<ThroughputPoint[]>) => {
        state.throughput = action.payload;
      })
      .addCase(fetchWorkerHealth.fulfilled, (state, action) => {
        state.workerLastPollAt = action.payload.lastPollAt;
        state.isPaused = action.payload.isPaused;
      })
      .addCase(fetchLatencyStats.fulfilled, (state, action: PayloadAction<LatencyStats>) => {
        state.latency = action.payload;
      })
      .addCase(pauseQueue.pending, (state) => {
        state.isTogglingPause = true;
      })
      .addCase(pauseQueue.fulfilled, (state) => {
        state.isTogglingPause = false;
        state.isPaused = true;
      })
      .addCase(pauseQueue.rejected, (state, action) => {
        state.isTogglingPause = false;
        state.error = action.payload as string;
      })
      .addCase(resumeQueue.pending, (state) => {
        state.isTogglingPause = true;
      })
      .addCase(resumeQueue.fulfilled, (state) => {
        state.isTogglingPause = false;
        state.isPaused = false;
      })
      .addCase(resumeQueue.rejected, (state, action) => {
        state.isTogglingPause = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters } = queueSlice.actions;
export default queueSlice.reducer;