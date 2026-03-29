const { initializeApp } = require('firebase-admin/app');
const { getFunctions } = require('firebase-admin/functions');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const { onTaskDispatched } = require('firebase-functions/v2/tasks');
const logger = require('firebase-functions/logger');
const webpush = require('web-push');

initializeApp();

const db = getFirestore();

const webPushPublicKey = defineString('WEB_PUSH_PUBLIC_KEY');
const webPushSubject = defineString('WEB_PUSH_SUBJECT');
const webPushPrivateKey = defineSecret('WEB_PUSH_PRIVATE_KEY');
const TIMER_TASK_QUEUE_FUNCTION = 'dispatchScheduledTimerPush';

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

const getCurrentLevelDurationMs = (game) => {
  const minutes = Array.isArray(game?.levelDurations)
    ? game.levelDurations[game.currentLevel] ?? 10
    : 10;

  return Math.max(0, Number(minutes) * 60 * 1000);
};

const buildTimerTaskId = ({
  tournamentId,
  gameId,
  levelNumber,
  levelStartTime,
  durationMs,
}) => (
  [
    'timer',
    tournamentId,
    gameId,
    `lvl${levelNumber}`,
    `start${levelStartTime}`,
    `dur${durationMs}`,
  ].join('_').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 500)
);

const getDesiredTimerSchedule = (tournamentId, game) => {
  if (!game || game.status !== 'in_progress' || game.isPaused || !game.levelStartTime) {
    return null;
  }

  const durationMs = getCurrentLevelDurationMs(game);
  if (!durationMs) {
    return null;
  }

  const levelNumber = (game.currentLevel ?? 0) + 1;
  const taskId = buildTimerTaskId({
    tournamentId,
    gameId: game.id,
    levelNumber,
    levelStartTime: game.levelStartTime,
    durationMs,
  });

  if (game.lastTimerPushKey === taskId) {
    return null;
  }

  return {
    taskId,
    scheduledFor: game.levelStartTime + durationMs,
    levelNumber,
    levelStartTime: game.levelStartTime,
    durationMs,
  };
};

const clearTimerScheduleMetadata = (game) => ({
  ...game,
  timerNotificationTaskId: null,
  timerNotificationScheduledFor: null,
  timerNotificationLevel: null,
});

const applyTimerScheduleMetadata = (game, desiredSchedule) => ({
  ...game,
  timerNotificationTaskId: desiredSchedule.taskId,
  timerNotificationScheduledFor: desiredSchedule.scheduledFor,
  timerNotificationLevel: desiredSchedule.levelNumber,
});

const updateTournamentGame = async (tournamentRef, gameId, transform) => (
  db.runTransaction(async (transaction) => {
    const tournamentSnap = await transaction.get(tournamentRef);
    if (!tournamentSnap.exists) {
      return { changed: false, game: null };
    }

    const tournament = tournamentSnap.data();
    const games = Array.isArray(tournament.games) ? tournament.games : [];
    const gameIndex = games.findIndex((entry) => entry.id === gameId);

    if (gameIndex === -1) {
      return { changed: false, game: null };
    }

    const currentGame = games[gameIndex];
    const nextGame = transform(currentGame);

    if (!nextGame) {
      return { changed: false, game: currentGame };
    }

    const changed = JSON.stringify(currentGame) !== JSON.stringify(nextGame);
    if (!changed) {
      return { changed: false, game: currentGame };
    }

    const updatedGames = games.map((entry, index) => (
      index === gameIndex ? nextGame : entry
    ));

    transaction.update(tournamentRef, { games: updatedGames });

    return { changed: true, game: nextGame };
  })
);

const getTimerTaskQueue = () => getFunctions().taskQueue(TIMER_TASK_QUEUE_FUNCTION);

const isTaskAlreadyExistsError = (error) => {
  const code = error?.code;
  return code === 'functions/task-already-exists'
    || code === 'task-already-exists'
    || String(error?.message || '').includes('task-already-exists');
};

const deleteTimerTask = async (taskId) => {
  if (!taskId) {
    return;
  }

  try {
    await getTimerTaskQueue().delete(taskId);
  } catch (error) {
    logger.error('Failed to delete timer task', error, { taskId });
  }
};

const enqueueTimerTask = async ({
  tournamentId,
  gameId,
  desiredSchedule,
}) => {
  try {
    await getTimerTaskQueue().enqueue({
      tournamentId,
      gameId,
      levelNumber: desiredSchedule.levelNumber,
      levelStartTime: desiredSchedule.levelStartTime,
      taskId: desiredSchedule.taskId,
    }, {
      id: desiredSchedule.taskId,
      scheduleTime: new Date(desiredSchedule.scheduledFor),
      dispatchDeadlineSeconds: 120,
    });
  } catch (error) {
    if (!isTaskAlreadyExistsError(error)) {
      throw error;
    }
  }
};

const getParticipantIds = (game) => (
  Array.isArray(game?.players)
    ? game.players.map((player) => player.id).filter(Boolean)
    : []
);

const getTimerDeviceEntries = async ({
  participantIds,
  mode = 'prod',
  excludeParticipantId = null,
  excludeDeviceId = null,
}) => {
  const deviceEntries = [];

  for (const participantId of participantIds) {
    const devicesSnap = await db.collection('users').doc(participantId).collection('devices').get();

    devicesSnap.forEach((deviceDoc) => {
      const device = deviceDoc.data();

      if (!device?.subscription || device.notificationsEnabled === false) {
        return;
      }

      if (excludeParticipantId && participantId === excludeParticipantId && excludeDeviceId && deviceDoc.id === excludeDeviceId) {
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

  return Array.from(
    new Map(deviceEntries.map((entry) => [entry.endpoint || JSON.stringify(entry.subscription), entry])).values()
  );
};

const sendTimerNotificationsToParticipants = async ({
  tournamentRef,
  tournamentId,
  gameId,
  game,
  levelNumber,
  mode = 'prod',
  excludeParticipantId = null,
  excludeDeviceId = null,
}) => {
  configureWebPush();

  const participantIds = getParticipantIds(game);
  const uniqueEntries = await getTimerDeviceEntries({
    participantIds,
    mode,
    excludeParticipantId,
    excludeDeviceId,
  });

  if (uniqueEntries.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const url = `/tournament/${tournamentId}`;
  const tag = `timer-complete-${tournamentId}-${gameId}-level-${levelNumber}`;
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

const sendTimerLevelCompletePushHandler = onCall({ secrets: [webPushPrivateKey] }, async (request) => {
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

  const participantIds = getParticipantIds(game);

  if (!participantIds.includes(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Only game participants can trigger timer notifications.');
  }

  const timerGate = await db.runTransaction(async (transaction) => {
    const freshTournamentSnap = await transaction.get(tournamentRef);

    if (!freshTournamentSnap.exists) {
      throw new HttpsError('not-found', 'Tournament not found.');
    }

    const freshTournament = freshTournamentSnap.data();
    const freshGames = Array.isArray(freshTournament.games) ? freshTournament.games : [];
    const freshGameIndex = freshGames.findIndex((entry) => entry.id === gameId);

    if (freshGameIndex === -1) {
      throw new HttpsError('not-found', 'Game not found.');
    }

    const freshGame = freshGames[freshGameIndex];
    if (freshGame?.lastTimerPushLevel === levelNumber) {
      return { skipped: true };
    }

    const updatedGames = freshGames.map((entry, index) => (
      index === freshGameIndex
        ? {
            ...entry,
            lastTimerPushLevel: levelNumber,
            lastTimerPushSentAt: Date.now(),
          }
        : entry
    ));

    transaction.update(tournamentRef, {
      games: updatedGames,
    });

    return { skipped: false };
  });

  if (timerGate.skipped) {
    logger.info('Timer notification skipped because this level was already sent', {
      tournamentId,
      gameId,
      levelNumber,
      triggeredBy: request.auth.uid,
    });

    return {
      successCount: 0,
      failureCount: 0,
      skipped: true,
    };
  }

  const { successCount, failureCount } = await sendTimerNotificationsToParticipants({
    tournamentRef,
    tournamentId,
    gameId,
    game,
    levelNumber,
    mode,
    excludeParticipantId: request.auth.uid,
    excludeDeviceId,
  });

  return {
    successCount,
    failureCount,
  };
});

exports.sendTimerLevelCompletePush = sendTimerLevelCompletePushHandler;
exports.sendTimerLevelCompletePushV2 = sendTimerLevelCompletePushHandler;

exports.syncTimerPushSchedule = onDocumentUpdated('tournaments/{tournamentId}', async (event) => {
  const tournamentId = event.params.tournamentId;
  const afterData = event.data?.after.data();

  if (!afterData) {
    return;
  }

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const games = Array.isArray(afterData.games) ? afterData.games : [];

  for (const game of games) {
    const desiredSchedule = getDesiredTimerSchedule(tournamentId, game);

    if (!desiredSchedule) {
      if (!game?.timerNotificationTaskId && game?.timerNotificationScheduledFor == null && game?.timerNotificationLevel == null) {
        continue;
      }

      await deleteTimerTask(game.timerNotificationTaskId);
      await updateTournamentGame(tournamentRef, game.id, (currentGame) => {
        if (!currentGame?.timerNotificationTaskId && currentGame?.timerNotificationScheduledFor == null && currentGame?.timerNotificationLevel == null) {
          return currentGame;
        }

        return clearTimerScheduleMetadata(currentGame);
      });
      continue;
    }

    const scheduleAlreadySynced = game.timerNotificationTaskId === desiredSchedule.taskId
      && game.timerNotificationScheduledFor === desiredSchedule.scheduledFor
      && game.timerNotificationLevel === desiredSchedule.levelNumber;

    if (scheduleAlreadySynced) {
      continue;
    }

    if (game.timerNotificationTaskId && game.timerNotificationTaskId !== desiredSchedule.taskId) {
      await deleteTimerTask(game.timerNotificationTaskId);
    }

    try {
      await enqueueTimerTask({
        tournamentId,
        gameId: game.id,
        desiredSchedule,
      });
    } catch (error) {
      logger.error('Failed to enqueue timer task', error, {
        tournamentId,
        gameId: game.id,
        taskId: desiredSchedule.taskId,
      });
      continue;
    }

    await updateTournamentGame(tournamentRef, game.id, (currentGame) => {
      const currentDesiredSchedule = getDesiredTimerSchedule(tournamentId, currentGame);

      if (!currentDesiredSchedule || currentDesiredSchedule.taskId !== desiredSchedule.taskId) {
        return currentGame;
      }

      return applyTimerScheduleMetadata(currentGame, desiredSchedule);
    });
  }
});

exports.dispatchScheduledTimerPush = onTaskDispatched({
  secrets: [webPushPrivateKey],
  retryConfig: { maxAttempts: 1 },
  rateLimits: { maxConcurrentDispatches: 20 },
}, async (request) => {
  const {
    tournamentId,
    gameId,
    levelNumber,
    levelStartTime,
    taskId,
    mode = 'prod',
  } = request.data || {};

  if (!tournamentId || !gameId || !Number.isInteger(levelNumber) || !Number.isInteger(levelStartTime) || !taskId) {
    logger.error('Scheduled timer push received invalid payload', { data: request.data });
    return;
  }

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();

  if (!tournamentSnap.exists) {
    logger.warn('Scheduled timer push skipped because tournament was not found', {
      tournamentId,
      gameId,
      taskId,
    });
    return;
  }

  const tournament = tournamentSnap.data();
  const game = Array.isArray(tournament.games)
    ? tournament.games.find((entry) => entry.id === gameId)
    : null;

  if (!game) {
    logger.warn('Scheduled timer push skipped because game was not found', {
      tournamentId,
      gameId,
      taskId,
    });
    return;
  }

  const desiredSchedule = getDesiredTimerSchedule(tournamentId, game);
  const isStillCurrentSchedule = desiredSchedule
    && desiredSchedule.taskId === taskId
    && desiredSchedule.levelNumber === levelNumber
    && desiredSchedule.levelStartTime === levelStartTime;

  if (!isStillCurrentSchedule) {
    await updateTournamentGame(tournamentRef, gameId, (currentGame) => {
      if (currentGame?.timerNotificationTaskId !== taskId) {
        return currentGame;
      }

      return clearTimerScheduleMetadata(currentGame);
    });

    logger.info('Scheduled timer push skipped because game state changed', {
      tournamentId,
      gameId,
      taskId,
      levelNumber,
    });
    return;
  }

  const { successCount, failureCount } = await sendTimerNotificationsToParticipants({
    tournamentRef,
    tournamentId,
    gameId,
    game,
    levelNumber,
    mode,
  });

  await updateTournamentGame(tournamentRef, gameId, (currentGame) => {
    const currentDesiredSchedule = getDesiredTimerSchedule(tournamentId, currentGame);

    if (currentDesiredSchedule && currentDesiredSchedule.taskId !== taskId) {
      return currentGame;
    }

    return {
      ...clearTimerScheduleMetadata(currentGame),
      lastTimerPushLevel: levelNumber,
      lastTimerPushSentAt: Date.now(),
      lastTimerPushKey: taskId,
    };
  });

  logger.info('Scheduled timer push completed', {
    tournamentId,
    gameId,
    levelNumber,
    taskId,
    successCount,
    failureCount,
  });
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
