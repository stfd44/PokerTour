// src/components/tournament/CreateTournament.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
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
                formData.teamId // Pass teamId to addTournament
            ).then(() => {
                fetchTournaments(user.uid);
                navigate('/');
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
