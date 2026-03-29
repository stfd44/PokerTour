const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const webpush = require('web-push');

initializeApp();

const db = getFirestore();

const webPushPublicKey = defineString('WEB_PUSH_PUBLIC_KEY');
const webPushSubject = defineString('WEB_PUSH_SUBJECT');
const webPushPrivateKey = defineSecret('WEB_PUSH_PRIVATE_KEY');

const isSubscriptionGone = (error) => error?.statusCode === 404 || error?.statusCode === 410;

const configureWebPush = () => {
  const publicKey = webPushPublicKey.value();
  const subject = webPushSubject.value();
  const privateKey = webPushPrivateKey.value();

  if (!publicKey || !subject || !privateKey) {
    throw new HttpsError('failed-precondition', 'Web Push VAPID configuration is incomplete.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
};

const sendWebPushPayload = async ({
  entries,
  payload,
  logContext,
}) => {
  const cleanupOperations = [];
  let successCount = 0;
  let failureCount = 0;

  await Promise.all(entries.map(async (entry) => {
    try {
      await webpush.sendNotification(entry.subscription, payload, {
        urgency: 'high',
        TTL: 60,
      });
      successCount += 1;
    } catch (error) {
      failureCount += 1;

      if (isSubscriptionGone(error)) {
        cleanupOperations.push(
          entry.ref.delete().catch((deleteError) => {
            logger.error('Failed to delete invalid push subscription', deleteError);
          })
        );
      }

      logger.error('Failed to send web push notification', error, logContext(entry));
    }
  }));

  if (cleanupOperations.length > 0) {
    await Promise.all(cleanupOperations);
  }

  return { successCount, failureCount };
};

exports.sendTimerLevelCompletePush = onCall({ secrets: [webPushPrivateKey] }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const {
    tournamentId,
    gameId,
    levelNumber,
    excludeDeviceId = null,
    mode = 'prod',
  } = request.data || {};

  if (!tournamentId || !gameId || !Number.isInteger(levelNumber)) {
    throw new HttpsError('invalid-argument', 'tournamentId, gameId and levelNumber are required.');
  }

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();

  if (!tournamentSnap.exists) {
    throw new HttpsError('not-found', 'Tournament not found.');
  }

  configureWebPush();

  const tournament = tournamentSnap.data();
  const game = Array.isArray(tournament.games)
    ? tournament.games.find((entry) => entry.id === gameId)
    : null;

  if (!game) {
    throw new HttpsError('not-found', 'Game not found.');
  }

  const participantIds = Array.isArray(game.players)
    ? game.players.map((player) => player.id).filter(Boolean)
    : [];

  if (!participantIds.includes(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Only game participants can trigger timer notifications.');
  }

  const deviceEntries = [];

  for (const participantId of participantIds) {
    const devicesSnap = await db.collection('users').doc(participantId).collection('devices').get();

    devicesSnap.forEach((deviceDoc) => {
      const device = deviceDoc.data();

      if (!device?.subscription || device.notificationsEnabled === false) {
        return;
      }

      if (participantId === request.auth.uid && excludeDeviceId && deviceDoc.id === excludeDeviceId) {
        return;
      }

      if (device.mode && device.mode !== mode) {
        return;
      }

      deviceEntries.push({
        ref: deviceDoc.ref,
        endpoint: device.endpoint,
        subscription: device.subscription,
      });
    });
  }

  const uniqueEntries = Array.from(
    new Map(deviceEntries.map((entry) => [entry.endpoint || JSON.stringify(entry.subscription), entry])).values()
  );

  if (uniqueEntries.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const url = `/tournament/${tournamentId}`;
  const tag = `timer-complete-${tournamentId}-${gameId}`;
  const body = `Le niveau ${levelNumber} est termine. Passez au niveau suivant.`;
  const payload = JSON.stringify({
    type: 'timer_complete',
    tournamentId,
    gameId,
    levelNumber,
    title: 'PokerTour',
    body,
    url,
    tag,
  });

  const { successCount, failureCount } = await sendWebPushPayload({
    entries: uniqueEntries,
    payload,
    logContext: (entry) => ({
      tournamentId,
      gameId,
      endpoint: entry.endpoint,
    }),
  });

  await tournamentRef.set({
    lastTimerNotificationAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  logger.info('Timer notifications sent', {
    tournamentId,
    gameId,
    levelNumber,
    successCount,
    failureCount,
  });

  return {
    successCount,
    failureCount,
  };
});

exports.sendPushTestToCurrentDevice = onCall({ secrets: [webPushPrivateKey] }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.');
  }

  const {
    deviceId,
    mode = 'prod',
  } = request.data || {};

  if (!deviceId || typeof deviceId !== 'string') {
    throw new HttpsError('invalid-argument', 'deviceId is required.');
  }

  configureWebPush();

  const deviceRef = db.collection('users').doc(request.auth.uid).collection('devices').doc(deviceId);
  const deviceSnap = await deviceRef.get();

  if (!deviceSnap.exists) {
    throw new HttpsError('not-found', 'Push device not found for current user.');
  }

  const device = deviceSnap.data();

  if (!device?.subscription) {
    throw new HttpsError('failed-precondition', 'Push device does not have a stored subscription.');
  }

  if (device.notificationsEnabled === false) {
    throw new HttpsError('failed-precondition', 'Push notifications are disabled for this device.');
  }

  if (device.mode && device.mode !== mode) {
    throw new HttpsError('failed-precondition', 'Push device belongs to a different environment.');
  }

  const sentAt = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  const payload = JSON.stringify({
    type: 'push_test',
    title: 'PokerTour',
    body: `Push test envoye a ${sentAt}. Si l'iPhone est verrouille, cette notification doit apparaitre sur l'ecran verrouille.`,
    url: '/profile',
    tag: `push-test-${deviceId}`,
  });

  const { successCount, failureCount } = await sendWebPushPayload({
    entries: [{
      ref: deviceRef,
      endpoint: device.endpoint,
      subscription: device.subscription,
    }],
    payload,
    logContext: (entry) => ({
      deviceId,
      endpoint: entry.endpoint,
      userId: request.auth.uid,
    }),
  });

  logger.info('Push test notification sent', {
    userId: request.auth.uid,
    deviceId,
    successCount,
    failureCount,
  });

  return {
    successCount,
    failureCount,
  };
});
