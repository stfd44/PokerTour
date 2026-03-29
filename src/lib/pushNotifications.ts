import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { app, db, useTestDb } from './firebase';
import { playTimerCompleteAlarm } from './timerAlarm';

const DEVICE_ID_STORAGE_KEY = 'pokertour_push_device_id';
const FOREGROUND_LISTENER_KEY = '__pokertour_push_listener__';
const PUSH_REGISTRATION_STATUS_KEY = 'pokertour_push_registration_status';

type TimerPushPayload = {
  tournamentId: string;
  gameId: string;
  levelNumber: number;
  excludeDeviceId?: string;
};

type PushRegistrationResult = {
  ok: boolean;
  endpoint: string | null;
  reason?: string;
};

export type PushEnableResult = PushRegistrationResult & {
  permission: NotificationPermission | 'unsupported';
};

export type PushRegistrationStatus = {
  ok: boolean;
  reason: string;
  endpoint: string | null;
  updatedAt: number;
  mode: 'prod' | 'test';
};

const getPushMode = (): 'prod' | 'test' => (useTestDb ? 'test' : 'prod');

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, reason: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(reason)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const persistPushRegistrationStatus = ({
  ok,
  reason,
  endpoint,
}: {
  ok: boolean;
  reason: string;
  endpoint: string | null;
}) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const status: PushRegistrationStatus = {
      ok,
      reason,
      endpoint,
      updatedAt: Date.now(),
      mode: getPushMode(),
    };

    localStorage.setItem(PUSH_REGISTRATION_STATUS_KEY, JSON.stringify(status));
  } catch (error) {
    console.warn('Unable to persist push registration status.', error);
  }
};

const loadFunctionsModule = async () => import('firebase/functions');

const getVapidKey = (): string => {
  return useTestDb
    ? import.meta.env.VITE_FIREBASE_VAPID_KEY_TEST || ''
    : import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
};

export const isPushConfigured = (): boolean => Boolean(getVapidKey());

export const getLastPushRegistrationStatus = (): PushRegistrationStatus | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const rawStatus = localStorage.getItem(PUSH_REGISTRATION_STATUS_KEY);
    if (!rawStatus) {
      return null;
    }

    return JSON.parse(rawStatus) as PushRegistrationStatus;
  } catch (error) {
    console.warn('Unable to read persisted push registration status.', error);
    return null;
  }
};

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

  const registration = await navigator.serviceWorker.register('/sw.js');

  try {
    return await navigator.serviceWorker.ready;
  } catch (error) {
    console.warn('Service worker registered but did not become ready.', error);
    return registration;
  }
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

  try {
    return await withTimeout(Notification.requestPermission(), 10000, 'permission_timeout');
  } catch (error) {
    console.warn('Notification permission request timed out, checking current permission state.', error);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const currentPermission = Notification.permission;
      if (currentPermission !== 'default') {
        return currentPermission;
      }

      await wait(500);
    }

    return Notification.permission;
  }
};

const ensurePushRegistrationDetailed = async (userId: string): Promise<PushRegistrationResult> => {
  if (!isPushSupported()) {
    persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'unsupported' });
    return { ok: false, endpoint: null, reason: 'unsupported' };
  }

  if (!isPushConfigured()) {
    persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'not_configured' });
    return { ok: false, endpoint: null, reason: 'not_configured' };
  }

  if (getPushNotificationPermission() !== 'granted') {
    persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'permission_not_granted' });
    return { ok: false, endpoint: null, reason: 'permission_not_granted' };
  }

  const serviceWorkerRegistration = await withTimeout(
    registerPushServiceWorker(),
    10000,
    'sw_registration_timeout'
  ).catch((error) => {
    console.warn('Unable to register push service worker.', error);
    return null;
  });

  if (!serviceWorkerRegistration) {
    persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'sw_registration_failed' });
    return { ok: false, endpoint: null, reason: 'sw_registration_failed' };
  }

  let subscription = await withTimeout(
    serviceWorkerRegistration.pushManager.getSubscription(),
    10000,
    'get_subscription_timeout'
  ).catch((error) => {
    console.warn('Unable to read existing push subscription.', error);
    return null;
  });

  if (!subscription) {
    subscription = await withTimeout(
      serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidKey()),
      }),
      10000,
      'subscribe_timeout'
    ).catch((error) => {
      console.warn('Unable to create push subscription.', error);
      return null;
    });
  }

  if (!subscription) {
    persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'subscribe_failed' });
    return { ok: false, endpoint: null, reason: 'subscribe_failed' };
  }

  try {
    await withTimeout(savePushSubscription(userId, subscription), 10000, 'save_subscription_timeout');
    persistPushRegistrationStatus({ ok: true, endpoint: subscription.endpoint, reason: 'registered' });
    return { ok: true, endpoint: subscription.endpoint };
  } catch (error) {
    console.warn('Unable to save push subscription.', error);
    const reason =
      error instanceof Error && error.message === 'save_subscription_timeout'
        ? 'save_timeout'
        : 'save_failed';

    persistPushRegistrationStatus({ ok: false, endpoint: subscription.endpoint, reason });
    return { ok: false, endpoint: subscription.endpoint, reason };
  }
};

export const ensurePushRegistration = async (userId: string): Promise<string | null> => {
  const result = await ensurePushRegistrationDetailed(userId).catch((error) => {
    console.warn('Unable to ensure push registration.', error);
    return { ok: false, endpoint: null, reason: 'unexpected_error' } as PushRegistrationResult;
  });

  return result.ok ? result.endpoint : null;
};

export const enablePushNotifications = async (userId: string): Promise<PushEnableResult> => {
  if (!isPushSupported() || !isPushConfigured()) {
    return {
      ok: false,
      endpoint: null,
      permission: 'unsupported',
      reason: !isPushSupported() ? 'unsupported' : 'not_configured',
    };
  }

  persistPushRegistrationStatus({ ok: false, endpoint: null, reason: 'activation_pending' });
  const existingPermission = getPushNotificationPermission();
  const permission =
    existingPermission === 'granted'
      ? existingPermission
      : await requestPushPermission();

  if (permission === 'granted') {
    const result = await ensurePushRegistrationDetailed(userId);
    if (!result.ok) {
      console.warn('Push permission granted, but no web push subscription could be stored.');
    }

    return {
      ...result,
      permission,
    };
  }

  return {
    ok: false,
    endpoint: null,
    permission,
    reason:
      permission === 'denied'
        ? 'permission_denied'
        : permission === 'default'
          ? 'permission_timeout'
          : 'permission_not_granted',
  };
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
