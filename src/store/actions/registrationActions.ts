import { StateCreator } from 'zustand';
// Removed unused getUserData
import { db, handleDatabaseError, isCreator } from '../../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
// Removed unused Tournament
import { Player, TournamentStore, TournamentStoreActions } from '../types/tournamentTypes';

// Define the slice for registration actions
export type RegistrationActionSlice = Pick<TournamentStoreActions,
  'registerToTournament' |
  'validateTournamentInvitation' |
  'inviteMembersToTournament' |
  'unregisterFromTournament' |
  'removeMemberFromTournament' |
  'addGuestToTournament' |
  'removeGuestFromTournament'
>;

export const createRegistrationActionSlice: StateCreator<
  TournamentStore,
  [],
  [],
  RegistrationActionSlice
> = (set) => ({
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

  // Validating a tournament invitation
  validateTournamentInvitation: async (tournamentId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }

      const playerToValidate = tournamentData.registrations.find((p: Player) => p.id === userId);
      if (!playerToValidate) {
        throw new Error("Player not found in registrations");
      }

      // We need to update the entire registrations array in Firestore since we are modifying an object within it
      const updatedRegistrations = tournamentData.registrations.map((p: Player) => 
        p.id === userId ? { ...p, status: 'confirmed' } : p
      );

      await updateDoc(tournamentRef, {
        registrations: updatedRegistrations,
      });

      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: updatedRegistrations }
            : t
        ),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },

  // Inviting members to a Tournament
  inviteMembersToTournament: async (tournamentId, userId, members) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("Only the tournament creator can invite members.");
      }

      const invitedRegistrations = members.map(member => ({
        ...member,
        status: 'invited' as const,
      }));

      if (invitedRegistrations.length > 0) {
        await updateDoc(tournamentRef, {
          registrations: arrayUnion(...invitedRegistrations)
        });

        set((state) => ({
          tournaments: state.tournaments.map((t) => {
            if (t.id === tournamentId) {
              const updatedRegistrations = [...(t.registrations || []), ...invitedRegistrations];
              return { ...t, registrations: updatedRegistrations };
            }
            return t;
          }),
        }));
      }
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

  // Removing any member by creator
  removeMemberFromTournament: async (tournamentId, memberId, userId) => {
    try {
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentDoc = await getDoc(tournamentRef);
      const tournamentData = tournamentDoc.data();
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }

      if (!await isCreator(tournamentRef, userId)) {
        throw new Error("Only the tournament creator can remove a member.");
      }

      if (tournamentData.creatorId === memberId) {
        throw new Error("The tournament creator cannot be removed.");
      }

      const playerToRemove = tournamentData.registrations.find((p: Player) => p.id === memberId);
      if (!playerToRemove) {
        throw new Error("Player not found in registrations");
      }

      await updateDoc(tournamentRef, {
        registrations: arrayRemove(playerToRemove),
      });

      set((state) => ({
        tournaments: state.tournaments.map((t) =>
          t.id === tournamentId
            ? { ...t, registrations: t.registrations.filter((p) => p.id !== memberId) }
            : t
        ),
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
});
