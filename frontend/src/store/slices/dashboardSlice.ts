import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api';

export interface DashboardOverview {
  totalUsers: number;
  activeUsers: number;
  totalWorkspaces: number;
  totalMembers: number;
  pendingInvites: number;
  jobsProcessed: number;
  jobsFailed: number;
  notificationsSent: number;
  rangeDays: number;
}

export interface TimelinePoint {
  date: string;
  workspacesCreated: number;
  membersJoined: number;
  invitesSent: number;
  jobsCompleted: number;
}

export interface TopWorkspace {
  id: string;
  name: string;
  member_count: number;
  created_at: string;
}

export interface SummaryMetric {
  key: string;
  current: number;
  previous: number;
  changePct: number | null;
  isNew: boolean;
}

export interface SummaryReport {
  rangeDays: number;
  metrics: SummaryMetric[];
}

interface DashboardState {
  overview: DashboardOverview | null;
  timeline: TimelinePoint[];
  topWorkspaces: TopWorkspace[];
  summary: SummaryReport | null;
  range: '7' | '30' | '90';
  isLoading: boolean;
  isSummaryLoading: boolean;
  isExporting: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  overview: null,
  timeline: [],
  topWorkspaces: [],
  summary: null,
  range: '30',
  isLoading: false,
  isSummaryLoading: false,
  isExporting: false,
  error: null,
};

const errMsg = (err: any, fallback: string) => err.response?.data?.message || fallback;

export const fetchOverview = createAsyncThunk(
  'dashboard/fetchOverview',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: DashboardOverview }>(`/dashboard/overview?range=${range}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load dashboard overview'));
    }
  }
);

export const fetchTimeline = createAsyncThunk(
  'dashboard/fetchTimeline',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: TimelinePoint[] }>(`/dashboard/timeline?range=${range}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load activity timeline'));
    }
  }
);

export const fetchTopWorkspaces = createAsyncThunk(
  'dashboard/fetchTopWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: TopWorkspace[] }>('/dashboard/top-workspaces');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load top workspaces'));
    }
  }
);

export const fetchSummary = createAsyncThunk(
  'dashboard/fetchSummary',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<{ data: SummaryReport }>(`/dashboard/summary?range=${range}`);
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to load summary report'));
    }
  }
);

export const exportReport = createAsyncThunk(
  'dashboard/exportReport',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<Blob>(`/dashboard/export?range=${range}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'roleguard-report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to export report'));
    }
  }
);

export const exportReportJson = createAsyncThunk(
  'dashboard/exportReportJson',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<Blob>(`/dashboard/export/json?range=${range}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'roleguard-report.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to export report'));
    }
  }
);

export const exportReportPdf = createAsyncThunk(
  'dashboard/exportReportPdf',
  async (range: string, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<Blob>(`/dashboard/export/pdf?range=${range}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'roleguard-report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return true;
    } catch (err: any) {
      return rejectWithValue(errMsg(err, 'Failed to export report'));
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardRange: (state, action: PayloadAction<'7' | '30' | '90'>) => {
      state.range = action.payload;
    },
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOverview.fulfilled, (state, action: PayloadAction<DashboardOverview>) => {
        state.isLoading = false;
        state.overview = action.payload;
      })
      .addCase(fetchOverview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchTimeline.fulfilled, (state, action: PayloadAction<TimelinePoint[]>) => {
        state.timeline = action.payload;
      })
      .addCase(fetchTimeline.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(fetchTopWorkspaces.fulfilled, (state, action: PayloadAction<TopWorkspace[]>) => {
        state.topWorkspaces = action.payload;
      })
      .addCase(fetchSummary.pending, (state) => {
        state.isSummaryLoading = true;
      })
      .addCase(fetchSummary.fulfilled, (state, action: PayloadAction<SummaryReport>) => {
        state.isSummaryLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchSummary.rejected, (state, action) => {
        state.isSummaryLoading = false;
        state.error = action.payload as string;
      })
      .addCase(exportReport.pending, (state) => {
        state.isExporting = true;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.isExporting = false;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.payload as string;
      })
      .addCase(exportReportJson.pending, (state) => {
        state.isExporting = true;
      })
      .addCase(exportReportJson.fulfilled, (state) => {
        state.isExporting = false;
      })
      .addCase(exportReportJson.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.payload as string;
      })
      .addCase(exportReportPdf.pending, (state) => {
        state.isExporting = true;
      })
      .addCase(exportReportPdf.fulfilled, (state) => {
        state.isExporting = false;
      })
      .addCase(exportReportPdf.rejected, (state, action) => {
        state.isExporting = false;
        state.error = action.payload as string;
      });
  },
});

export const { setDashboardRange, clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;