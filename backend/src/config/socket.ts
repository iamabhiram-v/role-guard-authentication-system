import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import { db } from './database';
import { queueService } from '../services/queue.service';

type AuthenticatedSocket = Socket & {
  userId?: string;
  email?: string;
  role?: string;
}

// Minimal cookie-string parser — avoids type resolution issues with the
// `cookie` package across its differing v0.x/v1.x type exports. We only
// need to read a single value out of a raw "a=1; b=2" header string.
const parseCookies = (rawCookie: string): Record<string, string> => {
  return rawCookie.split(';').reduce((acc: Record<string, string>, pair) => {
    const [key, ...rest] = pair.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

// workspaceId -> userId -> Set of socketIds (handles multiple tabs/devices per user)
const presence = new Map<string, Map<string, Set<string>>>();

// workspaceId -> userId -> timestamp of last "user online" notification.
// Presence itself resets on every disconnect (page refresh, network blip,
// server restart), so without this a person's normal reconnects would
// re-trigger a fresh "Team member online" notification for everyone else
// each time. This cooldown makes sure that only happens at most once per
// window, while someone genuinely returning after a longer absence still
// notifies normally.
const lastPresenceNotifyAt = new Map<string, Map<string, number>>();
const PRESENCE_NOTIFY_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

// workspaceId -> userId -> email (for typing indicator display)
const typingUsers = new Map<string, Map<string, string>>();

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    process.env.CORS_ORIGIN,
  ].filter(Boolean) as string[];

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket Authentication — reads the same httpOnly accessToken cookie
  // used by the REST API, since the client can't read it via JS.
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const rawCookie = socket.handshake.headers.cookie;
      if (!rawCookie) {
        return next(new Error('Authentication required'));
      }

      const parsed = parseCookies(rawCookie);
      const accessToken = parsed.accessToken;

      if (!accessToken) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyAccessToken(accessToken);
      socket.userId = decoded.userId;
      socket.email = decoded.email;
      socket.role = decoded.role;

      next();
    } catch (err) {
      next(new Error('Authentication required'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`🔌 Socket connected: ${socket.id} (user: ${socket.userId})`);

    // --- Room Management ---
    socket.on(
      'join-room',
      async (workspaceId: string, callback?: (res: { success: boolean; message?: string }) => void) => {
        try {
          if (!workspaceId || !socket.userId) {
            callback?.({ success: false, message: 'Invalid request' });
            return;
          }

          const membership = await db.query(
            'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
            [workspaceId, socket.userId]
          );

          if (membership.rows.length === 0) {
            callback?.({ success: false, message: 'Not a member of this workspace' });
            return;
          }

          socket.join(workspaceId);

          if (!presence.has(workspaceId)) {
            presence.set(workspaceId, new Map());
          }
          const workspacePresence = presence.get(workspaceId)!;

          const isFirstConnectionForUser = !workspacePresence.has(socket.userId);
          if (isFirstConnectionForUser) {
            workspacePresence.set(socket.userId, new Set());
          }
          workspacePresence.get(socket.userId)!.add(socket.id);

          broadcastPresence(workspaceId);

          if (isFirstConnectionForUser) {
            io.to(workspaceId).emit('user-joined', { workspaceId, userId: socket.userId, email: socket.email });

            const workspaceCooldowns = lastPresenceNotifyAt.get(workspaceId) ?? new Map<string, number>();
            lastPresenceNotifyAt.set(workspaceId, workspaceCooldowns);

            const lastNotified = workspaceCooldowns.get(socket.userId);
            const withinCooldown =
              lastNotified !== undefined && Date.now() - lastNotified < PRESENCE_NOTIFY_COOLDOWN_MS;

            if (!withinCooldown) {
              workspaceCooldowns.set(socket.userId, Date.now());

              // Persist a real notification for other online members so it
              // survives fetches/polling instead of being a Redux-only ghost
              // that gets wiped the moment fetchNotifications() runs.
              try {
                const otherMembers = await db.query(
                  'SELECT user_id FROM workspace_members WHERE workspace_id = $1 AND user_id != $2',
                  [workspaceId, socket.userId]
                );

                for (const row of otherMembers.rows) {
                  await queueService.enqueue(
                    'notification',
                    {
                      userId: row.user_id,
                      title: 'Team member online',
                      message: `${socket.email} is now active in this workspace.`,
                    },
                    { createdBy: socket.userId }
                  );
                }
              } catch (notifyErr) {
                console.error('Failed to queue presence notification:', notifyErr);
              }
            }
          }

          callback?.({ success: true });
        } catch (err) {
          console.error('join-room error:', err);
          callback?.({ success: false, message: 'Failed to join room' });
        }
      }
    );

    socket.on('leave-room', (workspaceId: string) => {
      removeFromRoom(socket, workspaceId);
    });

    // --- Typing Indicators ---
    socket.on('typing-start', ({ workspaceId, context }: { workspaceId: string; context?: string }) => {
      if (!workspaceId || !socket.userId) return;

      if (!typingUsers.has(workspaceId)) {
        typingUsers.set(workspaceId, new Map());
      }
      typingUsers.get(workspaceId)!.set(socket.userId, socket.email || socket.userId);

      socket.to(workspaceId).emit('typing-update', {
        workspaceId,
        userId: socket.userId,
        email: socket.email,
        context: context || null,
        isTyping: true,
      });
    });

    socket.on('typing-stop', ({ workspaceId }: { workspaceId: string }) => {
      if (!workspaceId || !socket.userId) return;

      typingUsers.get(workspaceId)?.delete(socket.userId);

      socket.to(workspaceId).emit('typing-update', {
        workspaceId,
        userId: socket.userId,
        email: socket.email,
        isTyping: false,
      });
    });

    // --- Activity Broadcasting ---
    socket.on(
      'activity-broadcast',
      ({ workspaceId, action, details }: { workspaceId: string; action: string; details?: unknown }) => {
        if (!workspaceId || !socket.userId) return;

        io.to(workspaceId).emit('activity-event', {
          workspaceId,
          userId: socket.userId,
          email: socket.email,
          action,
          details: details || null,
          timestamp: new Date().toISOString(),
        });
      }
    );

    // 'disconnecting' fires BEFORE socket.rooms is cleared, unlike 'disconnect'
    socket.on('disconnecting', () => {
      console.log(`🔌 Socket disconnecting: ${socket.id} (user: ${socket.userId})`);

      for (const room of socket.rooms) {
        if (room === socket.id) continue; // skip the socket's own private room
        removeFromRoom(socket, room);
      }
    });
  });

  return io;
};

function removeFromRoom(socket: AuthenticatedSocket, workspaceId: string) {
  if (!socket.userId) return;

  socket.leave(workspaceId);

  const workspacePresence = presence.get(workspaceId);
  if (!workspacePresence) return;

  const userSockets = workspacePresence.get(socket.userId);
  if (!userSockets) return;

  userSockets.delete(socket.id);

  if (userSockets.size === 0) {
    workspacePresence.delete(socket.userId);
    typingUsers.get(workspaceId)?.delete(socket.userId);
    io.to(workspaceId).emit('user-left', { workspaceId, userId: socket.userId });
  }

  broadcastPresence(workspaceId);

  if (workspacePresence.size === 0) {
    presence.delete(workspaceId);
    lastPresenceNotifyAt.delete(workspaceId);
  }
}

function broadcastPresence(workspaceId: string) {
  const workspacePresence = presence.get(workspaceId);
  const onlineUserIds = workspacePresence ? Array.from(workspacePresence.keys()) : [];
  io.to(workspaceId).emit('presence-update', { workspaceId, onlineUserIds });
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized — call initSocket() first');
  }
  return io;
};