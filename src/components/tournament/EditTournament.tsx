import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore, Tournament } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';
import { X, UserPlus } from 'lucide-react'; // Import icons

export function EditTournament() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Add guest management actions from the store
  const { tournaments, updateTournament, fetchTournaments, addGuestToTournament, removeGuestFromTournament } = useTournamentStore();

  const [tournamentData, setTournamentData] = useState<Partial<Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'teamId' | 'creatorNickname'>>>({
    name: '',
    date: '',
    buyin: 0,
    maxPlayers: 0,
    location: '',
  });
  const [currentGuest, setCurrentGuest] = useState(''); // State for guest input
  const [guests, setGuests] = useState<string[]>([]); // State for the list of guests
  const [isLoading, setIsLoading] = useState(true); // Overall component loading
  const [isGuestLoading, setIsGuestLoading] = useState(false); // Loading state for guest actions
  const [error, setError] = useState<string | null>(null); // General error
  const [guestError, setGuestError] = useState<string | null>(null); // Specific error for guest actions

  useEffect(() => {
    // Ensure tournaments are fetched if not already present
    if (tournaments.length === 0 && user) {
      fetchTournaments(user.uid);
    }
  }, [fetchTournaments, tournaments.length, user]);

  useEffect(() => {
    if (!tournamentId) {
      setError("ID du tournoi manquant.");
      setIsLoading(false);
      return;
    }

    const currentTournament = tournaments.find(t => t.id === tournamentId);

    if (currentTournament) {
      // Security Check: Ensure the current user is the creator and the tournament is scheduled
      if (currentTournament.creatorId !== user?.uid) {
        setError("Vous n'êtes pas autorisé à modifier ce tournoi.");
        setIsLoading(false);
        return;
      }
      // Allow loading if scheduled or in progress, but block if ended
      if (currentTournament.status === 'ended') {
        setError("Ce tournoi est terminé et ne peut plus être modifié.");
        setIsLoading(false);
        return;
      }
      // Note: We allow loading for 'in_progress', but will disable fields below

      // Pre-fill form data (Moved inside the if(currentTournament) block)
      setTournamentData({
        name: currentTournament.name,
        // Format date for input type="datetime-local" (YYYY-MM-DDTHH:mm)
        date: currentTournament.date ? new Date(currentTournament.date).toISOString().slice(0, 16) : '',
        buyin: currentTournament.buyin,
        maxPlayers: currentTournament.maxPlayers,
        location: currentTournament.location,
      });
      // Set initial guests list
      setGuests(currentTournament.guests || []);
      setIsLoading(false);
    } // <--- Corrected closing brace position for if(currentTournament)
    else if (tournaments.length > 0) {
      // Tournaments are loaded, but this one wasn't found
      setError("Tournoi non trouvé.");
      setIsLoading(false);
    }
    // If tournaments are still loading, isLoading remains true
  }, [tournamentId, tournaments, user?.uid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setTournamentData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // --- Guest Management Handlers ---
  const handleAddGuest = async () => {
    if (!tournamentId || !user || !currentGuest.trim() || isGuestLoading) return;

    const trimmedGuestName = currentGuest.trim();
    const currentTournament = tournaments.find(t => t.id === tournamentId);

    // Check status - Allow adding if scheduled or in progress, but not ended.
    if (currentTournament?.status === 'ended') {
        setGuestError("Les invités ne peuvent pas être ajoutés à un tournoi terminé.");
        return;
    }
    // Check if already exists
    if (guests.includes(trimmedGuestName)) {
        alert('Ce nom est déjà dans la liste des invités.'); // Keep alert for direct feedback
        return;
    }

    setIsGuestLoading(true);
    setGuestError(null); // Clear previous guest error

    try {
      await addGuestToTournament(tournamentId, trimmedGuestName, user.uid);
      // Update local state *after* successful save
      setGuests([...guests, trimmedGuestName]);
      setCurrentGuest(''); // Clear input
    } catch (err) {
      // Use specific guest error state
      setGuestError((err as Error).message || "Erreur lors de l'ajout de l'invité.");
    } finally {
      setIsGuestLoading(false); // Stop loading indicator
    }
  };

  const handleRemoveGuest = async (guestToRemove: string) => {
    if (!tournamentId || !user || isGuestLoading) return;

     const currentTournament = tournaments.find(t => t.id === tournamentId);
     // Check status - Allow removing if scheduled or in progress, but not ended.
     if (currentTournament?.status === 'ended') {
         setGuestError("Les invités ne peuvent pas être retirés d'un tournoi terminé.");
         return;
     }

    setIsGuestLoading(true);
    setGuestError(null); // Clear previous guest error

    try {
      await removeGuestFromTournament(tournamentId, guestToRemove, user.uid);
      // Update local state *after* successful removal
      setGuests(guests.filter(g => g !== guestToRemove));
    } catch (err) {
       // Use specific guest error state
      setGuestError((err as Error).message || "Erreur lors de la suppression de l'invité.");
    } finally {
       setIsGuestLoading(false); // Stop loading indicator
    }
  };
  // --- End Guest Management Handlers ---

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !user) {
      setError("Impossible de soumettre : informations manquantes.");
      return;
    }

    // Convert local datetime string back to a suitable format if needed, e.g., ISO string or timestamp
    const finalData = {
      ...tournamentData,
      date: tournamentData.date ? new Date(tournamentData.date).toISOString() : new Date().toISOString(), // Store as ISO string
    };

    try {
      setError(null); // Clear previous errors
      await updateTournament(tournamentId, user.uid, finalData);
      alert('Tournoi mis à jour avec succès !');
      navigate('/tournaments'); // Redirect back to the list
    } catch (err) {
      console.error("Error updating tournament:", err);
      setError((err as Error).message || "Une erreur est survenue lors de la mise à jour.");
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Chargement des détails du tournoi...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-poker-black">Modifier le Tournoi</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nom du Tournoi</label>
          <input
            type="text"
            id="name"
            name="name"
            value={tournamentData.name}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date et Heure</label>
          <input
            type="datetime-local"
            id="date"
            name="date"
            value={tournamentData.date}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="buyin" className="block text-sm font-medium text-gray-700">Buy-in (€)</label>
          <input
            type="number"
            id="buyin"
            name="buyin"
            value={tournamentData.buyin}
            onChange={handleChange}
            required
            min="0"
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700">Joueurs Max</label>
          <input
            type="number"
            id="maxPlayers"
            name="maxPlayers"
            value={tournamentData.maxPlayers}
            onChange={handleChange}
            required
            min="2"
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm disabled:bg-gray-100"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Lieu</label>
          <input
            type="text"
            id="location"
            name="location"
            value={tournamentData.location}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm disabled:bg-gray-100"
          />
        </div>

        {/* Guest Management Section - Conditionally Rendered based on status */}
        {/* Guest Management Section - Conditionally Rendered based on status */}
        {(tournaments.find(t => t.id === tournamentId)?.status === 'scheduled' || tournaments.find(t => t.id === tournamentId)?.status === 'in_progress') && (
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Gestion des Invités</h3>
                 {/* Display specific guest error */}
                 {guestError && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{guestError}</p>}
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                    Ajouter un invité
                </label>
                <div className="flex items-center space-x-2 mb-4">
                    <input
                        type="text"
                        id="guestName"
                        value={currentGuest}
                        onChange={(e) => setCurrentGuest(e.target.value)}
                        className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-blue focus:border-transparent sm:text-sm"
                        placeholder="Nom de l'invité"
                    />
                    {/* Correctly wrap only the button */}
                    <div>
                        <button
                            type="button"
                            onClick={handleAddGuest}
                            className={`inline-flex items-center justify-center p-2 bg-poker-blue text-white rounded-md hover:bg-blue-700 disabled:opacity-50 ${isGuestLoading ? 'animate-pulse' : ''}`}
                            aria-label="Ajouter l'invité"
                            disabled={!currentGuest.trim() || isGuestLoading} // Disable while loading
                        >
                            {isGuestLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <UserPlus className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                {guests.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-600">Invités actuels :</h4>
                        <ul className="list-none p-0 m-0 space-y-1 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                            {guests.map((guest, index) => (
                                <li key={index} className="flex justify-between items-center bg-white px-3 py-1.5 rounded shadow-sm text-sm">
                                    <span>{guest}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGuest(guest)}
                                        className="text-red-500 hover:text-red-700 ml-2 disabled:opacity-50"
                                        aria-label={`Retirer ${guest}`}
                                        disabled={isGuestLoading} // Disable while loading
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                 {guests.length === 0 && <p className="text-sm text-gray-500 italic">Aucun invité ajouté.</p>}
            </div>
        )}
        {/* End Guest Management Section */}


        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-gold"
          >
            Annuler
          </button>
          {/* Only show Save Changes button if tournament is scheduled */}
          {/* Find current tournament again for button logic, handle potential undefined */}
          {tournaments.find(t => t.id === tournamentId)?.status === 'scheduled' && (
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-poker-gold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-gold"
            >
              Enregistrer les modifications
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
