import { create } from 'zustand';
import { TournamentStore } from './types/tournamentTypes'; // Import the main store type
import { createTournamentActionSlice } from './actions/tournamentActions';
import { createRegistrationActionSlice } from './actions/registrationActions';
import { createGameActionSlice } from './actions/gameActions';
import { createTimerActionSlice } from './actions/timerActions';
import { createPlayerActionSlice } from './actions/playerActions';
import { createSettlementActionSlice } from './actions/settlementActions';

// Define the initial state
const initialState = {
  tournaments: [],
  isLoadingTournament: false, // Initialize loading state
};

// Create the store by combining the initial state and all the action slices
export const useTournamentStore = create<TournamentStore>()((...a) => ({
  ...initialState,
  ...createTournamentActionSlice(...a),
  ...createRegistrationActionSlice(...a),
  ...createGameActionSlice(...a),
  ...createTimerActionSlice(...a),
  ...createPlayerActionSlice(...a),
  ...createSettlementActionSlice(...a),
}));
