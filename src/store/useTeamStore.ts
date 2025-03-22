import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

interface Team {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  pastMembers: string[];
  createdAt: Date;
}

interface TeamStore {
  teams: Team[];
  currentTeam: Team | null;
  createTeam: (name: string) => Promise<void>;
  fetchTeams: () => Promise<void>;
  addMember: (teamId: string, userId: string) => Promise<void>;
  removeMember: (teamId: string, userId: string) => Promise<void>;
  leaveTeam: (teamId: string, userId: string) => Promise<void>;
  joinTeam: (teamId: string, userId: string) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  currentTeam: null,
  createTeam: async (name) => {
    const { user } = useAuthStore.getState();
    if (!user) {
      console.error('User not logged in.');
      return;
    }

    const newTeam = {
      name,
      creatorId: user.uid,
      members: [user.uid],
      pastMembers: [],
      createdAt: serverTimestamp(), // Use serverTimestamp() instead of new Date()
    };

    try {
      const docRef = await addDoc(collection(db, 'teams'), newTeam);
      set((state) => ({
        teams: [...state.teams, { ...newTeam, id: docRef.id, createdAt: new Date() }], // Add the createdAt field to the new team
      }));
    } catch (error) {
      console.error('Error creating team:', error);
    }
  },
  fetchTeams: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;
    try {
      const q = query(collection(db, 'teams'), where('members', 'array-contains', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedTeams: Team[] = [];
      querySnapshot.forEach((doc) => {
        fetchedTeams.push({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt.toDate() } as Team); // Convert the Timestamp to a Date object
      });
      set({ teams: fetchedTeams });
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  },
  addMember: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: [...team.members, userId] } : team
        ),
      }));
    } catch (error) {
      console.error('Error adding member:', error);
    }
  },
  removeMember: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayRemove(userId),
        pastMembers: arrayUnion(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: team.members.filter((memberId) => memberId !== userId), pastMembers: [...team.pastMembers, userId] } : team
        ),
      }));
    } catch (error) {
      console.error('Error removing member:', error);
    }
  },
  leaveTeam: async (teamId, userId) => {
    await get().removeMember(teamId, userId);
  },
  joinTeam: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      await updateDoc(teamRef, {
        members: arrayUnion(userId),
        pastMembers: arrayRemove(userId),
      });
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === teamId ? { ...team, members: [...team.members, userId], pastMembers: team.pastMembers.filter((memberId) => memberId !== userId) } : team
        ),
      }));
    } catch (error) {
      console.error('Error adding member:', error);
    }
  },
  deleteTeam: async (teamId) => {
    try {
      await deleteDoc(doc(db, 'teams', teamId));
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== teamId),
      }));
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  },
  setCurrentTeam: (team) => set({ currentTeam: team }),
}));
