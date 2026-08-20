import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/socket';
import { setConnected, setPresence, setTyping, addActivityEvent, resetPresence } from '../store/slices/presenceSlice';
import { fetchUnreadCount } from '../store/slices/NotificationSlice';
import { AppDispatch, RootState } from '../store';

export const useSocket = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      socketRef.current = null;
      dispatch(resetPresence());
      return;
    }

    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => dispatch(setConnected(true)));
    socket.on('disconnect', () => dispatch(setConnected(false)));

    socket.on('presence-update', ({ workspaceId, onlineUserIds }) => {
      dispatch(setPresence({ workspaceId, onlineUserIds }));
    });

    socket.on('typing-update', ({ workspaceId, userId, email, context, isTyping }) => {
      dispatch(setTyping({ workspaceId, userId, email, context: context ?? null, isTyping }));
    });

    socket.on('activity-event', (event) => {
      dispatch(addActivityEvent({ workspaceId: event.workspaceId, event }));
    });

    // The backend now persists a real notification row when someone joins,
    // so we just refresh the unread badge count rather than pushing a
    // client-only notification that would get wiped by the next fetch/poll.
    socket.on('user-joined', ({ userId }) => {
      if (userId === user?.id) return;
      dispatch(fetchUnreadCount());
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('presence-update');
      socket.off('typing-update');
      socket.off('activity-event');
      socket.off('user-joined');
    };
  }, [isAuthenticated, user?.id, dispatch]);

  const joinRoom = (workspaceId: string) => {
    socketRef.current?.emit('join-room', workspaceId, (res: { success: boolean; message?: string }) => {
      if (!res.success) {
        console.error('Failed to join workspace room:', res.message);
      }
    });
  };

  const leaveRoom = (workspaceId: string) => {
    socketRef.current?.emit('leave-room', workspaceId);
  };

  const startTyping = (workspaceId: string, context?: string) => {
    socketRef.current?.emit('typing-start', { workspaceId, context });
  };

  const stopTyping = (workspaceId: string) => {
    socketRef.current?.emit('typing-stop', { workspaceId });
  };

  const broadcastActivity = (workspaceId: string, action: string, details?: unknown) => {
    socketRef.current?.emit('activity-broadcast', { workspaceId, action, details });
  };

  return { joinRoom, leaveRoom, startTyping, stopTyping, broadcastActivity };
};