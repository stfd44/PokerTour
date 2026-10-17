import { StateCreator } from 'zustand';
import { db, handleDatabaseError } from '../../lib/firebase';
import { doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { Tournament, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';
import { cleanGameForFirestore } from '../helpers/tournamentHelpers';
import { calculateTournamentSettlement } from '../helpers/settlement';

export type SettlementActionSlice = Pick<TournamentStoreActions, 'calculateAndStoreSettlement' | 'updateSettlementTransaction'>;

export const createSettlementActionSlice: StateCreator<TournamentStore, [], [], SettlementActionSlice> = (set) => ({
  calculateAndStoreSettlement: async (tournamentId) => {
    const tournamentRef = doc(db, 'tournaments', tournamentId);
    try {
      const update = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(tournamentRef);
        if (!snapshot.exists()) throw new Error('Tournoi introuvable.');
        const tournament = { ...snapshot.data(), id: snapshot.id } as Tournament;
        if (tournament.status !== 'ended') throw new Error('Le tournoi doit être terminé.');
        const result = calculateTournamentSettlement(tournament);
        const data = { ...result, games: result.games.map(cleanGameForFirestore) };
        transaction.update(tournamentRef, data);
        return data;
      });
      set(state => ({ tournaments: state.tournaments.map(t => t.id === tournamentId ? { ...t, ...update } : t) }));
    } catch (error) {
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
});
