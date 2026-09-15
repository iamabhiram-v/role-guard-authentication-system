import { getSocket } from '../services/socket';

/**
 * Emit-only socket actions, safe to use from any number of components.
 *
 * Unlike useSocket(), this hook does NOT register any event listeners —
 * it just grabs the existing shared socket (connected once, in App.tsx via
 * useSocket()) and exposes emit functions. Using useSocket() itself in
 * multiple components was causing the same 'activity-event' (and other)
 * listeners to be registered once per mounted component, so a single
 * server-side broadcast got dispatched multiple times (e.g. one role
 * change showing up 2-3x in the Activity Stream).
 */
export const useSocketActions = () => {
  const joinRoom = (workspaceId: string) => {
    getSocket()?.emit('join-room', workspaceId, (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        console.error('Failed to join workspace room:', res.message);
      }
    });
  };

  const leaveRoom = (workspaceId: string) => {
    getSocket()?.emit('leave-room', workspaceId);
  };

  const startTyping = (workspaceId: string, context?: string) => {
    getSocket()?.emit('typing-start', { workspaceId, context });
  };

  const stopTyping = (workspaceId: string) => {
    getSocket()?.emit('typing-stop', { workspaceId });
  };

  const broadcastActivity = (workspaceId: string, action: string, details?: unknown) => {
    getSocket()?.emit('activity-broadcast', { workspaceId, action, details });
  };

  const sendMessage = (workspaceId: string, message: string): Promise<{ success: boolean; message?: string }> => {
    return new Promise((resolve) => {
      getSocket()?.emit('send-message', { workspaceId, message }, (res: { success: boolean; message?: string }) => {
        resolve(res);
      });
    });
  };

  return { joinRoom, leaveRoom, startTyping, stopTyping, broadcastActivity, sendMessage };
};