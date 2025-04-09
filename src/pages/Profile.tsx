import React, { useState, useEffect } from 'react'; // Removed useMemo
import { useAuthStore } from '../store/useAuthStore';
// Removed unused imports: useTournamentStore, Tournament, Game, PlayerResult, useTeamStore
// Removed ProfileStats interface

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
        <div className="flex items-center space-x-4">
          <input
            type="text"
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            placeholder="Entrez votre nouveau surnom"
            className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-blue focus:border-poker-blue"
            disabled={isSavingNickname}
          />
          <button
            onClick={handleSaveNickname}
            disabled={isSavingNickname || !nicknameInput.trim() || nicknameInput.trim() === user.nickname}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" // Applied styles similar to Teams.tsx buttons
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
      {/* Removed Statistics Section */}
    </div>
  );
};

export default Profile;
