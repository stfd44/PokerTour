// Interfaces moved from tournamentStore.ts

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
export interface PlayerResult {
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

// Interface for the Zustand store itself
// This defines the shape of the state and the actions available
export interface TournamentStoreState {
  tournaments: Tournament[];
}

export interface TournamentStoreActions {
  fetchTournaments: (userId: string) => Promise<void>;
  addTournament: (tournamentData: Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'status' | 'creatorNickname' | 'guests'>, userId: string, teamId: string, initialGuests?: string[]) => Promise<void>;
  updateTournament: (tournamentId: string, userId: string, tournamentData: Partial<Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'teamId' | 'creatorNickname'>>) => Promise<void>;
  deleteTournament: (tournamentId: string, userId: string) => Promise<void>;
  registerToTournament: (tournamentId: string, userId: string, player: Player, nickname?: string) => Promise<void>;
  unregisterFromTournament: (tournamentId: string, userId: string) => Promise<void>;
  startTournament: (tournamentId: string, userId: string) => Promise<void>;
  endTournament: (tournamentId: string, userId: string) => Promise<void>;
  addGuestToTournament: (tournamentId: string, guestName: string, userId: string) => Promise<void>;
  removeGuestFromTournament: (tournamentId: string, guestName: string, userId: string) => Promise<void>;
  addGame: (
    tournamentId: string,
    gameData: Pick<Game, 'startingStack' | 'blinds' | 'blindLevels' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings'>,
    rebuyAllowedUntilLevel?: number
  ) => Promise<void>;
  updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  pauseTimer: (tournamentId: string, gameId: string) => Promise<void>;
  resumeTimer: (tournamentId: string, gameId: string) => Promise<void>;
  advanceBlindLevel: (tournamentId: string, gameId: string) => Promise<void>;
  eliminatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  reinstatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  rebuyPlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  calculateAndStoreSettlement: (tournamentId: string) => Promise<void>;
  updateSettlementTransaction: (tournamentId: string, transactionIndex: number, completed: boolean) => Promise<void>;
}

// Combine state and actions for the final store type
export type TournamentStore = TournamentStoreState & TournamentStoreActions;
