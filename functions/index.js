const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');

initializeApp();

const db = getFirestore();

const INVALID_TOKEN_ERRORS = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

exports.sendTimerLevelCompletePush = onCall(async (request) => {
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

      if (!device?.token || device.notificationsEnabled === false) {
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
        token: device.token,
      });
    });
  }

  const uniqueEntries = Array.from(
    new Map(deviceEntries.map((entry) => [entry.token, entry])).values()
  );

  if (uniqueEntries.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const url = `/tournament/${tournamentId}`;
  const tag = `timer-complete-${tournamentId}-${gameId}`;
  const body = `Le niveau ${levelNumber} est termine. Passez au niveau suivant.`;

  const response = await getMessaging().sendEachForMulticast({
    tokens: uniqueEntries.map((entry) => entry.token),
    data: {
      type: 'timer_complete',
      tournamentId,
      gameId,
      levelNumber: String(levelNumber),
      title: 'PokerTour',
      body,
      url,
      tag,
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
    },
  });

  const cleanupOperations = [];

  response.responses.forEach((sendResponse, index) => {
    if (!sendResponse.success && INVALID_TOKEN_ERRORS.has(sendResponse.error?.code)) {
      cleanupOperations.push(
        uniqueEntries[index].ref.delete().catch((error) => {
          logger.error('Failed to delete invalid push token', error);
        })
      );
    }
  });

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
    successCount: response.successCount,
    failureCount: response.failureCount,
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
});
