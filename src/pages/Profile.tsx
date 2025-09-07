import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTestDb, canUseTestDb } from '../lib/firebase';

const Profile: React.FC = () => {
  const { user, setNickname, isLoading: authLoading } = useAuthStore();
  // Removed tournament and team store hooks as they are no longer needed for stats

  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [isSavingNickname, setIsSavingNickname] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Initialize nickname input when user data is available
  useEffect(() => {
    if (user?.nickname) {
      setNicknameInput(user.nickname);
    }
  }, [user?.nickname]);

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

      {/* Developer Section - Conditionally Rendered */}
      {user?.isDev && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-lg shadow mt-8">
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
        </div>
      )}
      {/* Removed Statistics Section */}
    </div>
  );
};

export default Profile;
