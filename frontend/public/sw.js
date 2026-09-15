// Minimal service worker — just enough to support Push notifications.
// It doesn't do offline caching; that's a separate concern (PWA) if needed later.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = { title: 'RoleGuard', body: 'You have a new notification.' };
  try {
    payload = event.data.json();
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/favicon.svg',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/notifications');
      }
    })
  );
});