// Interfaces moved from tournamentStore.ts

export interface Player {
  id: string;
  name: string;
  nickname?: string | null;
  eliminated?: boolean;
  eliminationTime?: number | null; // Added for tracking elimination time
  rebuysMade?: number; // ADDED: Track rebuys per player in a game
}

export interface Blinds {
  small: number;
  big: number;
}

// ADDED: Interface for pot contributions by players
export interface PotContribution {
  playerId: string;
  playerName: string;
  amount: number; // Amount paid to the pot by this player
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
  blindStructure: Blinds[]; // Remplacé 'blinds' et 'blindLevels'
  levelDurations: number[]; // Durée de chaque niveau en minutes
  players: Player[];
  status: 'pending' | 'in_progress' | 'ended';
  startedAt?: number | null; // Changed to number (timestamp) for consistency
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
  rebuyDistributionRule: 'winner_takes_all' | 'cyclic_distribution'; // ADDED: Distribution rule for rebuys
  // ADDED: Pot management fields (optional for backward compatibility)
  potContributions?: PotContribution[]; // Who paid how much to the pot
  totalPotAmount?: number; // Total amount available in the pot
}

// ADDED: Interface for settlement transactions
export interface Transaction {
  fromPlayerId: string;
  fromPlayerName: string;
  toPlayerId: string; // "POT" for pot withdrawals
  toPlayerName: string; // "POT" for pot withdrawals
  amount: number;
  completed: boolean;
  type?: 'pot_withdrawal' | 'player_debt'; // ADDED: Type of transaction (optional for backward compatibility)
}

export interface TransactionLedgerItem {
  description: string;
  amount: number;
  gameId: string;
  type: 'buy_in_cost' | 'rebuy_cost' | 'buy_in_win' | 'rebuy_win' | 'winnings';
  relatedPlayerId?: string; // ID du joueur dont le buy-in/rebuy a généré le gain
}


export interface PlayerGameSummary {
  gameId: string;
  rebuys: number;
  winnings: number;
  netResult: number;
}

export interface PlayerSettlementSummary {
  playerId: string;
  playerName: string;
  totalBuyIn: number;
  totalWinnings: number;
  netResult: number;
  gamesSummary: PlayerGameSummary[];
  ledger: TransactionLedgerItem[];
}

export interface DetailedSettlement {
  playerSummaries: PlayerSettlementSummary[];
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
  detailedSettlement?: DetailedSettlement;
}

// Interface for the Zustand store itself
// This defines the shape of the state and the actions available
export interface TournamentStoreState {
  tournaments: Tournament[];
  isLoadingTournament: boolean; // Added state for loading a single tournament
}

export interface TournamentStoreActions {
  fetchTournaments: (userId: string) => Promise<void>;
  fetchTournamentById: (tournamentId: string) => Promise<void>; // Added action to fetch single tournament
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
    gameData: Pick<Game, 'startingStack' | 'players' | 'tournamentId' | 'prizePool' | 'distributionPercentages' | 'winnings' | 'potContributions' | 'totalPotAmount' | 'rebuyDistributionRule'>,
    initialBlinds: Blinds,
    levelDuration: number,
    rebuyAllowedUntilLevel?: number
  ) => Promise<void>;
  // updateGame: (tournamentId: string, gameId: string, gameData: Partial<Game>) => Promise<void>;
  startGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  endGame: (tournamentId: string, gameId: string) => Promise<void>;
  deleteGame: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  updateBlinds: (tournamentId: string, gameId: string, newBlinds: Blinds, userId: string) => Promise<void>;
  pauseTimer: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  resumeTimer: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  advanceBlindLevel: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  resetLevelTimer: (tournamentId: string, gameId: string, userId: string) => Promise<void>;
  updateLevelDuration: (tournamentId: string, gameId: string, newDuration: number, userId: string) => Promise<void>;
  eliminatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  reinstatePlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  rebuyPlayer: (tournamentId: string, gameId: string, playerId: string) => Promise<void>;
  calculateAndStoreSettlement: (tournamentId: string) => Promise<void>;
  updateSettlementTransaction: (tournamentId: string, transactionIndex: number, completed: boolean) => Promise<void>;
}

// Combine state and actions for the final store type
export type TournamentStore = TournamentStoreState & TournamentStoreActions;
