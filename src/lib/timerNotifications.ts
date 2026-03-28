import { registerPushServiceWorker } from './pushNotifications';

type TimerNotificationPayload = {
  body: string;
  tag: string;
  url: string;
};

let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export const isTimerNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
};

export const getTimerNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isTimerNotificationSupported()) {
    return 'unsupported';
  }

  return Notification.permission;
};

export const registerTimerNotificationServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isTimerNotificationSupported()) {
    return null;
  }

  if (!serviceWorkerRegistrationPromise) {
    serviceWorkerRegistrationPromise = registerPushServiceWorker().catch((error) => {
      console.warn('Unable to register notification service worker.', error);
      return null;
    });
  }

  return serviceWorkerRegistrationPromise;
};

export const requestTimerNotificationPermission = async (): Promise<NotificationPermission | 'unsupported'> => {
  if (!isTimerNotificationSupported()) {
    return 'unsupported';
  }

  await registerTimerNotificationServiceWorker();
  return Notification.requestPermission();
};

const showTimerNotification = async ({
  body,
  tag,
  url,
}: TimerNotificationPayload): Promise<boolean> => {
  if (!isTimerNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const registration =
    (await registerTimerNotificationServiceWorker()) ??
    (await navigator.serviceWorker.ready.catch(() => null));

  if (!registration) {
    return false;
  }

  await registration.showNotification('PokerTour', {
    body,
    icon: '/poker-tour-logo.png',
    badge: '/poker-tour-logo.png',
    tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [250, 120, 250, 120, 400],
    data: { url },
  });

  return true;
};

export const showTimerCompleteNotification = async (
  tournamentId: string,
  levelNumber: number
): Promise<boolean> =>
  showTimerNotification({
    body: `Le niveau ${levelNumber} est termine. Passez au niveau suivant.`,
    tag: `timer-complete-${tournamentId}`,
    url: `/tournament/${tournamentId}`,
  });
