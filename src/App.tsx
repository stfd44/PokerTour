import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import React, { useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { MainLayout } from './pages/MainLayout';
import { Header } from './components/layout/Header';
import { AppAtmosphere } from './components/layout/AppAtmosphere';
import { PageTransition } from './components/layout/PageTransition';
// Teams is now routed within MainLayout
import { useAuthStore } from './store/useAuthStore';
// Stats is now routed within MainLayout
// Profile is now routed within MainLayout
// Tournaments is now routed within MainLayout
import { useTeamStore } from './store/useTeamStore';
import { useTournamentStore } from './store/tournamentStore'; // Import tournament store
import { NicknamePrompt } from './components/NicknamePrompt';
import { initializeTimerAlarmUnlock } from './lib/timerAlarm';
import { registerTimerNotificationServiceWorker } from './lib/timerNotifications';
import { ensurePushRegistration, getPushNotificationPermission, initializeForegroundPushListener, isPushSupported } from './lib/pushNotifications';

function App() {
  // Get user, setUser, isLoading, and requiresNickname from the store
  const { user, setUser, isLoading, requiresNickname } = useAuthStore();
  const { fetchTeams } = useTeamStore();

  useEffect(() => {
    initializeTimerAlarmUnlock();
    if (isPushSupported()) {
      void registerTimerNotificationServiceWorker();
    }
    void initializeForegroundPushListener();
  }, []);

  useEffect(() => {
    if (!user?.uid || getPushNotificationPermission() !== 'granted') {
      return;
    }

    void ensurePushRegistration(user.uid);
  }, [user?.uid]);

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

  const appContent = (() => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-screen text-poker-gold">
          Chargement...
        </div>
      );
    }

    if (user && requiresNickname) {
      return <NicknamePrompt />;
    }

    return (
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/*"
          element={
            user ? (
              <div className="min-h-screen">
                <Header />
                <MainLayout />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    );
  })();

  return (
    <>
      <AppAtmosphere />
      <PageTransition />
      <div className="relative z-10 min-h-screen">{appContent}</div>
    </>
  );
}

export default App;
