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

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Add a loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Set loading to false once the auth state is known
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
          path="/*"
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
      </Routes>
    </>
  );
}

export default App;
