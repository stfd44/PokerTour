import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTestDb, canUseTestDb } from '../lib/firebase';
import {
  enablePushNotifications,
  getLastTimerPushStatus,
  getPushDebugState,
  getPushNotificationPermission,
  removePushRegistration,
  sendPushTestToCurrentDevice,
  type PushDebugState,
} from '../lib/pushNotifications';
import { Bell, BellOff, Settings, Info } from 'lucide-react';

type FirebaseLikeError = Error & {
  code?: string;
  details?: unknown;
};

const Profile: React.FC = () => {
  const { user, setNickname, isLoading: authLoading } = useAuthStore();
  // Removed tournament and team store hooks as they are no longer needed for stats

  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [isSavingNickname, setIsSavingNickname] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [pushDebugState, setPushDebugState] = useState<PushDebugState | null>(null);
  const [pushTestMessage, setPushTestMessage] = useState<string | null>(null);
  const [isRefreshingPushDebug, setIsRefreshingPushDebug] = useState<boolean>(false);
  const [isRunningPushTest, setIsRunningPushTest] = useState<boolean>(false);
  const [isSendingPushNotificationTest, setIsSendingPushNotificationTest] = useState<boolean>(false);
  const [lastTimerPushMessage, setLastTimerPushMessage] = useState<string | null>(null);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState<boolean>(false);

  // Initialize nickname input when user data is available
  useEffect(() => {
    if (user?.nickname) {
      setNicknameInput(user.nickname);
    }
  }, [user?.nickname]);

  useEffect(() => {
    if (!user?.uid) {
      setPushDebugState(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextState = await getPushDebugState(user.uid).catch(() => null);
      if (!cancelled && nextState) {
        setPushDebugState(nextState);
      }
      if (!cancelled) {
        const timerPushStatus = getLastTimerPushStatus();
        if (timerPushStatus) {
          const parts = [
            `Timer push ${timerPushStatus.status}`,
            `niveau ${timerPushStatus.levelNumber}`,
          ];
          if (typeof timerPushStatus.successCount === 'number') {
            parts.push(`success=${timerPushStatus.successCount}`);
          }
          if (typeof timerPushStatus.failureCount === 'number') {
            parts.push(`failure=${timerPushStatus.failureCount}`);
          }
          if (timerPushStatus.message) {
            parts.push(timerPushStatus.message);
          }
          setLastTimerPushMessage(parts.join(' | '));
        } else {
          setLastTimerPushMessage(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Removed useEffect for fetching tournament/team data as it's no longer needed here

  const handleSaveNickname = async () => {
    if (!user || !nicknameInput.trim() || nicknameInput.trim() === user.nickname) {
      setSaveMessage('Aucun changement détecté ou surnom invalide.');
      setTimeout(() => setSaveMessage(null), 3000);
      return;
    }
    setIsSavingNickname(true);
    setSaveMessage(null);
    try {
      await setNickname(nicknameInput.trim());
      setSaveMessage('Surnom mis à jour avec succès !');
    } catch (error) {
      console.error("Error saving nickname:", error);
      setSaveMessage('Erreur lors de la sauvegarde du surnom.');
    } finally {
      setIsSavingNickname(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const refreshPushDebugState = async () => {
    if (!user?.uid) {
      return;
    }

    setIsRefreshingPushDebug(true);
    try {
      const nextState = await getPushDebugState(user.uid);
      setPushDebugState(nextState);
      const timerPushStatus = getLastTimerPushStatus();
      if (timerPushStatus) {
        const parts = [
          `Timer push ${timerPushStatus.status}`,
          `niveau ${timerPushStatus.levelNumber}`,
        ];
        if (typeof timerPushStatus.successCount === 'number') {
          parts.push(`success=${timerPushStatus.successCount}`);
        }
        if (typeof timerPushStatus.failureCount === 'number') {
          parts.push(`failure=${timerPushStatus.failureCount}`);
        }
        if (timerPushStatus.message) {
          parts.push(timerPushStatus.message);
        }
        setLastTimerPushMessage(parts.join(' | '));
      } else {
        setLastTimerPushMessage(null);
      }
    } catch (error) {
      console.error('Error refreshing push debug state:', error);
      setPushTestMessage("Impossible d'actualiser le diagnostic push.");
    } finally {
      setIsRefreshingPushDebug(false);
    }
  };

  const handleRunPushActivationTest = async () => {
    if (!user?.uid) {
      return;
    }

    setIsRunningPushTest(true);
    setPushTestMessage("Test d'activation en cours...");

    try {
      const result = await enablePushNotifications(user.uid);
      const nextState = await getPushDebugState(user.uid).catch(() => null);
      if (nextState) {
        setPushDebugState(nextState);
      }

      const messageByReason: Record<string, string> = {
        registered: 'Notifications actives sur cet appareil.',
        activation_pending: "Activation des notifications toujours en attente dans l'app.",
        unsupported: "Le web push n'est pas pris en charge sur cet appareil.",
        not_configured: "La cle web push n'est pas configuree.",
        invalid_vapid_key: "La cle publique VAPID deployee n'est pas exploitable par le navigateur.",
        permission_timeout: "La permission iOS reste a l'etat default apres la demande.",
        permission_not_granted: "La permission n'a pas ete accordee.",
        permission_denied: "Les notifications sont refusees sur cet appareil.",
        sw_registration_failed: "Le service worker push n'a pas pu etre initialise.",
        subscribe_failed: "Le navigateur n'a pas cree de PushSubscription.",
        save_timeout: "La souscription existe peut-etre, mais Firestore ne repond pas.",
        save_failed: "L'ecriture du device dans Firestore a echoue.",
        unexpected_error: "Une erreur inconnue est survenue pendant le test push.",
      };

      setPushTestMessage(
        result.ok
          ? 'Notifications actives sur cet appareil.'
          : messageByReason[result.reason ?? 'unexpected_error'] ??
              "Une erreur inconnue est survenue pendant le test push."
      );
    } catch (error) {
      console.error('Error running push activation test:', error);
      const details =
        error instanceof Error && error.message
          ? ` (${error.message})`
          : '';
      setPushTestMessage(`Le test push a echoue de facon inattendue.${details}`);
    } finally {
      setIsRunningPushTest(false);
    }
  };

  const handleRemoveLocalPushRegistration = async () => {
    if (!user?.uid) {
      return;
    }

    setIsRunningPushTest(true);
    setPushTestMessage("Suppression de l'abonnement local...");

    try {
      await removePushRegistration(user.uid);
      const nextState = await getPushDebugState(user.uid).catch(() => null);
      if (nextState) {
        setPushDebugState(nextState);
      }
      setPushTestMessage("Abonnement local supprime sur cet appareil.");
    } catch (error) {
      console.error('Error removing local push registration:', error);
      setPushTestMessage("Impossible de supprimer l'abonnement local.");
    } finally {
      setIsRunningPushTest(false);
    }
  };

  const handleSendPushNotificationTest = async () => {
    if (!user?.uid) {
      return;
    }

    setIsSendingPushNotificationTest(true);
    setPushTestMessage("Envoi d'un push test a cet appareil...");

    try {
      const result = await sendPushTestToCurrentDevice();
      const nextState = await getPushDebugState(user.uid).catch(() => null);
      if (nextState) {
        setPushDebugState(nextState);
      }

      if (result.successCount > 0) {
        setPushTestMessage(
          "Push test envoye. Verrouillez l'iPhone juste apres le clic pour verifier l'arrivee sur l'ecran verrouille."
        );
      } else {
        setPushTestMessage("Aucun push test n'a pu etre envoye a cet appareil.");
      }
    } catch (error) {
      console.error('Error sending push notification test:', error);
      const firebaseError = error as FirebaseLikeError;
      const errorCode = firebaseError?.code ?? '';
      const errorMessage = firebaseError?.message ?? '';

      if (errorCode.includes('not-found')) {
        setPushTestMessage("La function de push test n'est probablement pas encore deployee en production.");
      } else if (errorCode.includes('failed-precondition')) {
        setPushTestMessage("Le device existe, mais sa souscription push n'est pas exploitable cote backend.");
      } else if (errorCode.includes('permission-denied')) {
        setPushTestMessage("La function push test a refuse l'appel. Verifiez que vous etes bien connecte.");
      } else if (errorMessage) {
        setPushTestMessage(`Impossible d'envoyer un push test a cet appareil. ${errorMessage}`);
      } else {
        setPushTestMessage("Impossible d'envoyer un push test a cet appareil.");
      }
    } finally {
      setIsSendingPushNotificationTest(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user?.uid || isTogglingNotifications) return;

    setIsTogglingNotifications(true);
    try {
      const isEnabled = Boolean(pushDebugState?.subscriptionFound && pushDebugState?.firestoreDeviceDocFound);
      
      if (isEnabled) {
        await removePushRegistration(user.uid);
      } else {
        const result = await enablePushNotifications(user.uid);
        if (!result.ok) {
          const messageByReason: Record<string, string> = {
            unsupported: "Le web push n'est pas pris en charge sur cet appareil.",
            not_configured: "La clé web push n'est pas configurée.",
            permission_denied: "Les notifications sont bloquées dans votre navigateur.",
            permission_not_granted: "Permission non accordée.",
          };
          setPushTestMessage(messageByReason[result.reason ?? ''] ?? "Échec de l'activation des notifications.");
        }
      }
      
      // Refresh state
      const nextState = await getPushDebugState(user.uid);
      setPushDebugState(nextState);
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  // Removed statistics calculation logic (useMemo hook)

  // Simplified isLoading logic: only rely on authLoading
  const isLoading = authLoading;

  if (isLoading) {
    return <div className="text-center py-12">Chargement du profil...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-red-600">Utilisateur non trouvé. Veuillez vous reconnecter.</div>;
  }

  // Removed overallBalance calculation

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-poker-black mb-6">Profil de {user.nickname || user.displayName}</h1>

      {/* Nickname Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-xl font-semibold text-poker-black mb-4">Changer de Surnom</h2>
        {/* Responsive Nickname Input/Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"> {/* Use gap instead of space-x */}
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="Entrez votre nouveau surnom"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-blue focus:border-poker-blue" // Removed space-x related classes if any
            disabled={isSavingNickname}
          />
          <button
            onClick={handleSaveNickname}
            disabled={isSavingNickname || !nicknameInput.trim() || nicknameInput.trim() === user.nickname}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start" // Added w-full sm:w-auto, justify-center
          >
            {isSavingNickname ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
        {saveMessage && (
          <p className={`mt-2 text-sm ${saveMessage.includes('Erreur') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMessage}
          </p>
        )}
      </div>

      {/* Notifications Section */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-poker-blue" />
            <h2 className="text-xl font-semibold text-poker-black">Notifications Push</h2>
          </div>
          {/* Toggle Switch */}
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={Boolean(pushDebugState?.subscriptionFound && pushDebugState?.firestoreDeviceDocFound)}
              onChange={handleToggleNotifications}
              disabled={isTogglingNotifications || !user?.uid}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-poker-blue/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-poker-blue"></div>
          </label>
        </div>

        <p className="text-gray-600 mb-4 text-sm">
          Recevez des alertes en temps réel pour les fins de niveaux et les événements importants de vos tournois.
        </p>

        {/* Status Info */}
        <div className="flex flex-col space-y-2 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm">
            <span className="text-gray-500 mr-2">État :</span>
            {isTogglingNotifications ? (
              <span className="text-poker-blue animate-pulse">Mise à jour...</span>
            ) : pushDebugState?.subscriptionFound && pushDebugState?.firestoreDeviceDocFound ? (
              <span className="text-green-600 font-medium flex items-center">
                <Bell className="w-4 h-4 mr-1" /> Activées sur cet appareil
              </span>
            ) : (
              <span className="text-gray-500 flex items-center">
                <BellOff className="w-4 h-4 mr-1" /> Désactivées
              </span>
            )}
          </div>
          
          {pushDebugState?.permission === 'denied' && (
            <div className="flex items-start bg-red-50 p-3 rounded text-red-700 text-xs mt-2 font-medium">
              <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                Les notifications sont bloquées par votre navigateur. 
                Veuillez les autoriser dans les paramètres du site pour les activer.
              </p>
            </div>
          )}
          
          {pushDebugState && !pushDebugState.standalone && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
            <div className="flex items-start bg-blue-50 p-3 rounded text-blue-700 text-xs mt-2">
              <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <p>
                Sur iPhone, ajoutez l'application à votre écran d'accueil pour pouvoir recevoir des notifications.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Developer Section - Conditionally Rendered */}
      {user?.isDev && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow mt-8 space-y-6">
          <h2 className="text-xl font-semibold text-poker-black mb-4">Options Développeur</h2>
          <div className="flex items-center space-x-4">
            <label htmlFor="testDbToggle" className="font-medium">
              Utiliser la base de données de test :
            </label>
            <button
              id="testDbToggle"
              onClick={() => {
                if (useTestDb) {
                  localStorage.removeItem('useTestDb');
                  console.log("Switching to PRODUCTION database on next reload.");
                } else {
                  localStorage.setItem('useTestDb', 'true');
                  console.warn("Switching to TEST database on next reload.");
                }
                window.location.reload();
              }}
              disabled={!canUseTestDb}
              className={`px-4 py-2 rounded font-semibold transition-colors ${
                useTestDb
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              } ${!canUseTestDb ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {useTestDb ? 'Passer en Prod' : 'Passer en Test'}
            </button>
            <span className="text-sm text-gray-600">
              (Rechargement de la page requis)
            </span>
          </div>
           <p className="text-sm mt-2 text-gray-700">
             Actuellement connecté à : <span className="font-bold">{useTestDb ? 'TEST (pokertourdev)' : 'PRODUCTION'}</span>
           </p>

          <div className="bg-white border border-yellow-300 rounded-lg p-4 text-sm text-gray-700 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-poker-black">Tests Push iPhone</h3>
              <p className="mt-1">
                Ce panneau permet de verifier la permission web, la souscription navigateur et la presence du device dans Firestore.
              </p>
              {useTestDb && (
                <p className="mt-2 text-amber-700">
                  Ces tests ne sont fiables qu'en production HTTPS. La base de test locale/dev ne doit pas etre utilisee pour valider le web push iPhone.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={refreshPushDebugState}
                disabled={useTestDb || isRefreshingPushDebug || isRunningPushTest}
                className="rounded bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRefreshingPushDebug ? 'Actualisation...' : 'Actualiser le diagnostic'}
              </button>
              <button
                onClick={handleRunPushActivationTest}
                disabled={useTestDb || isRunningPushTest || isRefreshingPushDebug || isSendingPushNotificationTest}
                className="rounded bg-poker-gold px-4 py-2 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunningPushTest ? 'Test en cours...' : "Tester l'activation push"}
              </button>
              <button
                onClick={handleSendPushNotificationTest}
                disabled={
                  useTestDb ||
                  isRunningPushTest ||
                  isRefreshingPushDebug ||
                  isSendingPushNotificationTest
                }
                className="rounded bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingPushNotificationTest ? 'Envoi...' : 'Envoyer un push test'}
              </button>
              <button
                onClick={handleRemoveLocalPushRegistration}
                disabled={
                  useTestDb ||
                  isRunningPushTest ||
                  isRefreshingPushDebug ||
                  isSendingPushNotificationTest
                }
                className="rounded bg-red-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Supprimer l'abonnement local
              </button>
            </div>

            {pushTestMessage && (
              <p className="text-sm text-gray-700">{pushTestMessage}</p>
            )}

            {lastTimerPushMessage && (
              <p className="text-sm text-gray-700">{lastTimerPushMessage}</p>
            )}

            {pushDebugState && (
              <div className="space-y-1 font-mono text-xs text-gray-600">
                <div>mode: {pushDebugState.mode}</div>
                <div>permission: {pushDebugState.permission}</div>
                <div>supported: {pushDebugState.supported ? 'yes' : 'no'}</div>
                <div>configured: {pushDebugState.configured ? 'yes' : 'no'}</div>
                <div>standalone: {pushDebugState.standalone ? 'yes' : 'no'}</div>
                <div>origin: {pushDebugState.origin ?? 'unknown'}</div>
                <div>sw_scope: {pushDebugState.serviceWorkerScope ?? 'none'}</div>
                <div>sw_ready: {pushDebugState.serviceWorkerReady ? 'yes' : 'no'}</div>
                <div>subscription_found: {pushDebugState.subscriptionFound ? 'yes' : 'no'}</div>
                <div>subscription_endpoint: {pushDebugState.subscriptionEndpoint ?? 'none'}</div>
                <div>device_id: {pushDebugState.deviceId ?? 'none'}</div>
                <div>firestore_device: {pushDebugState.firestoreDeviceDocFound ? 'yes' : 'no'}</div>
                <div>last_status: {pushDebugState.lastStatus?.reason ?? 'none'}</div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Removed Statistics Section */}
    </div>
  );
};

export default Profile;
