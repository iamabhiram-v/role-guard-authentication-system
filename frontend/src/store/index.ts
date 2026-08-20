import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import workspaceReducer from './slices/workspaceSlice';
import notificationReducer from './slices/NotificationSlice';
import queueReducer from './slices/queueSlice';
import notificationPreferencesReducer from './slices/notificationPreferencesSlice';
import announcementReducer from './slices/announcementSlice';
import pushSubscriptionReducer from './slices/pushSubscriptionSlice';
import presenceReducer from './slices/presenceSlice';
import dashboardReducer from './slices/dashboardSlice';
import serviceStatusReducer from './slices/serviceStatusSlice';
import paymentReducer from './slices/paymentSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    workspace: workspaceReducer,
    notifications: notificationReducer,
    queue: queueReducer,
    notificationPreferences: notificationPreferencesReducer,
    announcements: announcementReducer,
    pushSubscription: pushSubscriptionReducer,
    presence: presenceReducer,
    dashboard: dashboardReducer,
    serviceStatus: serviceStatusReducer,
    payment: paymentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
        ignoredPaths: ['auth.tokens'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;