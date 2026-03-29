import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { app, db, useTestDb } from './firebase';
import { playTimerCompleteAlarm } from './timerAlarm';

const DEVICE_ID_STORAGE_KEY = 'pokertour_push_device_id';
const FOREGROUND_LISTENER_KEY = '__pokertour_push_listener__';

type TimerPushPayload = {
  tournamentId: string;
  gameId: string;
  levelNumber: number;
  excludeDeviceId?: string;
};

const getPushMode = (): 'prod' | 'test' => (useTestDb ? 'test' : 'prod');

const loadFunctionsModule = async () => import('firebase/functions');

const getVapidKey = (): string => {
  return useTestDb
    ? import.meta.env.VITE_FIREBASE_VAPID_KEY_TEST || ''
    : import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
};

export const isPushConfigured = (): boolean => Boolean(getVapidKey());

export const getPushNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.permission;
};

export const isPushSupported = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export const getOrCreatePushDeviceId = (): string => {
  try {
    const existingDeviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existingDeviceId) {
      return existingDeviceId;
    }
  } catch (error) {
    console.warn('Unable to read push device id from localStorage.', error);
  }

  const newDeviceId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, newDeviceId);
  } catch (error) {
    console.warn('Unable to persist push device id in localStorage.', error);
  }

  return newDeviceId;
};

export const registerPushServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  return navigator.serviceWorker.register('/sw.js');
};

const savePushSubscription = async (userId: string, subscription: PushSubscription) => {
  const deviceId = getOrCreatePushDeviceId();
  const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
  const serializedSubscription = subscription.toJSON();

  await setDoc(deviceRef, {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    subscription: serializedSubscription,
    notificationsEnabled: true,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    deviceId,
    mode: getPushMode(),
    kind: 'web_push',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    platform: typeof navigator !== 'undefined' ? navigator.platform : null,
  }, { merge: true });
};

export const requestPushPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  return Notification.requestPermission();
};

export const ensurePushRegistration = async (userId: string): Promise<string | null> => {
  try {
    if (!isPushSupported() || !isPushConfigured()) {
      return null;
    }

    if (getPushNotificationPermission() !== 'granted') {
      return null;
    }

    const serviceWorkerRegistration = await registerPushServiceWorker();
    if (!serviceWorkerRegistration) {
      return null;
    }

    let subscription = await serviceWorkerRegistration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidKey()),
      });
    }

    if (!subscription) {
      return null;
    }

    await savePushSubscription(userId, subscription);
    return subscription.endpoint;
  } catch (error) {
    console.warn('Unable to ensure push registration.', error);
    return null;
  }
};

export const enablePushNotifications = async (userId: string): Promise<NotificationPermission | 'unsupported'> => {
  if (!isPushSupported() || !isPushConfigured()) {
    return 'unsupported';
  }

  const permission = await requestPushPermission();
  if (permission === 'granted') {
    await ensurePushRegistration(userId);
  }

  return permission;
};

export const removePushRegistration = async (userId: string) => {
  const deviceId = getOrCreatePushDeviceId();
  const deviceRef = doc(db, 'users', userId, 'devices', deviceId);

  try {
    const serviceWorkerRegistration = await registerPushServiceWorker();
    const subscription = await serviceWorkerRegistration?.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (error) {
    console.warn('Unable to unsubscribe local web push registration cleanly.', error);
  }

  await deleteDoc(deviceRef).catch((error) => {
    console.warn('Unable to delete stored push device.', error);
  });
};

export const initializeForegroundPushListener = async () => {
  try {
    if (typeof window === 'undefined' || (window as Window & { [FOREGROUND_LISTENER_KEY]?: boolean })[FOREGROUND_LISTENER_KEY]) {
      return;
    }

    const win = window as Window & { [FOREGROUND_LISTENER_KEY]?: boolean };
    win[FOREGROUND_LISTENER_KEY] = true;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'timer_complete_push') {
        void playTimerCompleteAlarm();
      }
    });
  } catch (error) {
    console.warn('Unable to initialize foreground push listener.', error);
  }
};

export const sendTimerLevelCompletePush = async ({
  tournamentId,
  gameId,
  levelNumber,
  excludeDeviceId,
}: TimerPushPayload) => {
  try {
    const { getFunctions, httpsCallable } = await loadFunctionsModule();
    const functions = getFunctions(app);
    const sendPush = httpsCallable(functions, 'sendTimerLevelCompletePush');

    return sendPush({
      tournamentId,
      gameId,
      levelNumber,
      excludeDeviceId,
      mode: getPushMode(),
    });
  } catch (error) {
    console.warn('Unable to call timer push function.', error);
    throw error;
  }
};
