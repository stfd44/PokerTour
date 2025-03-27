import { create } from 'zustand';
import { collection, addDoc, getDocs, query, where, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, deleteDoc, getDoc } from 'firebase/firestore';
import { db, handleDatabaseError, isCreator } from '../lib/firebase';
import { useAuthStore } from './useAuthStore';

// Fonction pour générer un ID unique à 4 chiffres
const generateUniqueId = async (): Promise<string> => {
  while (true) {
    const id = Math.floor(1000 + Math.random() * 9000).toString();
    const teamRef = doc(db, 'teams', id);
    const teamSnap = await getDoc(teamRef);
    if (!teamSnap.exists()) {
      return id;
    }
  }
};

export interface Team {
  id: string;
  name: string;
  creatorId: string;
  members: string[];
  pastMembers: string[];
  createdAt: Date;
  tag: string;
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
  deleteTeam: (teamId: string, userId: string) => Promise<void>;
  setCurrentTeam: (team: Team | null) => void;
  isCreator: (teamId: string, userId: string) => Promise<boolean>;
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

    const uniqueId = await generateUniqueId();
    const tag = `${name.toLowerCase().replace(/\s+/g, '_')}_${uniqueId}`;


    const newTeam = {
      name,
      creatorId: user.uid,
      members: [user.uid],
      pastMembers: [],
      createdAt: serverTimestamp(), // Use serverTimestamp() instead of new Date()
      tag: tag, // Ajout du tag
    };

    try {
      const docRef = await addDoc(collection(db, 'teams'), newTeam);
      set((state) => ({
        teams: [...state.teams, { ...newTeam, id: docRef.id, createdAt: new Date() }], // Add the createdAt field to the new team
      }));
    } catch (error) {
      handleDatabaseError(error);
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
      handleDatabaseError(error);
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
      handleDatabaseError(error);
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
      handleDatabaseError(error);
    }
  },
  leaveTeam: async (teamId, userId) => {
    try {
      await get().removeMember(teamId, userId);
    } catch (error) {
      handleDatabaseError(error);
    }
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
      handleDatabaseError(error);
    }
  },
  deleteTeam: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      if (!await get().isCreator(teamId, userId)) {
        throw new Error("You are not the creator of this team");
      }
      await deleteDoc(teamRef);
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== teamId),
      }));
    } catch (error) {
      handleDatabaseError(error);
    }
  },
  setCurrentTeam: (team) => set({ currentTeam: team }),
  isCreator: async (teamId, userId) => {
    try {
      const teamRef = doc(db, 'teams', teamId);
      return await isCreator(teamRef, userId);
    } catch (error) {
      handleDatabaseError(error);
      return false;
    }
  },
}));
