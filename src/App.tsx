import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Home from './pages/Home';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import { CreateTournament } from './components/tournament/CreateTournament';
import { TournamentList } from './components/tournament/TournamentList';
import { TournamentGames } from './components/tournament/TournamentGames'; // Corrected import
import Teams from './pages/Teams/Teams'; // Import the Teams component
import { useAuthStore } from './store/useAuthStore';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';

function App() {
  const { user, login, setUser } = useAuthStore();
  const [loading, setLoading] = useState<boolean>(true); // Add a loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add a loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />} // Redirect to home if logged in
        />
        <Route
          path="/"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <MainLayout user={user}/>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        {/* Add the route for the Teams page */}
        <Route
          path="/teams"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Teams user={user}/> {/* Pass the user prop to Teams */}
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/tournaments"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Tournaments user={user}/> {/* Pass the user prop to Tournaments */}
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/stats"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Stats user={user}/> {/* Pass the user prop to Stats */}
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Profile user={user}/> {/* Pass the user prop to Profile */}
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;
