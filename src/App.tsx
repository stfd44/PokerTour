import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
// Teams is now routed within MainLayout
import { useAuthStore } from './store/useAuthStore';
// Stats is now routed within MainLayout
// Profile is now routed within MainLayout
// Tournaments is now routed within MainLayout
import { useTeamStore } from './store/useTeamStore';
import { useTournamentStore } from './store/tournamentStore'; // Import tournament store
import { NicknamePrompt } from './components/NicknamePrompt';

function App() {
  // Get user, setUser, isLoading, and requiresNickname from the store
  const { user, setUser, isLoading, requiresNickname } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: User | null) => {
      await setUser(currentUser);
      // If user is logged in and has a nickname, fetch teams and then tournaments
      if (currentUser && useAuthStore.getState().user?.nickname) {
        try {
          // Fetch teams first
          await fetchTeams();
          // After teams are fetched, fetch tournaments
          // Note: fetchTournaments relies on the updated team state via getState()
          await useTournamentStore.getState().fetchTournaments(currentUser.uid); // Pass uid as expected
        } catch (error) {
          console.error("Error fetching initial data (teams/tournaments):", error);
          // Handle error appropriately, maybe show a message to the user
        }
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
        {/* The routes for teams, tournaments, stats, profile are now handled within MainLayout */}
      </Routes>
    </>
  );
}

export default App;
