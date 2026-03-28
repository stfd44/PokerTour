import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const outputPath = path.join(rootDir, 'public', 'sw.js');

const parseEnvFile = (content) =>
  content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});

const env = fs.existsSync(envPath)
  ? parseEnvFile(fs.readFileSync(envPath, 'utf8'))
  : {};

const buildConfig = (prefix = '') => ({
  apiKey: env[`VITE_FIREBASE_API_KEY${prefix}`] || '',
  authDomain: env[`VITE_FIREBASE_AUTH_DOMAIN${prefix}`] || '',
  projectId: env[`VITE_FIREBASE_PROJECT_ID${prefix}`] || '',
  storageBucket: env[`VITE_FIREBASE_STORAGE_BUCKET${prefix}`] || '',
  messagingSenderId: env[`VITE_FIREBASE_MESSAGING_SENDER_ID${prefix}`] || '',
  appId: env[`VITE_FIREBASE_APP_ID${prefix}`] || '',
  measurementId: env[`VITE_FIREBASE_MEASUREMENT_ID${prefix}`] || '',
});

const prodConfig = buildConfig();
const testConfig = buildConfig('_TEST');

if (!prodConfig.apiKey || !prodConfig.messagingSenderId || !prodConfig.appId || !prodConfig.projectId) {
  throw new Error('Firebase production config is incomplete. Unable to generate sw.js.');
}

const serviceWorkerSource = `/* eslint-disable no-undef */
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
  prod: ${JSON.stringify(prodConfig, null, 2)},
  test: ${JSON.stringify(testConfig, null, 2)},
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
`;

fs.writeFileSync(outputPath, serviceWorkerSource);
console.log('Generated public/sw.js for Firebase Messaging');
