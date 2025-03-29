import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import Teams from './pages/Teams/Teams';
import { useAuthStore } from './store/useAuthStore';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Tournaments from './pages/Tournaments';
import { useTeamStore } from './store/useTeamStore';
import { NicknamePrompt } from './components/NicknamePrompt';

function App() {
  // Get user, setUser, isLoading, and requiresNickname from the store
  const { user, setUser, isLoading, requiresNickname } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      await setUser(currentUser);
      // fetchTeams should be called without arguments, it gets user from the store
      if (currentUser && useAuthStore.getState().user?.nickname) {
        fetchTeams();
      }
    });
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [setUser, fetchTeams]);

  // Use the isLoading state from the store
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // If user is logged in but requires a nickname, show the prompt
  if (user && requiresNickname) {
    return <NicknamePrompt />;
  }

  // Main application routes
  return (
    <>
      <Routes>
        <Route
          path="/login"
          // Redirect to home if user exists (even if nickname is pending, handled above)
          element={user ? <Navigate to="/" /> : <Login />}
        />
        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                {/* Pass the AppUser object */}
                <Header />
                <MainLayout />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
         {/* Update other protected routes similarly */}
             <Route
          path="/teams"
          element={
            user ? (
              <div className="min-h-screen bg-poker-light">
                <Header />
                {/* Pass the user object as a prop */}
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
                <Header />
                {/* Pass the user object as a prop */}
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
                <Header />
                <Stats />
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
                <Header />
                <Profile />
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
