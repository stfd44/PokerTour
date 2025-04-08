import { create } from 'zustand';
import { db, handleDatabaseError, isCreator, getUserData } from '../lib/firebase'; // Import getUserData
// ADDED runTransaction import
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, query, where, runTransaction } from 'firebase/firestore';
import { useTeamStore } from './useTeamStore'; // Import useTeamStore
import { calculateSettlementTransactions } from '../lib/utils'; // Import the new utility function

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
  rebuysMade?: number; // ADDED: Track rebuys per player in a game
}

export interface Blinds {
  small: number;
  big: number;
}

// Define the structure for storing detailed game results per player
export interface PlayerResult { // ADDED export keyword
  playerId: string;
  name: string;     // Player's name/nickname at game end
  rank: number;     // Final rank (1, 2, 3, ...)
  points: number;   // Points awarded based on rank
  winnings: number; // Cash winnings for this game (0 if not 1st-3rd or no prize)
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
  results?: PlayerResult[]; // ADDED: Stores results for all players
  // Rebuy fields
  rebuyAllowedUntilLevel: number; // Max level for rebuys (e.g., 2)
  totalRebuys: number; // Count of rebuys made
  rebuyAmount: number; // Cost of one rebuy (usually tournament buyin)
}

// ADDED: Interface for settlement transactions
export interface Transaction {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string;
  toPlayerName: string;
  amount: number;
  completed: boolean;
}

export interface Tournament {
  id: string;
  creatorNickname?: string; // Added field for organizer's nickname
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
  guests?: string[]; // Optional array for guest names
  settlementTransactions?: Transaction[]; // ADDED: Optional array for settlement transactions
}

interface TournamentStore {
  tournaments: Tournament[];
  fetchTournaments: (userId: string) => Promise<void>; // Add userId parameter
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'status' | 'creatorNickname' | 'guests'>, userId: string, teamId: string, initialGuests?: string[]) => Promise<void>; // Add teamId parameter, exclude creatorNickname, add initialGuests
  updateTournament: (tournamentId: string, userId: string, tournamentData: Partial<Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'teamId' | 'creatorNickname'>>) => Promise<void>; // Added update function
  deleteTournament: (tournamentId: string, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, player: Player, nickname?: string) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  endTournament: (tournamentId: string, userId: string) => Promise<void>; // ADDED endTournament action
  // Guest Management
  addGuestToTournament: (tournamentId: string, guestName: string, userId: string) => Promise<void>;
  removeGuestFromTournament: (tournamentId: string, guestName: string, userId: string) => Promise<void>;
  // Adjusted addGame gameData type to include new fields and rebuy level
  addGame: (
    tournamentId: string,
    gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>,
    rebuyAllowedUntilLevel?: number // Optional rebuy level
  ) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string) => Promise<void>; // Removed players parameter
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  // New Timer Control Actions
  pauseTimer: (tournamentId: string, gameId: string) => Promise<void>;
  resumeTimer: (tournamentId: string, gameId: string) => Promise<void>;
  advanceBlindLevel: (tournamentId: string, gameId: string) => Promise<void>;
  // New actions for player elimination/reinstatement
  eliminatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  reinstatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  // Rebuy action
  rebuyPlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  // Settlement actions
  calculateAndStoreSettlement: (tournamentId: string) => Promise<void>;
  updateSettlementTransaction: (tournamentId: string, transactionIndex: number, completed: boolean) => Promise<void>;
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

// Helper function to calculate results for a single game
// Moved from endGame to be used by calculateAndStoreSettlement
const calculateResultsForGame = (game: Game): { results: PlayerResult[], finalWinnings: { first: number; second: number; third: number } } | null => {
    if (!game || !game.players || game.players.length === 0) {
        console.warn(`[calculateResultsForGame - ${game.id}] Cannot calculate results, missing player data.`);
        return null; // Cannot calculate without players
    }

    const players = game.players;
    const sortedPlayers = [...players].sort((a, b) => {
        if (!a.eliminated && b.eliminated) return -1;
        if (a.eliminated && !b.eliminated) return 1;
        if (!a.eliminated && !b.eliminated) return 0;
        return (b.eliminationTime ?? 0) - (a.eliminationTime ?? 0);
    });

    const results: PlayerResult[] = sortedPlayers.map((player, index) => {
        const rank = index + 1;
        let points = 0;
        let winnings = 0;
        switch (rank) {
          case 1: points = 10; break;
          case 2: points = 7; break;
          case 3: points = 5; break;
          case 4: points = 3; break;
          case 5: points = 2; break;
          default: points = 1; break;
        }
        if (game.winnings) {
          if (rank === 1) winnings = game.winnings.first ?? 0;
          else if (rank === 2) winnings = game.winnings.second ?? 0;
          else if (rank === 3) winnings = game.winnings.third ?? 0;
        }
        return { playerId: player.id, name: player.nickname || player.name, rank, points, winnings };
    });

    const totalRebuyAmount = (game.totalRebuys || 0) * (game.rebuyAmount || 0);
    const finalWinnings = { ...(game.winnings ?? { first: 0, second: 0, third: 0 }) };
    if (results.length > 0 && totalRebuyAmount > 0) {
        const winnerIndex = results.findIndex(r => r.rank === 1);
        if (winnerIndex !== -1) {
          results[winnerIndex].winnings += totalRebuyAmount;
          finalWinnings.first = (finalWinnings.first ?? 0) + totalRebuyAmount;
        }
    }
    return { results, finalWinnings };
};


// Removed unused 'get' parameter from create callback
export const useTournamentStore = create<TournamentStore>((set) => ({
  tournaments: [],

  // Fetching Tournaments
  fetchTournaments: async () => {
    try {
        const { teams } = useTeamStore.getState();
        const userTeams = teams.map(team => team.id);
        if (userTeams.length === 0) {
            set({ tournaments: [] }); // If the user is not in any team, display no tournament
            return;
        }
        const q = query(collection(db, "tournaments"), where("teamId", "in", userTeams));
        const querySnapshot = await getDocs(q);

        // Fetch creator nicknames in parallel
        const tournamentsPromises = querySnapshot.docs.map(async (doc): Promise<Tournament> => {
            const data = doc.data() as Omit<Tournament, 'id' | 'creatorNickname'>; // Type assertion for raw data
            let creatorNickname: string | undefined = undefined;
            if (data.creatorId) {
                const creatorData = await getUserData(data.creatorId);
                creatorNickname = creatorData?.nickname ?? undefined; // Use nickname if available
            }
            return {
                id: doc.id,
                ...data,
                creatorNickname: creatorNickname, // Add the fetched nickname
            };
        });

        const tournaments = await Promise.all(tournamentsPromises);
        set({ tournaments });
    } catch (error) {
        handleDatabaseError(error);
        set({ tournaments: [] }); // Clear tournaments on error
    }
  },

  // Adding a Tournament
  addTournament: async (tournamentData, creatorId, teamId, initialGuests = []) => {
    try {
      // Fetch creator's data to get their nickname
      const creatorData = await getUserData(creatorId);
      const creatorNickname = creatorData?.nickname; // Get nickname, might be null

      // Create the creator's registration entry
      const creatorRegistration: Player = {
        id: creatorId,
        name: creatorNickname || `Utilisateur_${creatorId.substring(0, 5)}`, // Fallback name if no nickname
        nickname: creatorNickname || undefined,
      };

      // Create registration entries for initial guests
      const guestRegistrations = initialGuests.map(guestName => ({
        id: `guest_${guestName.replace(/\s+/g, '_')}`, // Create a simple guest ID
        name: guestName,
        // No nickname for guests initially
      }));

      // Combine creator and guest registrations
      const initialRegistrations = [creatorRegistration, ...guestRegistrations];

      const docRef = await addDoc(collection(db, "tournaments"), {
        ...tournamentData,
        registrations: initialRegistrations, // Add creator + guests
        creatorId: creatorId,
        games: [],
        status: 'scheduled',
        teamId: teamId,
        guests: initialGuests,
      });
      // Fetch the newly added tournament to get its full data including ID and merged registrations
      const newTournamentDoc = await getDoc(docRef);
      if (newTournamentDoc.exists()) {
          // Data from Firestore already includes the creator in registrations
          const newTournamentData = newTournamentDoc.data() as Omit<Tournament, 'id' | 'creatorNickname'>;

          // We already fetched the creator's nickname above, reuse it
          const finalCreatorNickname = creatorNickname || undefined;

          const newTournament: Tournament = {
              id: docRef.id,
              ...newTournamentData, // This now includes the creator in registrations from Firestore
              creatorNickname: finalCreatorNickname,
          };
          set((state) => ({
              tournaments: [...state.tournaments, newTournament],
          }));
      }
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Updating a Tournament (New Function)
  updateTournament: async (tournamentId, userId, tournamentData) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);

      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }

      const currentData = tournamentDoc.data() as Tournament;

      // Check 1: Is the user the creator?
      if (currentData.creatorId !== userId) {
        throw new Error("You are not authorized to edit this tournament.");
      }

      // Check 2: Is the tournament status 'scheduled'?
      if (currentData.status !== 'scheduled') {
        throw new Error("Cannot edit a tournament that has already started or ended.");
      }

      // Perform the update
      await updateDoc(tournamentRef, tournamentData);

      // Update local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, ...tournamentData } : t
        ),
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

      // Check if the user trying to unregister is the creator
      if (tournamentData.creatorId === userId) {
        throw new Error("The tournament creator cannot unregister.");
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

  // Ending a Tournament (New Action)
  endTournament: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      // Verify user is the creator before updating
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("You are not authorized to end this tournament.");
      }
      // Update status in Firestore
      await updateDoc(tournamentRef, {
        status: 'ended',
      });
      // Update status in local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, status: 'ended' }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error); // Use existing error handler
    }
  },

  // Adding a Game
  // Adjusted gameData type and added rebuyAllowedUntilLevel parameter
  addGame: async (
    tournamentId: string,
    gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>,
    rebuyAllowedUntilLevel: number = 2 // Default rebuy level to 2
  ) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef); // Fetch tournament to get buyin
      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }
      const tournamentData = tournamentDoc.data() as Tournament;
      const gameId = Date.now().toString();

      // Construct the full newGame object with all defaults
      const newGame: Game = {
        id: gameId,
        // Fields from gameData
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
        // Rebuy fields initialization
        rebuyAllowedUntilLevel: rebuyAllowedUntilLevel,
        totalRebuys: 0,
        rebuyAmount: tournamentData.buyin, // Set rebuy amount from tournament buyin
      };
      // Clean the object before saving
      const cleanNewGame = cleanGameForFirestore(newGame); // cleanGameForFirestore needs update too
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

  // Starting a Game - Refactored to use Firestore Transaction
  // Removed inputPlayers parameter
  startGame: async (tournamentId: string, gameId: string) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data();
         if (!tournamentData || !tournamentData.games) {
           throw new Error("Tournament data or games array is missing");
        }

        const gameToStartIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
        if (gameToStartIndex === -1) {
          console.log(`[startGame Transaction - ${gameId}] Game not found.`);
          return; // Exit transaction if game doesn't exist
        }
        const gameToStart = tournamentData.games[gameToStartIndex];

        // Avoid re-starting if already in progress or ended
        if (gameToStart.status !== 'pending') {
            console.log(`[startGame Transaction - ${gameId}] Game already started or ended (status: ${gameToStart.status}).`);
            return;
        }

        const now = Date.now();
        // Removed sanitization of inputPlayers, we use gameToStart.players directly

        // Prepare the updated game data using existing players
        const updatedGameData = cleanGameForFirestore({
            ...gameToStart, // Keep existing game data
            // players: gameToStart.players, // Use the players already in the game data (cleanGameForFirestore handles this)
            status: 'in_progress',
            startedAt: now,
            levelStartTime: now, // Reset level start time
            isPaused: false, // Ensure not paused
            remainingTimeOnPause: null, // Clear pause time
            // Ensure other fields retain their values or defaults if needed
            currentLevel: gameToStart.currentLevel ?? 0,
            prizePool: gameToStart.prizePool ?? 0,
            distributionPercentages: gameToStart.distributionPercentages ?? { first: 60, second: 25, third: 15 },
            winnings: gameToStart.winnings ?? { first: 0, second: 0, third: 0 },
            rebuyAllowedUntilLevel: gameToStart.rebuyAllowedUntilLevel ?? 2,
            totalRebuys: gameToStart.totalRebuys ?? 0,
            rebuyAmount: gameToStart.rebuyAmount ?? 0,
        });

        // Create the updated games array based on the data read within the transaction
        const updatedGames = tournamentData.games.map((g: Game, index: number) =>
            index === gameToStartIndex ? updatedGameData : g
        ).map((g: Game) => cleanGameForFirestore(g)); // Clean all games // Added explicit type Game for g

        // Perform the update within the transaction
        transaction.update(tournamentRef, { games: updatedGames });
        console.log(`[startGame Transaction - ${gameId}] Transaction update scheduled.`);

        // Update local state optimistically
        set((state) => ({
            tournaments: state.tournaments.map((t) =>
              t.id === tournamentId ? { ...t, games: updatedGames } : t
            ),
        }));
      }); // End of runTransaction

      console.log(`[startGame - ${gameId}] Transaction committed successfully.`);

    } catch (error) {
      console.error(`[startGame - ${gameId}] Transaction failed:`, error);
      handleDatabaseError(error);
    }
  },

  // Ending a Game - Refactored to use Firestore Transaction (Simplified: Only marks as ended)
  endGame: async (tournamentId: string, gameId: string) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
      await runTransaction(db, async (transaction) => {
        const tournamentDoc = await transaction.get(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error("Tournament not found");
        }
        const tournamentData = tournamentDoc.data();
        if (!tournamentData || !tournamentData.games) {
           throw new Error("Tournament data or games array is missing");
        }

        const gameToEndIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
        if (gameToEndIndex === -1) {
          console.log(`[endGame Transaction - ${gameId}] Game not found.`);
          return; // Exit transaction if game doesn't exist
        }
        const gameToEnd = tournamentData.games[gameToEndIndex];

        // Only proceed if the game is not already ended
        if (gameToEnd.status === 'ended') {
            console.log(`[endGame Transaction - ${gameId}] Game already marked as ended.`);
            return;
        }

        const now = Date.now();
        // Simplified: Only update status and endedAt. Results calculation moved to settlement.
        const updatedGameData = cleanGameForFirestore({
            ...gameToEnd,
            status: 'ended',
            endedAt: now,
            // results and winnings are NOT calculated or updated here anymore
        });

        // Create the updated games array
        const updatedGames = tournamentData.games.map((g: Game, index: number) =>
            index === gameToEndIndex ? updatedGameData : g
        ).map((g: Game) => cleanGameForFirestore(g));

        // Perform the update within the transaction
        transaction.update(tournamentRef, { games: updatedGames });
        console.log(`[endGame Transaction - ${gameId}] Marked game as ended. Transaction update scheduled.`);

        // Update local state optimistically (optional, but can improve UI responsiveness)
         set((state) => ({
             tournaments: state.tournaments.map((t) =>
               t.id === tournamentId ? { ...t, games: updatedGames } : t
             ),
         }));
      }); // End of runTransaction

      console.log(`[endGame - ${gameId}] Mark as ended transaction committed successfully.`);

    } catch (error) {
      console.error(`[endGame - ${gameId}] Mark as ended transaction failed:`, error);
      handleDatabaseError(error);
    }
  }, // End of endGame function

  // Deleting a Game
  deleteGame: async (tournamentId: string, gameId: string, userId: string) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();

      if (!tournamentData) {
        throw new Error("Tournament not found");
      }

      // Check if the user is the creator - This is the only check needed now.
      if (tournamentData.creatorId !== userId) {
         // Use direct comparison since we have the data
        throw new Error("You are not authorized to delete games in this tournament.");
      }

      // Filter out the game to be deleted (no status check needed)
      const updatedGames = tournamentData.games.filter((game: Game) => game.id !== gameId);

      // Update the document in Firestore
      await updateDoc(tournamentRef, {
        games: updatedGames,
      });

      // Update the local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));
      // Removed duplicate set call below
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

  // --- Guest Management ---
  addGuestToTournament: async (tournamentId, guestName, userId) => {
    const trimmedGuestName = guestName.trim();
    if (!trimmedGuestName) {
        alert("Guest name cannot be empty.");
        return;
    }
    try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        if (!await isCreator(tournamentRef, userId)) {
            throw new Error("Only the tournament creator can add guests.");
        }

        // Create the guest registration object
        const guestRegistration: Player = {
            id: `guest_${trimmedGuestName.replace(/\s+/g, '_')}`, // Consistent guest ID
            name: trimmedGuestName,
        };

        // Update both guests and registrations arrays atomically
        await updateDoc(tournamentRef, {
            guests: arrayUnion(trimmedGuestName),
            registrations: arrayUnion(guestRegistration) // Add guest to registrations
        });

        // Update local state
        set((state) => ({
            tournaments: state.tournaments.map((t) => {
                if (t.id === tournamentId) {
                    // Ensure arrays exist before spreading
                    const updatedGuests = [...(t.guests || []), trimmedGuestName];
                    const updatedRegistrations = [...(t.registrations || []), guestRegistration];
                    return { ...t, guests: updatedGuests, registrations: updatedRegistrations };
                }
                return t;
            }),
        }));
    } catch (error) {
        handleDatabaseError(error);
    }
  },

  removeGuestFromTournament: async (tournamentId, guestName, userId) => {
    try {
        const tournamentRef = doc(db, "tournaments", tournamentId);
        if (!await isCreator(tournamentRef, userId)) {
            throw new Error("Only the tournament creator can remove guests.");
        }

        // Find the guest registration entry to remove
        // Need to fetch the current registrations to find the exact object
        const tournamentDoc = await getDoc(tournamentRef);
        const currentData = tournamentDoc.data();
        if (!currentData) throw new Error("Tournament data not found.");

        const guestRegistrationToRemove = currentData.registrations.find(
            (p: Player) => p.id === `guest_${guestName.replace(/\s+/g, '_')}` && p.name === guestName
        );

        if (!guestRegistrationToRemove) {
            console.warn(`Guest registration for "${guestName}" not found. Removing from guests list only.`);
             await updateDoc(tournamentRef, {
                 guests: arrayRemove(guestName),
             });
        } else {
            // Remove from both arrays atomically
            await updateDoc(tournamentRef, {
                guests: arrayRemove(guestName),
                registrations: arrayRemove(guestRegistrationToRemove) // Remove the specific registration object
            });
        }


        // Update local state
        set((state) => ({
            tournaments: state.tournaments.map((t) => {
                if (t.id === tournamentId) {
                    const updatedGuests = (t.guests || []).filter(g => g !== guestName);
                    // Also filter local registrations
                    const updatedRegistrations = (t.registrations || []).filter(
                        p => !(p.id === `guest_${guestName.replace(/\s+/g, '_')}` && p.name === guestName)
                    );
                    return { ...t, guests: updatedGuests, registrations: updatedRegistrations };
                }
                return t;
            }),
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

  // --- Rebuy Player ---
  rebuyPlayer: async (tournamentId, gameId, playerId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) throw new Error("Tournament not found");

      const gameIndex = tournamentData.games.findIndex((g: Game) => g.id === gameId);
      if (gameIndex === -1) throw new Error("Game not found");

      const game = tournamentData.games[gameIndex];

      // --- Validation Checks ---
      if (game.status !== 'in_progress') {
        throw new Error("Game is not in progress.");
      }
      if (game.currentLevel >= game.rebuyAllowedUntilLevel) { // Use >= because levels are 0-indexed, level 2 means until *end* of level 2
        throw new Error(`Rebuys are only allowed up to level ${game.rebuyAllowedUntilLevel}. Current level: ${game.currentLevel + 1}.`);
      }
      const playerIndex = game.players.findIndex((p: Player) => p.id === playerId); // Add type Player
      if (playerIndex === -1) {
        throw new Error("Player not found in this game.");
      }
      if (!game.players[playerIndex].eliminated) {
        throw new Error("Player is not eliminated.");
      }
      // --- End Validation ---

      // --- Perform Rebuy ---
      const updatedPlayers = game.players.map((player: Player) => { // Add type Player
        if (player.id === playerId) {
          // Reinstate player and increment their rebuy count
          return {
            ...player,
            eliminated: false,
            eliminationTime: null,
            rebuysMade: (player.rebuysMade || 0) + 1 // Increment player's rebuy count
          };
        }
        return player;
      });

      const updatedGameData: Game = cleanGameForFirestore({
        ...game,
        players: updatedPlayers,
        totalRebuys: (game.totalRebuys || 0) + 1, // Increment total game rebuy count
      });

      const updatedGames = [
        ...tournamentData.games.slice(0, gameIndex),
        updatedGameData,
        ...tournamentData.games.slice(gameIndex + 1),
      ].map(g => cleanGameForFirestore(g)); // Clean all games

      await updateDoc(tournamentRef, { games: updatedGames });

      // Update local state
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId ? { ...t, games: updatedGames } : t
        ),
      }));

    } catch (error) {
      handleDatabaseError(error);
      // Re-throw the error so the UI can potentially catch it and display a message
      throw error;
    }
  },

  // --- Settlement Actions ---
  // Refactored to calculate missing results within the transaction
  calculateAndStoreSettlement: async (tournamentId) => {
    const tournamentRef = doc(db, "tournaments", tournamentId);
    try {
        // Use a transaction for the entire read-modify-write process
        await runTransaction(db, async (transaction) => {
            const tournamentDoc = await transaction.get(tournamentRef);
            if (!tournamentDoc.exists()) {
              throw new Error("Tournament not found");
            }
            const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;

            if (tournament.status !== 'ended') {
              throw new Error("Tournament is not ended yet.");
            }

            console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Starting calculation...`);

            let needsUpdate = false; // Flag to track if games array needs updating
            const gamesWithResults = [...tournament.games]; // Create a mutable copy

            // --- Calculate Missing Results ---
            console.log(`Processing ${gamesWithResults.length} games for missing results...`);
            for (let i = 0; i < gamesWithResults.length; i++) {
                const game = gamesWithResults[i];
                if (game.status === 'ended' && (!game.results || game.results.length === 0)) {
                    console.log(`   >> Game ${i + 1} (ID: ${game.id}) is ended but missing results. Calculating...`);
                    const calculation = calculateResultsForGame(game); // Use helper function
                    if (calculation) {
                        gamesWithResults[i] = {
                            ...game,
                            results: calculation.results,
                            winnings: calculation.finalWinnings, // Store adjusted winnings too
                        };
                        needsUpdate = true;
                        console.log(`   >> Calculated results for Game ${i + 1} (ID: ${game.id})`);
                    } else {
                         console.warn(`   >> Failed to calculate results for Game ${i + 1} (ID: ${game.id})`);
                    }
                }
            }
            // --- End Calculate Missing Results ---


            // 1. Calculate Balances (Corrected Logic: Buy-in per game participation)
            console.log(`Calculating balances for tournament ${tournamentId}. Buy-in per game: ${tournament.buyin}`);
            const playerBalancesMap: Map<string, { name: string; balance: number }> = new Map();

            // Initialize balances to 0 for all registered players first
            tournament.registrations.forEach(player => {
                playerBalancesMap.set(player.id, { name: player.nickname || player.name, balance: 0 });
            });

            console.log(`Processing ${gamesWithResults.length} games for buy-ins and winnings...`);
            gamesWithResults.forEach((game, gameIndex) => { // Iterate over the potentially updated array
                console.log(` > Processing Game ${gameIndex + 1} (ID: ${game.id})`);

                // Subtract buy-in for each player *in this game*
                game.players.forEach(playerInGame => {
                    const currentPlayerData = playerBalancesMap.get(playerInGame.id);
                    if (currentPlayerData) {
                        const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin); // Calculate cost of rebuys for this player in this game
                        const totalCostForGame = tournament.buyin + rebuyCost; // Total cost = buyin + rebuys

                        console.log(`   - Subtracting total cost ${totalCostForGame}€ (Buy-in: ${tournament.buyin}€, Rebuys: ${rebuyCost}€ [${playerInGame.rebuysMade || 0} x ${game.rebuyAmount || tournament.buyin}€]) for ${currentPlayerData.name} (ID: ${playerInGame.id}) for game ${game.id}. Old balance: ${currentPlayerData.balance}`);
                        currentPlayerData.balance -= totalCostForGame;
                        console.log(`   - New balance for ${currentPlayerData.name}: ${currentPlayerData.balance}`);

                    } else {
                        // If player played but wasn't registered (e.g., guest removed later?), initialize with negative buy-in + rebuys
                        const rebuyCost = (playerInGame.rebuysMade || 0) * (game.rebuyAmount || tournament.buyin);
                        const initialBalance = -(tournament.buyin + rebuyCost);
                        console.warn(`   - Player ${playerInGame.name} (ID: ${playerInGame.id}) played game ${game.id} but not found in final registrations. Initializing balance with buy-in + rebuys: ${initialBalance}€.`);
                        playerBalancesMap.set(playerInGame.id, { name: playerInGame.name, balance: initialBalance });
                    }
                });

                // Add winnings if game is ended and has results
                if (game.results && game.results.length > 0 && game.status === 'ended') {
                    console.log(`   >> Adding winnings for ended game ${gameIndex + 1} (ID: ${game.id})`);
                    game.results.forEach(result => {
                        const currentPlayerData = playerBalancesMap.get(result.playerId);
                        if (currentPlayerData) {
                             console.log(`     - Adding winnings ${result.winnings} to ${currentPlayerData.name} (ID: ${result.playerId}). Old balance: ${currentPlayerData.balance}`);
                            currentPlayerData.balance += result.winnings;
                             console.log(`     - New balance for ${currentPlayerData.name}: ${currentPlayerData.balance}`);
                        } else {
                            // This case should be less likely now due to the loop above, but keep as a fallback
                            console.warn(`     - Player ${result.playerId} (${result.name}) in results but not map. Balance might be incorrect.`);
                            // Avoid setting balance here as buy-in wasn't subtracted if they weren't in game.players
                        }
                    });
                } else {
                     console.log(`   >> Skipping winnings for game ${gameIndex + 1} (ID: ${game.id}). Status: ${game.status}, Results Length: ${game.results?.length ?? 0}`);
                }
            });

            console.log("Final calculated balances before settlement:");
            playerBalancesMap.forEach((data, id) => {
                console.log(`  - ${data.name} (ID: ${id}): ${data.balance.toFixed(2)}`);
            });

            const balancesArray = Array.from(playerBalancesMap.entries()).map(([id, data]) => ({
                id, name: data.name, balance: data.balance,
            }));

            // 2. Calculate Optimized Transactions
            console.log("Calculating settlement transactions...");
            const transactions = calculateSettlementTransactions(balancesArray);
            console.log("Calculated transactions:", transactions);

            // 3. Update Firestore within the transaction
            const updateData: { settlementTransactions: Transaction[]; games?: Game[] } = {
                settlementTransactions: transactions
            };
            if (needsUpdate) {
                // Only include games if results were calculated
                updateData.games = gamesWithResults.map(g => cleanGameForFirestore(g));
                console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Scheduling update for games array (results added) and settlementTransactions.`);
            } else {
                 console.log(`[calculateAndStoreSettlement Transaction - ${tournamentId}] Scheduling update for settlementTransactions only.`);
            }
            transaction.update(tournamentRef, updateData);

            // 4. Update Local State (after scheduling transaction)
            set((state) => ({
                tournaments: state.tournaments.map((t) =>
                  t.id === tournamentId
                    ? { ...t, games: needsUpdate ? gamesWithResults : t.games, settlementTransactions: transactions } // Update games only if needed
                    : t
                ),
            }));
        }); // End of runTransaction

        console.log(`[calculateAndStoreSettlement - ${tournamentId}] Transaction committed successfully.`);

    } catch (error) {
      console.error(`[calculateAndStoreSettlement - ${tournamentId}] Transaction failed:`, error);
      handleDatabaseError(error);
      throw error;
    }
  },

  updateSettlementTransaction: async (tournamentId, transactionIndex, completed) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      if (!tournamentDoc.exists()) {
        throw new Error("Tournament not found");
      }
      const tournament = { id: tournamentDoc.id, ...tournamentDoc.data() } as Tournament;

      if (!tournament.settlementTransactions || transactionIndex < 0 || transactionIndex >= tournament.settlementTransactions.length) {
        throw new Error("Invalid transaction index or settlement not calculated yet.");
      }

      // Create a new array with the updated transaction
      const updatedTransactions = tournament.settlementTransactions.map((tx, index) =>
        index === transactionIndex ? { ...tx, completed: completed } : tx
      );

      // Update Firestore
      await updateDoc(tournamentRef, {
        settlementTransactions: updatedTransactions,
      });

      // Update Local State
      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, settlementTransactions: updatedTransactions }
            : t
        ),
      }));

    } catch (error) {
      handleDatabaseError(error);
      throw error; // Re-throw for UI handling
    }
  },

}));
