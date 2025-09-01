// src/pages/Home.tsx
import React from 'react'; // Removed useEffect import
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../store/tournamentStore';
import type { Tournament } from '../store/types/tournamentTypes'; // Removed unused Player import
import { Calendar, Users, MapPin, PlayCircle, Trophy, Plus } from 'lucide-react'; // Removed Trash2 import
import { useTeamStore } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';

const Home: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    // Removed deleteTournament from store destructuring as it's not used here anymore
    // Tournament fetching is now handled in App.tsx after team fetching
    const { tournaments } = useTournamentStore();
    const { teams } = useTeamStore();

    // Removed useEffect hook for fetching tournaments

    // Filter and sort upcoming tournaments
    const upcomingTournaments = tournaments
        .filter((tournament: Tournament) => tournament.status === 'scheduled')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3);

    // Removed userTournaments filter as it's no longer used

    // Filter recent tournaments for the user's team
    const recentTournaments = tournaments
        .filter((tournament: Tournament) => {
            const isInUserTeam = teams.some(team => team.id === tournament.teamId);
            const isRecentStatus = ['in_progress', 'ended'].includes(tournament.status);
            return isInUserTeam && isRecentStatus;
        })
        .map(tournament => {
            // Find the last ended game to use as the actual tournament end date
            const lastEndedGame = tournament.games
                .filter(game => game.status === 'ended')
                .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))[0];
            
            return {
                ...tournament,
                actualEndDate: lastEndedGame ? lastEndedGame.endedAt : new Date(tournament.date).getTime()
            };
        })
        .sort((a, b) => (b.actualEndDate || 0) - (a.actualEndDate || 0))
        .slice(0, 3);

    // Removed handleDeleteTournament function as it's no longer used here

    const handleCreateTournament = () => {
        navigate('/app/create-tournament', { state: { userId: user?.uid } });
    };

    const TournamentCard = ({ tournament }: { tournament: Tournament }) => {
        const getButtonProps = (status: 'scheduled' | 'in_progress' | 'ended') => {
            switch (status) {
                case 'ended':
                    return {
                        label: 'Voir le résumé',
                        icon: <Trophy className='w-4 h-4 mr-2' />,
                        className: "bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors flex items-center justify-center sm:justify-start w-full sm:w-auto"
                    };
                case 'in_progress':
                    return {
                        label: 'Accéder',
                        icon: <PlayCircle className='w-4 h-4 mr-2' />,
                        className: "bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center justify-center sm:justify-start w-full sm:w-auto"
                    };
                case 'scheduled':
                default:
                    return {
                        label: 'Rejoindre',
                        icon: <PlayCircle className='w-4 h-4 mr-2' />,
                        className: "bg-poker-gold text-white px-4 py-2 rounded hover:bg-yellow-600 transition-colors flex items-center justify-center sm:justify-start w-full sm:w-auto"
                    };
            }
        };

        const buttonProps = getButtonProps(tournament.status);

        return (
            // Responsive Card Layout: stack vertically below sm, row sm and up
            <div key={tournament.id} className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                {/* Details Section */}
                <div className="min-w-0"> {/* Allow shrinking */}
                    <h3 className="font-semibold text-lg">{tournament.name}</h3>
                    {/* Responsive Details Row: wrap items */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-600 text-sm"> {/* Use text-sm for smaller text */}
                        <span className="flex items-center shrink-0"><Calendar className="w-4 h-4 mr-1" /> {new Date(tournament.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        <span className="flex items-center shrink-0"><MapPin className="w-4 h-4 mr-1" /> {tournament.location}</span>
                        <span className="flex items-center shrink-0"><Users className="w-4 h-4 mr-1" /> {tournament.registrations.length} / {tournament.maxPlayers}</span>
                    </div>
                </div>
                {/* Button Section: stack vertically, align end on sm+ */}
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto'>
                    <button
                        onClick={() => navigate(`/tournament/${tournament.id}`)} // Navigate to the specific tournament page
                        className={buttonProps.className}
                    >
                        {buttonProps.icon} {buttonProps.label}
                    </button>
                    {/* Delete button removed from Home page card */}
                </div>
            </div>
        );
    }

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

                    {/* Guidance Message */}
                    {teams.length === 0 && (
                        <section className="mb-8 p-4 bg-blue-100 border border-blue-300 rounded-lg text-center">
                            <p className="text-blue-800">
                                Vous ne faites partie d'aucune équipe pour le moment.
                            </p>
                            <p className="text-blue-700 mt-2">
                                Pour participer ou organiser des tournois, commencez par{' '}
                                <button onClick={() => navigate('/teams')} className="text-blue-900 font-semibold underline hover:text-blue-700">
                                    rejoindre une équipe ou en créer une
                                </button>.
                            </p>
                        </section>
                    )}

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
                                    <TournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Recent Tournaments */}
                    {recentTournaments.length > 0 && user && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-poker-black mb-4 flex items-center">
                                <Trophy className="w-6 h-6 mr-2" /> Tournois Récents
                            </h2>
                            <div className="grid gap-4">
                                {recentTournaments.map((tournament: Tournament) => (
                                    <TournamentCard key={tournament.id} tournament={tournament} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* User's Tournaments section removed as per user request */}
                </div>
            </main>
        </div>
    );
};

export default Home;
