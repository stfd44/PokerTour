import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { CreateTournament } from './components/tournament/CreateTournament';
import { TournamentList } from './components/tournament/TournamentList';
import { TournamentGames } from './components/tournament/TournamentGames';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from './store/tournamentStore';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto">
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-poker-black mb-4">
          Bienvenue sur PokerTour
        </h1>
        <p className="text-xl text-gray-600">
          Organisez et gérez vos tournois de poker comme un professionnel
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-bold text-poker-red mb-4">
            Créer un Tournoi
          </h2>
          <p className="text-gray-600 mb-4">
            Configurez rapidement votre prochain tournoi avec notre interface intuitive
          </p>
          <button 
            onClick={() => navigate('/create-tournament')}
            className="bg-poker-red text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Commencer
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-2xl font-bold text-poker-gold mb-4">
            Rejoindre un Tournoi
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
    </div>
  );
}

export default function App() {
  const fetchTournaments = useTournamentStore(state => state.fetchTournaments);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  return (
    <Router>
      <div className="min-h-screen bg-poker-light">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-tournament" element={<CreateTournament />} />
            <Route path="/tournaments" element={<TournamentList />} />
            <Route path="/tournament/:tournamentId" element={<TournamentGames />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}