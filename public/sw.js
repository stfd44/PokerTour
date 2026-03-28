/* eslint-disable no-undef */
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

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const firebaseConfigs = {
  prod: {
  "apiKey": "AIzaSyAjTzxWNQCsXbrM47iYoYJ4WH3XH2tN0iY",
  "authDomain": "pokertour-bf6b4.firebaseapp.com",
  "projectId": "pokertour-bf6b4",
  "storageBucket": "pokertour-bf6b4.firebasestorage.app",
  "messagingSenderId": "611114291347",
  "appId": "1:611114291347:web:a2eaf14a442ccc5308fd66",
  "measurementId": "G-BNP0BZJEBH"
},
  test: {
  "apiKey": "AIzaSyCvsxddseCUV2lXkDQsBHBmNfhMElgFAo4",
  "authDomain": "pokertourdev.firebaseapp.com",
  "projectId": "pokertourdev",
  "storageBucket": "pokertourdev.firebasestorage.app",
  "messagingSenderId": "494683836771",
  "appId": "1:494683836771:web:a32539099d3e288c938356",
  "measurementId": "G-EZKH2Y1S5B"
},
};

const requestedProject = new URL(self.location.href).searchParams.get('firebaseProject');
const firebaseProject = requestedProject === 'test' && firebaseConfigs.test.apiKey ? 'test' : 'prod';

firebase.initializeApp(firebaseConfigs[firebaseProject]);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title =
    (payload.notification && payload.notification.title) ||
    (payload.data && payload.data.title) ||
    'PokerTour';
  const body =
    (payload.notification && payload.notification.body) ||
    (payload.data && payload.data.body) ||
    'Le timer est termine.';
  const url = (payload.data && payload.data.url) || '/';
  const tag = (payload.data && payload.data.tag) || undefined;

  self.registration.showNotification(title, {
    body,
    icon: '/poker-tour-logo.png',
    badge: '/poker-tour-logo.png',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 120, 250, 120, 400],
    data: { url },
  });
});
