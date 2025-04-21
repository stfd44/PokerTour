import React, { useState, useEffect, useRef, useMemo } from 'react'; // Removed useCallback
import { Clock, Play, Pause, SkipForward } from 'lucide-react';
import type { Game, Blinds } from '../../store/types/tournamentTypes'; // Corrected import path for types
import { useTournamentStore } from '../../store/tournamentStore';
// Removed incorrect Button import

interface GameTimerProps {
  game: Game;
  isCurrentUserParticipant: boolean; // Add prop to indicate participation
}

// Helper to format milliseconds into MM:SS
const formatTime = (ms: number): string => {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export function GameTimer({ game, isCurrentUserParticipant }: GameTimerProps) { // Destructure the new prop
  const { pauseTimer, resumeTimer, advanceBlindLevel } = useTournamentStore(
    (state) => ({
      pauseTimer: state.pauseTimer,
      resumeTimer: state.resumeTimer,
      advanceBlindLevel: state.advanceBlindLevel,
    })
  );

  // Select relevant game state directly from the store
  // This ensures the component re-renders when these specific values change
  const {
    isPaused,
    status,
    remainingTimeOnPause,
    levelStartTime,
    currentLevel,
    blindLevels, // Needed for levelDurationMs calculation
    blinds // Needed for current/next blinds calculation
  } = useTournamentStore(state => {
    const tournament = state.tournaments.find(t => t.id === game.tournamentId);
    const currentGame = tournament?.games.find(g => g.id === game.id);
    // Return default/initial values if game not found to prevent errors
    return {
      isPaused: currentGame?.isPaused ?? false,
      status: currentGame?.status ?? 'pending',
      remainingTimeOnPause: currentGame?.remainingTimeOnPause ?? null,
      levelStartTime: currentGame?.levelStartTime ?? 0,
      currentLevel: currentGame?.currentLevel ?? 0,
      blindLevels: currentGame?.blindLevels ?? 10, // Default blind level duration
      blinds: currentGame?.blinds ?? { small: 0, big: 0 } // Default blinds
    };
  });

  const [displayTime, setDisplayTime] = useState<string>('--:--');
  const [isLevelComplete, setIsLevelComplete] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Calculate levelDurationMs based on selected state
  const levelDurationMs = useMemo(() => blindLevels * 60 * 1000, [blindLevels]);

  // Function to calculate blinds for a given level index
  const calculateBlindsForLevel = (levelIndex: number): Blinds => {
    return {
      small: game.blinds.small * Math.pow(2, levelIndex),
      big: game.blinds.big * Math.pow(2, levelIndex),
    };
  };

  // Calculate blinds based on selected state
  const currentBlinds = useMemo(() => calculateBlindsForLevel(currentLevel), [currentLevel, blinds]);
  const nextBlinds = useMemo(() => calculateBlindsForLevel(currentLevel + 1), [currentLevel, blinds]);

  useEffect(() => {
    // Use selected state values in logs and logic
    console.log(`[Effect Run] Game ID: ${game.id}, Status: ${status}, Paused: ${isPaused}, StartTime: ${levelStartTime}, RemainingOnPause: ${remainingTimeOnPause}`);

    // Timer logic encapsulated within useEffect
    const tick = () => {
      // Re-check conditions inside tick using selected state
      if (isPaused || !levelStartTime || status !== 'in_progress') {
        console.log(`[Tick Stop Condition] Paused: ${isPaused}, StartTime: ${levelStartTime}, Status: ${status}`);
        stopInterval();
        return;
      }

      const now = Date.now();
      const elapsedInLevel = now - levelStartTime; // Use selected levelStartTime
      const timeRemaining = levelDurationMs - elapsedInLevel;

      if (timeRemaining <= 0) {
        setDisplayTime('0:00');
        setIsLevelComplete(true);
        stopInterval(); // Stop interval when level completes
      } else {
        setDisplayTime(formatTime(timeRemaining));
        setIsLevelComplete(false);
        // Interval continues automatically
      }
      // Use game.id for logging consistency if needed, but logic uses selected state
      console.log(`[Tick] Game ID: ${game.id}, Time Remaining: ${timeRemaining}`);
    };

    // Function to start the interval
    const startInterval = () => {
      console.log(`[StartInterval] Game ID: ${game.id}`);
      stopInterval(); // Clear any existing interval before starting anew
      tick(); // Run tick immediately for instant UI update
      intervalRef.current = setInterval(tick, 500); // Update every 500ms
    };

    // Function to stop the interval
    const stopInterval = () => {
      if (intervalRef.current) {
        console.log(`[StopInterval] Clearing interval for Game ID: ${game.id}`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else {
        // console.log(`[StopInterval] No interval to clear for Game ID: ${game.id}`);
      }
    };

    // --- Effect Logic ---
    // Use selected state values for conditions
    if (status !== 'in_progress') {
      console.log(`[Effect Logic] Game ${game.id} not in progress (Status: ${status}). Stopping timer.`);
      stopInterval();
      setDisplayTime('--:--');
      setIsLevelComplete(false);
      return; // Exit effect early
    }

    if (isPaused) {
      console.log(`[Effect Logic] Game ${game.id} is paused. Stopping timer.`);
      stopInterval(); // Explicitly stop interval
      setIsLevelComplete(false);
      if (remainingTimeOnPause !== null) {
        console.log(`[Effect Logic] Setting display time from remainingTimeOnPause: ${remainingTimeOnPause}`);
        setDisplayTime(formatTime(remainingTimeOnPause));
      } else {
        console.log(`[Effect Logic] remainingTimeOnPause is null, setting display to 'Paused'.`);
        setDisplayTime('Paused');
      }
    } else {
      console.log(`[Effect Logic] Game ${game.id} is not paused (Status: ${status}). Starting timer.`);
      // Timer should be running
      setIsLevelComplete(false); // Reset completion state if resuming
      startInterval(); // Start the interval
    }

    // Cleanup function: always stop interval on unmount or dependency change
    return stopInterval;

    // Dependencies: React to changes in the selected state values
  }, [
    isPaused,
    status,
    remainingTimeOnPause,
    levelStartTime,
    game.id, // Keep game.id for logging/actions
    game.tournamentId, // Keep tournamentId for actions
    levelDurationMs
  ]);

  // Event handlers remain the same, using game prop for IDs
  const handlePause = () => {
    console.log(`[HandlePause] Clicked for Game ID: ${game.id}`);
    pauseTimer(game.tournamentId, game.id);
  };
  const handleResume = () => {
    console.log(`[HandleResume] Clicked for Game ID: ${game.id}`);
    resumeTimer(game.tournamentId, game.id);
  };
  const handleAdvanceLevel = () => {
    console.log(`[HandleAdvanceLevel] Clicked for Game ID: ${game.id}`);
    advanceBlindLevel(game.tournamentId, game.id);
    // Reset local state immediately for better UX, store will catch up
    setIsLevelComplete(false);
  };

  // Use selected status for conditional rendering
  if (status !== 'in_progress') {
    return <div className="text-center text-gray-500">La partie n'est pas en cours.</div>;
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4 shadow">
      {/* Timer Display and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="w-8 h-8 text-poker-gold mr-3" />
          <div>
            <div className="text-sm text-gray-600">Temps restant niveau</div>
            <div className={`text-3xl font-bold ${isLevelComplete ? 'text-red-600' : ''}`}>
              {displayTime}
            </div>
          </div>
        </div>
        {/* Control Buttons - Only show Pause/Resume if user is participant */}
        <div className="flex items-center space-x-2">
          {isCurrentUserParticipant && !isLevelComplete && ( // Check participation
            <>
              {isPaused ? (
                <button onClick={handleResume} className="p-1 rounded hover:bg-gray-200" aria-label="Reprendre">
                  <Play className="w-6 h-6 text-green-600" />
                </button>
              ) : (
                <button onClick={handlePause} className="p-1 rounded hover:bg-gray-200" aria-label="Pause">
                  <Pause className="w-6 h-6 text-yellow-600" />
                </button>
              )}
            </>
          )}
          {/* Always show Advance Level button if level is complete (assuming anyone can advance?) */}
          {/* If only participants should advance, add isCurrentUserParticipant check here too */}
          {isLevelComplete && (
             <button
               onClick={handleAdvanceLevel}
               className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 inline-flex items-center"
             >
               <SkipForward className="w-4 h-4 mr-2" />
               Niveau Suivant
             </button>
          )}
        </div>
      </div>

      {/* Blinds Information */}
      <div className="border-t pt-4 flex justify-between items-start">
        <div>
          {/* Use selected currentLevel state */}
          <div className="text-sm text-gray-600">Niveau Actuel ({currentLevel + 1})</div>
          <div className="text-xl font-semibold">
            {currentBlinds.small} / {currentBlinds.big}
          </div>
        </div>
        <div className="text-right">
           {/* Use selected currentLevel state */}
          <div className="text-sm text-gray-600">Prochain Niveau ({currentLevel + 2})</div>
          <div className="text-lg text-poker-gold">
            {nextBlinds.small} / {nextBlinds.big}
          </div>
        </div>
      </div>
    </div>
  );
}
