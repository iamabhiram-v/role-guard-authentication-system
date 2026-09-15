import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Public VAPID key — safe to expose in frontend code.
// Generated with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

// Matches the convention used in services/api.ts (VITE_API_URL already includes /api).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Registers the service worker and subscribes the current user to push
 * notifications, once, after login. Mirrors useSocket()'s pattern: reacts
 * to isAuthenticated from the auth slice.
 *
 * Silently does nothing if the browser doesn't support push, the user has
 * already denied permission, or a subscription already exists on this device.
 */
export const usePushSubscription = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;
    if (!VAPID_PUBLIC_KEY) {
      console.warn('[push] VITE_VAPID_PUBLIC_KEY is not set — skipping push subscription');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        const registration = await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        if (existing || cancelled) return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });

        if (cancelled) return;

        await fetch(`${API_URL}/push-subscriptions/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(subscription),
        });
      } catch (err) {
        // Push is a "nice to have" channel — never let a failure here break the app.
        console.error('[push] Subscription setup failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
};