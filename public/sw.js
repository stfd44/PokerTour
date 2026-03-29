self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => 'focus' in client);

      if (matchingClient) {
        const navigation = matchingClient.url === targetUrl
          ? Promise.resolve()
          : matchingClient.navigate(targetUrl);

        return navigation.then(() => matchingClient.focus());
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});

self.addEventListener('push', (event) => {
  const payload = (() => {
    if (!event.data) {
      return {};
    }

    try {
      return event.data.json();
    } catch (error) {
      return { body: event.data.text() };
    }
  })();

  const title = payload.title || 'PokerTour';
  const url = payload.url || '/';
  const notificationOptions = {
    body: payload.body || 'Le timer est termine.',
    icon: '/poker-tour-logo.png',
    badge: '/poker-tour-logo.png',
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 120, 250, 120, 400],
    data: { url },
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, notificationOptions),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        if (payload.type === 'timer_complete') {
          clients.forEach((client) => {
            client.postMessage({
              type: 'timer_complete_push',
              payload,
            });
          });
        }
      }),
    ])
  );
});
