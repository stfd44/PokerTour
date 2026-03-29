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

  const publicKey = webPushPublicKey.value();
  const subject = webPushSubject.value();
  const privateKey = webPushPrivateKey.value();

  if (!publicKey || !subject || !privateKey) {
    throw new HttpsError('failed-precondition', 'Web Push VAPID configuration is incomplete.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

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

  const cleanupOperations = [];
  let successCount = 0;
  let failureCount = 0;

  await Promise.all(uniqueEntries.map(async (entry) => {
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

      logger.error('Failed to send web push notification', error, {
        tournamentId,
        gameId,
        endpoint: entry.endpoint,
      });
    }
  }));

  if (cleanupOperations.length > 0) {
    await Promise.all(cleanupOperations);
  }

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
