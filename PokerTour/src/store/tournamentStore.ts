import { create } from 'zustand';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where } from 'firebase/firestore';
import { useTeamStore } from './useTeamStore'; // Import useTeamStore

// Helper function to specifically clean a Game object for Firestore
// Removes undefined fields, ensuring compatibility.
function cleanGameForFirestore(game: Game): Game {
    const cleanedGame: Game = { ...game }; // Clone the game object

    // Iterate over keys of the Game interface
    (Object.keys(cleanedGame) as Array<keyof Game>).forEach(key => {
        if (cleanedGame[key] === undefined) {
            // Firestore forbids undefined, so delete the key if the value is undefined
            delete cleanedGame[key];
        }
    });

    // Specifically clean the players array
    if (cleanedGame.players) {
        cleanedGame.players = cleanedGame.players.map(player => {
            const cleanedPlayer: Player = { ...player };
            (Object.keys(cleanedPlayer) as Array<keyof Player>).forEach(playerKey => {
                if (cleanedPlayer[playerKey] === undefined) {
                    delete cleanedPlayer[playerKey];
                }
            });
            // Ensure required fields that might become undefined are defaulted if necessary
            // (Though the interface marks them optional, Firestore might require consistency)
             cleanedPlayer.eliminated = cleanedPlayer.eliminated ?? false;
             cleanedPlayer.eliminationTime = cleanedPlayer.eliminationTime ?? null;
            return cleanedPlayer;
        });
    } else {
        cleanedGame.players = []; // Ensure players array exists
    }

     // Clean nested objects only if they exist (no need to check internal required props)
    if (cleanedGame.distributionPercentages) {
        // No need to delete internal required properties like 'first', 'second', 'third'
        // The main loop handles deleting 'distributionPercentages' itself if it were undefined.
        cleanedGame.distributionPercentages = { ...cleanedGame.distributionPercentages }; // Ensure it's a clean copy if needed
    }
     if (cleanedGame.winnings) {
        // No need to delete internal required properties like 'first', 'second', 'third'
        cleanedGame.winnings = { ...cleanedGame.winnings }; // Ensure it's a clean copy if needed
    }

    // Ensure required fields that might become undefined are defaulted
    cleanedGame.currentLevel = cleanedGame.currentLevel ?? 0;
    cleanedGame.levelStartTime = cleanedGame.levelStartTime ?? 0;
    cleanedGame.isPaused = cleanedGame.isPaused ?? false;
    cleanedGame.remainingTimeOnPause = cleanedGame.remainingTimeOnPause ?? null;
    cleanedGame.status = cleanedGame.status ?? 'pending';


    return cleanedGame;
}


export interface Player {
  id: string;
  name: string;
  nickname?: string;
  eliminated?: boolean;
  eliminationTime?: number | null; // Added for tracking elimination time
}

export interface Blinds {
  small: number;
  big: number;
}

export interface Game {
  id: string;
  tournamentId: string;
  startingStack: number;
  blinds: Blinds;
  blindLevels: number;
  players: Player[];
  status: 'pending' | 'in_progress' | 'ended';
  startedAt?: number; // Changed to number (timestamp) for consistency
  currentLevel: number; // Index of the current blind level (starts at 0)
  levelStartTime: number; // Timestamp when the current level started (adjusted for pauses)
  isPaused: boolean; // Is the timer manually paused?
  remainingTimeOnPause: number | null; // Milliseconds remaining when paused
  endedAt?: number | null; // Added for tracking game end time
  // Added fields for prize pool and winnings
  prizePool?: number;
  distributionPercentages?: { first: number; second: number; third: number };
  winnings?: { first: number; second: number; third: number };
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  buyin: number;
  maxPlayers: number;
  location: string;
  registrations: Player[];
  creatorId: string;
  games: Game[];
  status: 'scheduled' | 'in_progress' | 'ended';
  teamId: string; // Add teamId to Tournament interface
}

interface TournamentStore {
  tournaments: Tournament[];
  fetchTournaments: (userId: string) => Promise<void>; // Add userId parameter
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'status'>, userId: string, teamId: string) => Promise<void>; // Add teamId parameter
  deleteTournament: (tournamentId: string, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, player: Player, nickname?: string) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  // Adjusted addGame gameData type to include new fields
  addGame: (tournamentId: string, gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, players: Player[]) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  // New Timer Control Actions
  pauseTimer: (tournamentId: string, gameId: string) => Promise<void>;
  resumeTimer: (tournamentId: string, gameId: string) => Promise<void>;
  advanceBlindLevel: (tournamentId: string, gameId: string) => Promise<void>;
  // New actions for player elimination/reinstatement
  eliminatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  reinstatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
}

// Helper function to find and update a game within the state
const updateGameState = (state: TournamentStore, tournamentId: string, gameId: string, updates: Partial<Game>): Tournament[] => {
  return state.tournaments.map((t) =>
    t.id === tournamentId
      ? {
          ...t,
          games: t.games.map((g) =>
            g.id === gameId ? { ...g, ...updates } : g
          ),
        }
      : t
  );
};

// Removed unused 'get' parameter from create callback
export const useTournamentStore = create<TournamentStore>((set) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async () => { // Add userId parameter
    try {
        const { teams } = useTeamStore.getState(); // Get the teams from useTeamStore
        const userTeams = teams.map(team => team.id); // Get the user's team IDs
        if (userTeams.length === 0) {
            set({ tournaments: [] }); // If the user is not in any team, display no tournament
            return;
        }
        const q = query(collection(db, "tournaments"), where("teamId", "in", userTeams)); // Query tournaments where teamId is in userTeams
        const querySnapshot = await getDocs(q);
        const tournaments: Tournament[] = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Tournament[];
        set({ tournaments });
    } catch (error) {
        handleDatabaseError(error);
    }
  },

  // Adding a Tournament
  addTournament: async (tournamentData, creatorId, teamId) => {
    try {
      const docRef = await addDoc(collection(db, "tournaments"), {
        ...tournamentData,
        registrations: [],
        creatorId: creatorId,
        games: [],
        status: 'scheduled',
        teamId: teamId,
      });
      set((state) => ({
        tournaments: [
          ...state.tournaments,
          {
            id: docRef.id,
            ...tournamentData,
            registrations: [],
            creatorId: creatorId,
            games: [],
            status: 'scheduled',
            teamId: teamId,
          },
        ],
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Tournament
  deleteTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await deleteDoc(tournamentRef);
      set((state) => ({
        tournaments: state.tournaments.filter((t) => t.id !== tournamentId),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Registering to a Tournament
    registerToTournament: async (tournamentId, userId, player, nickname) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userNickname = nickname || (userDoc.exists() ? userDoc.data().nickname : null);
      
      await updateDoc(tournamentRef, {
        registrations: arrayUnion({
          id: player.id,
          name: userNickname || player.name
        }),
      });
      const playerWithNickname = {
        id: player.id,
        name: userNickname || player.name,
        nickname: userNickname || undefined
      };
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: [...t.registrations, playerWithNickname] }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Unregistering from a Tournament
  unregisterFromTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const playerToRemove = tournamentData.registrations.find((p: Player) => p.id === userId);
      if (!playerToRemove) {
        throw new Error("Player not found in registrations");
      }
      await updateDoc(tournamentRef, {
        registrations: arrayRemove(playerToRemove),
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: t.registrations.filter((p) => p.id !== userId) }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Tournament
  startTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      await updateDoc(tournamentRef, {
        status: 'in_progress',
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, status: 'in_progress' }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Adding a Game
  // Adjusted gameData type in implementation as well
  addGame: async (tournamentId: string, gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const gameId = Date.now().toString();
      // Construct the full newGame object with all defaults
      const newGame: Game = {
        id: gameId,
        // Fields from gameData (guaranteed by Pick type)
        startingStack: gameData.startingStack,
        blinds: gameData.blinds,
        blindLevels: gameData.blindLevels,
        players: (gameData.players || []).map(p => ({ // Sanitize players
            id: p.id,
            name: p.name,
            nickname: p.nickname ?? undefined,
            eliminated: p.eliminated ?? false,
            eliminationTime: p.eliminationTime ?? null,
        })),
        tournamentId: gameData.tournamentId,
        prizePool: gameData.prizePool ?? 0, // Default prize/winnings if somehow missing
        distributionPercentages: gameData.distributionPercentages ?? { first: 60, second: 25, third: 15 },
        winnings: gameData.winnings ?? { first: 0, second: 0, third: 0 },
        // Explicit defaults for fields NOT in gameData
        status: 'pending',
        currentLevel: 0,
        levelStartTime: 0, // Or Date.now() if preferred, but 0 is safe
        isPaused: false,
        remainingTimeOnPause: null,
        startedAt: undefined, // Not started yet
        endedAt: null, // Not ended yet
      };
      // Clean the object before saving
      const cleanNewGame = cleanGameForFirestore(newGame);
      await updateDoc(tournamentRef, {
        games: arrayUnion(cleanNewGame), // Add the cleaned game object
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, games: [...t.games, newGame as Game] } // Type assertion to ensure correct type
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Updating a Game
  updateGame: async (tournamentId: string, gameId: string, gameData: Partial<Game>) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      // Map over games, ensuring defaults for all potentially missing fields in *every* game object
      const updatedGames = tournamentData.games.map((game: Game): Game => { // Add explicit : Game type
        const gameWithDefaults: Game = { // Apply defaults first, ensure type is Game
            ...game, // Spread original game first
            currentLevel: game.currentLevel ?? 0,
            levelStartTime: game.levelStartTime ?? 0,
            isPaused: game.isPaused ?? false,
            remainingTimeOnPause: game.remainingTimeOnPause ?? null,
            endedAt: game.endedAt ?? null,
            prizePool: game.prizePool ?? 0,
            distributionPercentages: game.distributionPercentages ?? { first: 60, second: 25, third: 15 },
            winnings: game.winnings ?? { first: 0, second: 0, third: 0 },
        };
        // If this is the game being updated, construct the final object field by field
        if (game.id === gameId) {
            const finalGameData: Game = {
                // Start with defaults applied to the original game
                ...gameWithDefaults,
                // Selectively overwrite with values from gameData if they are not undefined
                ...(gameData.tournamentId !== undefined && { tournamentId: gameData.tournamentId }),
                ...(gameData.startingStack !== undefined && { startingStack: gameData.startingStack }),
                ...(gameData.blinds !== undefined && { blinds: gameData.blinds }),
                ...(gameData.blindLevels !== undefined && { blindLevels: gameData.blindLevels }),
                ...(gameData.players !== undefined && { players: gameData.players }),
                ...(gameData.status !== undefined && { status: gameData.status }),
                ...(gameData.startedAt !== undefined && { startedAt: gameData.startedAt }),
                ...(gameData.currentLevel !== undefined && { currentLevel: gameData.currentLevel }),
                ...(gameData.levelStartTime !== undefined && { levelStartTime: gameData.levelStartTime }),
                ...(gameData.isPaused !== undefined && { isPaused: gameData.isPaused }),
                ...(gameData.remainingTimeOnPause !== undefined && { remainingTimeOnPause: gameData.remainingTimeOnPause }),
                ...(gameData.endedAt !== undefined && { endedAt: gameData.endedAt }),
                ...(gameData.prizePool !== undefined && { prizePool: gameData.prizePool }),
                ...(gameData.distributionPercentages !== undefined && { distributionPercentages: gameData.distributionPercentages }),
                ...(gameData.winnings !== undefined && { winnings: gameData.winnings }),
            };
             // Log a warning if any undefined values were skipped (optional)
             for (const key in gameData) {
                 if (gameData[key as keyof Game] === undefined) {
                     console.warn(`Attempted to set undefined for field ${key} in updateGame. Skipping.`);
                 }
             }
            return finalGameData;
        }
        // Return other games with defaults applied
        // Clean the object before returning
        return cleanGameForFirestore(gameWithDefaults); // Use the specific cleaner
      });
       // Ensure the entire array passed to updateDoc is clean
       // No need to map again as cleanGameForFirestore was applied inside the map
      await updateDoc(tournamentRef, {
        games: updatedGames, // Write the fully cleaned array
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Starting a Game
  startGame: async (tournamentId: string, gameId: string, players: Player[]) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const now = Date.now();
      const updatedGames = tournamentData.games.map((game: Game): Game => { // Ensure map returns Game[]
        // Define a helper to ensure all fields have valid defaults for ANY game object
        const ensureDefaults = (g: Game): Game => ({
            id: g.id,
            tournamentId: g.tournamentId,
            startingStack: g.startingStack, // Assuming these core fields always exist
            blinds: g.blinds,
            blindLevels: g.blindLevels,
            players: (g.players || []).map(p => ({ // Sanitize players array robustly
                id: p.id,
                name: p.name,
                nickname: p.nickname ?? undefined,
                eliminated: p.eliminated ?? false,
                eliminationTime: p.eliminationTime ?? null,
            })),
            status: g.status ?? 'pending', // Default status if missing
            startedAt: g.startedAt ?? undefined, // Default startedAt to undefined if missing
            currentLevel: g.currentLevel ?? 0,
            levelStartTime: g.levelStartTime ?? 0,
            isPaused: g.isPaused ?? false,
            remainingTimeOnPause: g.remainingTimeOnPause ?? null,
            endedAt: g.endedAt ?? null,
            prizePool: g.prizePool ?? 0,
            distributionPercentages: g.distributionPercentages ?? { first: 60, second: 25, third: 15 },
            winnings: g.winnings ?? { first: 0, second: 0, third: 0 },
        });

        if (game.id === gameId) {
          // Apply defaults to the game being started, then apply start-specific updates
          const gameWithDefaults = ensureDefaults(game);
          const updatedGameData: Game = {
              ...gameWithDefaults, // Start with the fully defaulted object
              // Apply start-specific updates
              players: players.map(p => ({ // Re-sanitize the *input* players array
                  id: p.id,
                  name: p.name,
                  nickname: p.nickname ?? undefined,
                  eliminated: p.eliminated ?? false,
                  eliminationTime: p.eliminationTime ?? null,
              })),
              status: 'in_progress',
              startedAt: now,
              levelStartTime: now, // Reset level start time on game start
              isPaused: false, // Ensure not paused
              remainingTimeOnPause: null, // Clear pause time
          };
          // Clean the final object before returning
          return cleanGameForFirestore(updatedGameData);
        }
        // For games *not* being started, ensure they have defaults and are cleaned
        return cleanGameForFirestore(ensureDefaults(game)); // Use the specific cleaner
      });
       // Ensure the entire array passed to updateDoc is clean
       // No need to map again as cleanGameForFirestore was applied inside the map
      await updateDoc(tournamentRef, {
        games: updatedGames, // Write the fully cleaned array
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Ending a Game
  endGame: async (tournamentId: string, gameId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      const now = Date.now();
      const updatedGames = tournamentData.games.map((game: Game) =>
        game.id === gameId ? { ...game, status: 'ended', endedAt: now } : game // Set endedAt timestamp
      );
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Deleting a Game
  deleteGame: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not the creator of this tournament");
      }
      const updatedGames = tournamentData.games.filter((game: Game) => game.id !== gameId);
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // --- New Timer Control Implementations ---

  pauseTimer: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.isPaused || game.status !== 'in_progress') return; // Already paused or not running

      const now = Date.now();
      const levelDurationMs = game.blindLevels * 60 * 1000;
      const elapsedInLevel = now - game.levelStartTime;
      const remainingTime = Math.max(0, levelDurationMs - elapsedInLevel); // Ensure non-negative

      const updates: Partial<Game> = {
        isPaused: true,
        remainingTimeOnPause: remainingTime,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  resumeTimer: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || !game.isPaused || game.status !== 'in_progress' || game.remainingTimeOnPause === null) return; // Not paused or invalid state

      const now = Date.now();
      const levelDurationMs = game.blindLevels * 60 * 1000;
      // Calculate the new effective start time for the level
      const newLevelStartTime = now - (levelDurationMs - game.remainingTimeOnPause);

      const updates: Partial<Game> = {
        isPaused: false,
        levelStartTime: newLevelStartTime,
        remainingTimeOnPause: null,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  advanceBlindLevel: async (tournamentId, gameId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const game = tournamentData.games.find((g: Game) => g.id === gameId);
      if (!game || game.status !== 'in_progress') return; // Game not running

      const updates: Partial<Game> = {
        currentLevel: game.currentLevel + 1,
        levelStartTime: Date.now(),
        isPaused: false, // Ensure timer is running for the new level
        remainingTimeOnPause: null,
      };

      const updatedGames = tournamentData.games.map((g: Game) =>
        g.id === gameId ? { ...g, ...updates } : g
      );

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: updateGameState(state, tournamentId, gameId, updates),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // --- Player Elimination/Reinstatement ---

  eliminatePlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const now = Date.now();
      const updatedGames = tournamentData.games.map((game: Game) => {
        if (game.id === gameId) {
          const updatedPlayers = game.players.map(player =>
            player.id === playerId
              ? { ...player, eliminated: true, eliminationTime: now }
              : player
          );
          return { ...game, players: updatedPlayers };
        }
        return game;
      });

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  reinstatePlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const updatedGames = tournamentData.games.map((game: Game) => {
        if (game.id === gameId) {
          const updatedPlayers = game.players.map(player =>
            player.id === playerId
              ? { ...player, eliminated: false, eliminationTime: null }
              : player
          );
          return { ...game, players: updatedPlayers };
        }
        return game;
      });

      await updateDoc(tournamentRef, { games: updatedGames });
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
}));
