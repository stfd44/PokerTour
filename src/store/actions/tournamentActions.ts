import { StateCreator } from 'zustand';
import { db, handleDatabaseError, isCreator, getUserData } from '../../lib/firebase';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { useTeamStore } from '../useTeamStore';
// Removed unused TournamentStoreState
import { Tournament, Player, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';

// Define the slice for tournament actions
// It needs access to `set` from Zustand and potentially `get`
// It also needs to conform to the part of TournamentStoreActions it implements
export type TournamentActionSlice = Pick<TournamentStoreActions,
  'fetchTournaments' |
  'fetchTournamentById' | // Added fetchTournamentById
  'addTournament' |
  'updateTournament' |
  'deleteTournament' |
  'startTournament' |
  'endTournament'
>;

export const createTournamentActionSlice: StateCreator<
  TournamentStore, // Full store type
  [], // Middleware types (none for now)
  [], // Middleware types (none for now)
  TournamentActionSlice // The type for the slice this creator returns
> = (set, get) => ({ // Added get to access current state
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

  // Fetching a Single Tournament by ID
  fetchTournamentById: async (tournamentId) => {
    set({ isLoadingTournament: true });
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const docSnap = await getDoc(tournamentRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Omit<Tournament, 'id' | 'creatorNickname'>;
        let creatorNickname: string | undefined = undefined;
        if (data.creatorId) {
          const creatorData = await getUserData(data.creatorId);
          creatorNickname = creatorData?.nickname ?? undefined;
        }
        const fetchedTournament: Tournament = {
          id: docSnap.id,
          ...data,
          creatorNickname: creatorNickname,
        };

        // Update the tournaments array: replace if exists, add if new
        const currentTournaments = get().tournaments;
        const existingIndex = currentTournaments.findIndex(t => t.id === tournamentId);
        let updatedTournaments;
        if (existingIndex > -1) {
          updatedTournaments = [...currentTournaments];
          updatedTournaments[existingIndex] = fetchedTournament;
        } else {
          updatedTournaments = [...currentTournaments, fetchedTournament];
        }
        set({ tournaments: updatedTournaments });

      } else {
        console.warn(`Tournament with ID ${tournamentId} not found.`);
        // Optionally remove from local state if it was there somehow?
        // set((state) => ({ tournaments: state.tournaments.filter(t => t.id !== tournamentId) }));
      }
    } catch (error) {
      handleDatabaseError(error);
      // Optionally clear the specific tournament or handle error state
    } finally {
      set({ isLoadingTournament: false });
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

  // Updating a Tournament
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

  // Ending a Tournament
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
});
