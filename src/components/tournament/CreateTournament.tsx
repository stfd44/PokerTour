// src/components/tournament/CreateTournament.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, X, UserPlus } from 'lucide-react'; // Import X and UserPlus icons
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useAuthStore } from '../../store/useAuthStore';

export function CreateTournament() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { addTournament, fetchTournaments } = useTournamentStore();
    const { teams, fetchTeams } = useTeamStore();
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        buyin: '',
        maxPlayers: '',
        location: '',
        teamId: '', // Add teamId to formData
    });
    const [currentGuest, setCurrentGuest] = useState(''); // State for guest input
    const [guests, setGuests] = useState<string[]>([]); // State for list of guests

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleAddGuest = () => {
        if (currentGuest.trim() && !guests.includes(currentGuest.trim())) {
            setGuests([...guests, currentGuest.trim()]);
            setCurrentGuest(''); // Clear input after adding
        } else if (guests.includes(currentGuest.trim())) {
            alert('Ce nom est déjà dans la liste des invités.');
        }
    };

    const handleRemoveGuest = (guestToRemove: string) => {
        setGuests(guests.filter(guest => guest !== guestToRemove));
    };

    // Ensure guests are passed correctly in handleSubmit
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.teamId) {
            alert("Veuillez sélectionner une équipe.");
            return;
        }
        if (user) {
            addTournament(
                {
                  name: formData.name,
                  date: formData.date,
                  buyin: Number(formData.buyin),
                  maxPlayers: Number(formData.maxPlayers),
                  location: formData.location,
                  teamId: formData.teamId,
                },
                user.uid,
                formData.teamId, // Pass teamId to addTournament
                guests // Pass the list of guests
            ).then(() => {
                fetchTournaments(user.uid); // Fetch tournaments for the specific user might be incorrect if based on teams? Check fetchTournaments logic. Assuming it fetches based on teams now.
                navigate('/tournaments'); // Navigate back to the list
            });
          }    
      };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    return (
        <div className="max-w-2xl mx-auto">
            <button
                onClick={() => navigate('/tournaments')}
                className="flex items-center text-poker-black hover:text-poker-red mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour
            </button>

            <div className="bg-white rounded-lg shadow-md p-8">
                <h1 className="text-3xl font-bold text-poker-black mb-6">
                    Créer un nouveau tournoi
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Nom du tournoi
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="Ex: Tournoi du Vendredi"
                        />
                    </div>

                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                            Date
                        </label>
                        <input
                            type="datetime-local"
                            id="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label htmlFor="buyin" className="block text-sm font-medium text-gray-700 mb-1">
                            Buy-in (€)
                        </label>
                        <input
                            type="number"
                            id="buyin"
                            value={formData.buyin}
                            onChange={handleChange}
                            required
                            min="0"
                            step="5"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="20"
                        />
                    </div>

                    <div>
                        <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre maximum de joueurs
                        </label>
                        <input
                            type="number"
                            id="maxPlayers"
                            value={formData.maxPlayers}
                            onChange={handleChange}
                            required
                            min="2"
                            max="100"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="9"
                        />
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                            Lieu
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                            placeholder="Ex: 123 rue du Poker"
                        />
                    </div>

                    <div>
                        <label htmlFor="teamId" className="block text-sm font-medium text-gray-700 mb-1">
                            Équipe
                        </label>
                        <select
                            id="teamId"
                            value={formData.teamId}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                        >
                            <option value="">Sélectionner une équipe</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Guest Management Section */}
                    <div className="border-t pt-6 mt-6">
                        <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                            Ajouter un invité (optionnel)
                        </label>
                        {/* Correctly wrap input and button */}
                        <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    id="guestName"
                                value={currentGuest}
                                onChange={(e) => setCurrentGuest(e.target.value)}
                                className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-poker-red focus:border-transparent"
                                placeholder="Nom de l'invité"
                            />
                            {/* Correctly wrap only the button */}
                            <div>
                                <button
                                    type="button"
                                    onClick={handleAddGuest}
                                    // Match visible Edit button style (flex, padding, font)
                                    className="bg-poker-blue hover:bg-blue-700 text-white font-bold py-2 px-2 rounded flex items-center"
                                    aria-label="Ajouter l'invité"
                                >
                                    <UserPlus className="h-4 w-4" /> {/* Match icon size */}
                                </button>
                            </div>
                        </div>
                        {guests.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h3 className="text-xs font-medium text-gray-500 uppercase">Invités ajoutés :</h3>
                                <ul className="list-none p-0 m-0 space-y-1">
                                    {guests.map((guest, index) => (
                                        <li key={index} className="flex justify-between items-center bg-gray-100 px-3 py-1 rounded text-sm">
                                            <span>{guest}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveGuest(guest)}
                                                className="text-red-500 hover:text-red-700"
                                                aria-label={`Retirer ${guest}`}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>


                    <button
                        type="submit"
                        className="w-full bg-poker-red text-white py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
                    >
                        Créer le tournoi
                    </button>
                </form>
            </div>
        </div>
    );
}
