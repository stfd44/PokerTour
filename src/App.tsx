import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import Teams from './pages/Teams/Teams';
import { useAuthStore } from './store/useAuthStore';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import { useTeamStore } from './store/useTeamStore';

function App() {
  const { user, setUser } = useAuthStore();
  const { fetchTeams } = useTeamStore();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchTeams();
      }
    });
    return () => unsubscribe();
  }, [setUser, fetchTeams]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/*"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <MainLayout user={user} />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/teams"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header user={user} />
                <Teams user={user} />
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
                <Tournaments user={user} />
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
                <Stats user={user} />
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
                <Profile user={user} />
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
