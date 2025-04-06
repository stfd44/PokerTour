// src/pages/Home.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore, Tournament } from '../store/tournamentStore';
import { Calendar, Users, MapPin, PlayCircle, Trophy, Plus, Trash2 } from 'lucide-react';
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';

const Home: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { fetchTournaments, tournaments, deleteTournament } = useTournamentStore();
    const { teams } = useTeamStore();

    useEffect(() => {
        if (user) {
            fetchTournaments(user.uid);
        }
    }, [fetchTournaments, user, teams]);

    // Filter and sort upcoming tournaments
    const upcomingTournaments = tournaments
        .filter((tournament: Tournament) => tournament.status === 'scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

    // Filter the user's tournament
    const userTournaments = tournaments.filter((tournament: Tournament) => {
        const isUserRegistered = tournament.registrations.some((p) => p.id === user?.uid);
        const isUserInTeam = teams.some(team => team.id === tournament.teamId);
        return isUserRegistered && isUserInTeam;
    });

    const handleDeleteTournament = async (tournamentId: string) => {
        if (user && window.confirm("Êtes-vous sûr de vouloir supprimer ce tournoi ?")) {
            try {
                await deleteTournament(tournamentId, user.uid);
                fetchTournaments(user.uid);
            } catch (error) {
                console.error('Error deleting tournament:', error);
                alert((error as Error).message);
            }
        }
    };

    const handleCreateTournament = () => {
        navigate('/app/create-tournament', { state: { userId: user?.uid } });
    };

    const TournamentCard = ({ tournament }: { tournament: Tournament }) => (
        <div key={tournament.id} className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
            <div>
                <h3 className="font-semibold text-lg">{tournament.name}</h3>
                <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(tournament.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.location}</span>
                    <Users className="w-4 h-4" />
                    <span>{tournament.registrations.length} / {tournament.maxPlayers}</span>
                </div>
            </div>
            <div className='flex items-center'>
                <button
                    onClick={() => navigate('/tournaments')}
                    className="bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors mr-2"
                >
                    <PlayCircle className='w-4 h-4 mr-2' /> Rejoindre
                </button>
                {user?.uid === tournament.creatorId && (
                    <button
                        onClick={() => handleDeleteTournament(tournament.id)}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded flex items-center"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-poker-light">
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    {/* Welcome Section */}
                    <section className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-poker-black mb-4">
                            Bienvenue sur PokerTour
                        </h1>
                        <p className="text-xl text-gray-600">
                            Organisez et gérez vos tournois de poker comme un professionnel
                        </p>
                    </section>

                    {/* Main Actions */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {/* Create Tournament */}
                        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <h2 className="text-2xl font-bold text-poker-red mb-4 flex items-center">
                                <Plus className="w-6 h-6 mr-2" /> Créer un Tournoi
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Configurez rapidement votre prochain tournoi avec notre interface intuitive
                            </p>
                            <button
                                onClick={handleCreateTournament}
                                className="bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
                            >
                                Commencer
                            </button>
                        </div>

                        {/* Join Tournament */}
                        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <h2 className="text-2xl font-bold text-poker-gold mb-4 flex items-center">
                                <Users className="w-6 h-6 mr-2" /> Rejoindre un Tournoi
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Participez à des tournois existants et suivez vos performances
                            </p>
                            <button
                                onClick={() => navigate('/tournaments')}
                                className="bg-poker-gold text-white px-6 py-2 rounded-md hover:bg-yellow-600 transition-colors"
                            >
                                Voir les tournois
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Tournaments */}
                    {upcomingTournaments.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-poker-black mb-4 flex items-center">
                                <Calendar className="w-6 h-6 mr-2" /> Prochains Tournois
                            </h2>
                            <div className="grid gap-4">
                                {upcomingTournaments.map((tournament: Tournament) => (
                                    <TournamentCard tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* User's Tournaments */}
                    {userTournaments.length > 0 && user && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-poker-black mb-4 flex items-center">
                                <Trophy className="w-6 h-6 mr-2" /> Mes Tournois
                            </h2>
                            <div className="grid gap-4">
                                {userTournaments.map((tournament: Tournament) => (
                                    <TournamentCard tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Home;
