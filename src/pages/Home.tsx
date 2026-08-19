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
        navigate('/tournaments?create=true');
    };

    const TournamentCard = ({ tournament }: { tournament: Tournament }) => {
        const getButtonProps = (status: 'scheduled' | 'in_progress' | 'ended') => {
            switch (status) {
                case 'ended':
                    return {
                        label: 'Voir le résumé',
                        icon: <Trophy className='w-4 h-4 mr-2' />,
                        className: "btn btn-ghost w-full sm:w-auto"
                    };
                case 'in_progress':
                    return {
                        label: 'Accéder',
                        icon: <PlayCircle className='w-4 h-4 mr-2' />,
                        className: "btn btn-green w-full sm:w-auto"
                    };
                case 'scheduled':
                default:
                    return {
                        label: 'Rejoindre',
                        icon: <PlayCircle className='w-4 h-4 mr-2' />,
                        className: "btn btn-gold w-full sm:w-auto"
                    };
            }
        };

        const buttonProps = getButtonProps(tournament.status);

        return (
            // Responsive Card Layout: stack vertically below sm, row sm and up
            <div key={tournament.id} className="glass-card p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                {/* Details Section */}
                <div className="min-w-0"> {/* Allow shrinking */}
                    <h3 className="font-semibold text-lg text-white">{tournament.name}</h3>
                    {/* Responsive Details Row: wrap items */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-300 text-sm"> {/* Use text-sm for smaller text */}
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
        <div>
            <main>
                <div>
                    {/* Welcome Section */}
                    <section className="text-center mb-12">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-md">
                            Bienvenue sur PokerTour
                        </h1>
                        <p className="text-xl text-gray-200">
                            Organisez et gérez vos tournois de poker comme un professionnel
                        </p>
                    </section>

                    {/* Guidance Message */}
                    {teams.length === 0 && (
                        <section className="mb-8 p-4 glass-card text-center">
                            <p className="text-gray-100">
                                Vous ne faites partie d'aucun groupe pour le moment.
                            </p>
                            <p className="text-gray-300 mt-2">
                                Pour participer ou organiser des tournois, commencez par{' '}
                                <button onClick={() => navigate('/teams')} className="text-poker-gold font-semibold underline hover:text-yellow-300">
                                    rejoindre un groupe ou en créer un
                                </button>.
                            </p>
                        </section>
                    )}

                    {/* Main Actions */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {/* Create Tournament */}
                        <div className="glass-card p-6 transition-shadow hover:shadow-2xl">
                            <h2 className="text-2xl font-bold text-poker-red mb-4 flex items-center">
                                <Plus className="w-6 h-6 mr-2" /> Créer un Tournoi
                            </h2>
                            <p className="text-gray-300 mb-4">
                                Configurez rapidement votre prochain tournoi avec notre interface intuitive
                            </p>
                            <button
                                onClick={handleCreateTournament}
                                className="btn btn-red px-6"
                            >
                                Commencer
                            </button>
                        </div>

                        {/* Join Tournament */}
                        <div className="glass-card p-6 transition-shadow hover:shadow-2xl">
                            <h2 className="text-2xl font-bold text-poker-gold mb-4 flex items-center">
                                <Users className="w-6 h-6 mr-2" /> Rejoindre un Tournoi
                            </h2>
                            <p className="text-gray-300 mb-4">
                                Participez à des tournois existants et suivez vos performances
                            </p>
                            <button
                                onClick={() => navigate('/tournaments')}
                                className="btn btn-gold px-6"
                            >
                                Voir les tournois
                            </button>
                        </div>
                    </div>

                    {/* Upcoming Tournaments */}
                    {upcomingTournaments.length > 0 && (
                        <section className="mb-12">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center drop-shadow-sm">
                                <Calendar className="w-6 h-6 mr-2 text-poker-gold" /> Prochains Tournois
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
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center drop-shadow-sm">
                                <Trophy className="w-6 h-6 mr-2 text-poker-gold" /> Tournois Récents
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
