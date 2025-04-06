import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore, Tournament } from '../../store/tournamentStore';
import { useAuthStore } from '../../store/useAuthStore';

export function EditTournament() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tournaments, updateTournament, fetchTournaments } = useTournamentStore();

  const [tournamentData, setTournamentData] = useState<Partial<Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'teamId' | 'creatorNickname'>>>({
    name: '',
    date: '',
    buyin: 0,
    maxPlayers: 0,
    location: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (currentTournament.status !== 'scheduled') {
        setError("Ce tournoi ne peut plus être modifié car il a déjà commencé ou est terminé.");
        setIsLoading(false);
        return;
      }

      // Pre-fill form data
      setTournamentData({
        name: currentTournament.name,
        // Format date for input type="datetime-local" (YYYY-MM-DDTHH:mm)
        date: currentTournament.date ? new Date(currentTournament.date).toISOString().slice(0, 16) : '',
        buyin: currentTournament.buyin,
        maxPlayers: currentTournament.maxPlayers,
        location: currentTournament.location,
      });
      setIsLoading(false);
    } else if (tournaments.length > 0) {
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm"
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
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-poker-gold focus:border-poker-gold sm:text-sm"
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-gold"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-poker-gold hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-poker-gold"
          >
            Enregistrer les modifications
          </button>
        </div>
      </form>
    </div>
  );
}
