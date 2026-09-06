import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '../../store/tournamentStore';
import type { Tournament } from '../../store/types/tournamentTypes'; // Correct import path for Tournament type
import { useAuthStore } from '../../store/useAuthStore';
import { useTeamStore } from '../../store/useTeamStore';
import { getUserData } from '../../lib/firebase';
import { X, UserPlus, User, AlertCircle, Check, ShieldCheck, ShieldAlert } from 'lucide-react'; // Import icons

export function EditTournament() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // Add guest management actions from the store
  const { tournaments, updateTournament, fetchTournaments, addGuestToTournament, removeGuestFromTournament, inviteMembersToTournament, removeMemberFromTournament } = useTournamentStore();
  const { teams, fetchTeams } = useTeamStore();

  const [tournamentData, setTournamentData] = useState<Partial<Omit<Tournament, 'id' | 'registrations' | 'creatorId' | 'games' | 'teamId' | 'creatorNickname'>>>({
    name: '',
    date: '',
    buyin: 0,
    maxPlayers: 0,
    location: '',
  });
  const [currentGuest, setCurrentGuest] = useState(''); // State for guest input
  const [guests, setGuests] = useState<string[]>([]); // State for the list of guests
  const [isLoading, setIsLoading] = useState(true); // Overall component loading
  const [error, setError] = useState<string | null>(null); // General blocking error
  
  // Status for specific buttons
  const [guestStatus, setGuestStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [inlineError, setInlineError] = useState<{ message: string, id: string } | null>(null);

  const showInlineError = (message: string) => {
    setInlineError({ message, id: Date.now().toString() });
    setTimeout(() => setInlineError(null), 4000);
  };

  // Add state for team member invites
  const [teamMembersDetails, setTeamMembersDetails] = useState<{ id: string, name: string }[]>([]);
  const [invitedMembersIds, setInvitedMembersIds] = useState<string[]>([]);

  // Pending/unverified members from the group
  const [pendingMembers, setPendingMembers] = useState<{ name: string }[]>([]);
  const [invitedPendingNames, setInvitedPendingNames] = useState<string[]>([]);
  const [pendingGuestStatus, setPendingGuestStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  
  // Pending unmount states so the user can see the checkmark animation BEFORE the item disappears
  const [pendingRemovalGuests, setPendingRemovalGuests] = useState<string[]>([]);
  const [pendingRemovalMembers, setPendingRemovalMembers] = useState<any[]>([]);
  const [pendingInvitedMembers, setPendingInvitedMembers] = useState<{ id: string, name: string }[]>([]);
  const [targetActionId, setTargetActionId] = useState<string | null>(null);
  const [targetActionStatus, setTargetActionStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    // Ensure tournaments are fetched if not already present
    if (tournaments.length === 0 && user) {
      fetchTournaments(user.uid);
    }
    fetchTeams();
  }, [fetchTournaments, tournaments.length, user, fetchTeams]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const currentTournament = tournaments.find(t => t.id === tournamentId);
      if (!currentTournament || !currentTournament.teamId || !user) {
        setTeamMembersDetails([]);
        setPendingMembers([]);
        return;
      }

      const selectedTeam = teams.find(t => t.id === currentTournament.teamId);
      if (selectedTeam) {
        // Exclude the creator
        const memberIds = selectedTeam.members.filter(id => id !== user.uid);
        
        const membersData = await Promise.all(memberIds.map(async (id) => {
            const data = await getUserData(id);
            return {
                id,
                name: selectedTeam.memberNames?.[id] || data?.nickname || `Utilisateur_${id.substring(0, 5)}`
            };
        }));
        setTeamMembersDetails(membersData);
        setPendingMembers(selectedTeam.pendingMembers || []);
      }
    };
    fetchTeamMembers();
  }, [tournamentId, tournaments, teams, user]);

  useEffect(() => {
    if (!tournamentId) {
      setError("ID du tournoi manquant.");
      setIsLoading(false);
      return;
    }

    const currentTournament = tournaments.find(t => t.id === tournamentId);

    if (currentTournament) {
      // Security Check: Ensure the current user is the creator and the tournament is scheduled
      if (currentTournament.creatorId !== user?.uid) {
        setError("Vous n'êtes pas autorisé à modifier ce tournoi.");
        setIsLoading(false);
        return;
      }
      // Allow loading if scheduled or in progress, but block if ended
      if (currentTournament.status === 'ended') {
        setError("Ce tournoi est terminé et ne peut plus être modifié.");
        setIsLoading(false);
        return;
      }
      // Note: We allow loading for 'in_progress', but will disable fields below

      // Pre-fill form data (Moved inside the if(currentTournament) block)
      setTournamentData({
        name: currentTournament.name,
        // Format date for input type="datetime-local" (YYYY-MM-DDTHH:mm)
        date: currentTournament.date && !isNaN(new Date(currentTournament.date).getTime()) 
          ? new Date(currentTournament.date).toISOString().slice(0, 16) 
          : '',
        buyin: currentTournament.buyin,
        maxPlayers: currentTournament.maxPlayers,
        location: currentTournament.location,
      });
      // Set initial guests list
      setGuests(currentTournament.guests || []);
      setIsLoading(false);
    } // <--- Corrected closing brace position for if(currentTournament)
    else if (tournaments.length > 0) {
      // Tournaments are loaded, but this one wasn't found
      setError("Tournoi non trouvé.");
      setIsLoading(false);
    }
    // If tournaments are still loading, isLoading remains true
  }, [tournamentId, tournaments, user?.uid]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setTournamentData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  // --- Guest Management Handlers ---
  const handleAddGuest = async () => {
    if (!tournamentId || !user || !currentGuest.trim() || guestStatus === 'loading') return;

    const trimmedGuestName = currentGuest.trim();
    const currentTournament = tournaments.find(t => t.id === tournamentId);
    const existingGuests = Array.from(new Set([...(currentTournament?.guests || []), ...guests]));
    const alreadyRegistered = (currentTournament?.registrations || []).some(
      (player) => player.name === trimmedGuestName || player.nickname === trimmedGuestName
    );

    if (currentTournament?.status === 'ended') {
        showInlineError("Impossible d'ajouter à un tournoi terminé.");
        return;
    }
    if (existingGuests.includes(trimmedGuestName) || alreadyRegistered) {
        showInlineError('Ce nom est déjà dans la liste des invités.');
        return;
    }

    setGuestStatus('loading');

    try {
      const start = Date.now();
      await addGuestToTournament(tournamentId, trimmedGuestName, user.uid);
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

      setGuests(prev => prev.includes(trimmedGuestName) ? prev : [...prev, trimmedGuestName]);
      setCurrentGuest('');
      
      setGuestStatus('success');
      setTimeout(() => setGuestStatus('idle'), 1200);
    } catch (err) {
      showInlineError((err as Error).message || "Erreur lors de l'ajout.");
      setGuestStatus('idle');
    }
  };

  const handleRemoveGuest = async (guestToRemove: string) => {
    if (!tournamentId || !user || targetActionStatus !== 'idle') return;

     const currentTournament = tournaments.find(t => t.id === tournamentId);
     if (currentTournament?.status === 'ended') {
         showInlineError("Impossible de retirer d'un tournoi terminé.");
         return;
     }

    setTargetActionId(guestToRemove);
    setTargetActionStatus('loading');

    try {
      setPendingRemovalGuests(prev => [...prev, guestToRemove]);
      
      const start = Date.now();
      await removeGuestFromTournament(tournamentId, guestToRemove, user.uid);
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      
      setTargetActionStatus('success');
      
      await new Promise(r => setTimeout(r, 1200));
      
      setGuests(guests.filter(g => g !== guestToRemove));
      setPendingRemovalGuests(prev => prev.filter(g => g !== guestToRemove));
    } catch (err) {
      setPendingRemovalGuests(prev => prev.filter(g => g !== guestToRemove));
      showInlineError((err as Error).message || "Erreur de suppression.");
    } finally {
       setTargetActionId(null);
       setTargetActionStatus('idle');
    }
  };

  const handleRemoveMember = async (player: any) => {
    if (!tournamentId || !user || targetActionStatus !== 'idle') return;

    const currentTournament = tournaments.find(t => t.id === tournamentId);
    if (currentTournament?.status === 'ended') {
        showInlineError("Impossible de retirer d'un tournoi terminé.");
        return;
    }

    setTargetActionId(player.id);
    setTargetActionStatus('loading');

    try {
      setPendingRemovalMembers(prev => [...prev, player]);
      
      const start = Date.now();
      await removeMemberFromTournament(tournamentId, player.id, user.uid);
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      
      setTargetActionStatus('success');
      
      await new Promise(r => setTimeout(r, 1200));
      
      setPendingRemovalMembers(prev => prev.filter(p => p.id !== player.id));
    } catch (err) {
      setPendingRemovalMembers(prev => prev.filter(p => p.id !== player.id));
      showInlineError((err as Error).message || "Erreur de suppression du participant.");
    } finally {
      setTargetActionId(null);
      setTargetActionStatus('idle');
    }
  };
  // --- End Guest Management Handlers ---

  const handleAddPendingAsGuests = async () => {
    if (!tournamentId || !user || invitedPendingNames.length === 0 || pendingGuestStatus !== 'idle') return;
    setPendingGuestStatus('loading');
    try {
      const start = Date.now();
      // Add each selected pending member as a guest one by one
      await Promise.all(
        invitedPendingNames.map(name => addGuestToTournament(tournamentId, name, user.uid))
      );
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

      setGuests(prev => [...prev, ...invitedPendingNames.filter(n => !prev.includes(n))]);
      setPendingGuestStatus('success');
      await new Promise(r => setTimeout(r, 1200));
      setInvitedPendingNames([]);
    } catch (err) {
      showInlineError((err as Error).message || "Erreur lors de l'ajout des membres non vérifiés.");
    } finally {
      setPendingGuestStatus('idle');
    }
  };

  const handleInviteMembers = async () => {
    if (!tournamentId || !user || invitedMembersIds.length === 0 || inviteStatus !== 'idle') return;
    setInviteStatus('loading');
    try {
      const membersToInvite = teamMembersDetails.filter(m => invitedMembersIds.includes(m.id));
      
      const start = Date.now();
      await inviteMembersToTournament(tournamentId, user.uid, membersToInvite);
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      
      setPendingInvitedMembers([...membersToInvite]);
      setInviteStatus('success');
      
      await new Promise(r => setTimeout(r, 1200));
      
      setInvitedMembersIds([]);
      setPendingInvitedMembers([]);
    } catch (err) {
      showInlineError((err as Error).message || "Erreur lors de l'invitation.");
    } finally {
      setInviteStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !user) {
      setError("Impossible de soumettre : informations manquantes.");
      return;
    }

    setSubmitStatus('loading');
    
    // Convert local datetime string back to a suitable format if needed, e.g., ISO string or timestamp
    const finalData = {
      ...tournamentData,
      date: tournamentData.date ? new Date(tournamentData.date).toISOString() : new Date().toISOString(),
    };

    try {
      const start = Date.now();
      await updateTournament(tournamentId, user.uid, finalData);
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));

      setSubmitStatus('success');
      setTimeout(() => navigate('/tournaments'), 1000);
    } catch (err) {
      console.error("Error updating tournament:", err);
      showInlineError((err as Error).message || "Une erreur est survenue lors de la mise à jour.");
      setSubmitStatus('idle');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Chargement des détails du tournoi...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-lg mx-auto glass-card p-8 relative">
      <h2 className="text-2xl font-bold mb-6 text-white">Modifier le Tournoi</h2>
      
      {inlineError && (
        <div className="mb-4 bg-red-500/15 border border-red-400/40 text-red-300 px-4 py-3 rounded relative flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="block sm:inline text-sm">{inlineError.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-200">Nom du Tournoi</label>
          <input
            type="text"
            id="name"
            name="name"
            value={tournamentData.name}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="glass-input mt-1 block w-full sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-200">Date et Heure</label>
          <input
            type="datetime-local"
            id="date"
            name="date"
            value={tournamentData.date}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="glass-input mt-1 block w-full sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="buyin" className="block text-sm font-medium text-gray-200">Buy-in (€)</label>
          <input
            type="number"
            id="buyin"
            name="buyin"
            value={tournamentData.buyin}
            onChange={handleChange}
            required
            min="0"
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="glass-input mt-1 block w-full sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-200">Joueurs Max</label>
          <input
            type="number"
            id="maxPlayers"
            name="maxPlayers"
            value={tournamentData.maxPlayers}
            onChange={handleChange}
            required
            min="2"
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="glass-input mt-1 block w-full sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-200">Lieu</label>
          <input
            type="text"
            id="location"
            name="location"
            value={tournamentData.location}
            onChange={handleChange}
            required
            // Find current tournament again for disabling logic, handle potential undefined
            disabled={tournaments.find(t => t.id === tournamentId)?.status === 'in_progress'}
            className="glass-input mt-1 block w-full sm:text-sm"
          />
        </div>

        {/* Guest Management Section - Conditionally Rendered based on status */}
        {(tournaments.find(t => t.id === tournamentId)?.status === 'scheduled' || tournaments.find(t => t.id === tournamentId)?.status === 'in_progress') && (
            <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">Membres du groupe</h3>

                {/* ── Single unified list: verified + pending + extra guests ── */}
                {(() => {
                    const currentTournament = tournaments.find(t => t.id === tournamentId);
                    const currentGuests = Array.from(new Set([...(currentTournament?.guests || []), ...guests]));
                    const pendingNameSet = new Set(pendingMembers.map(pm => pm.name));
                    const teamMemberNames = new Set(teamMembersDetails.map(member => member.name));
                    const extraGuests = Array.from(new Set([
                        ...currentGuests.filter(name => !pendingNameSet.has(name) && !teamMemberNames.has(name)),
                        ...(currentTournament?.registrations || [])
                            .filter(player => player.id.startsWith('guest_') && !pendingNameSet.has(player.name) && !teamMemberNames.has(player.name))
                            .map(player => player.name),
                    ]));
                    if (teamMembersDetails.length === 0 && pendingMembers.length === 0 && extraGuests.length === 0) {
                        return null;
                    }
                    return (
                        <div className="mb-6">
                            <ul className="list-none p-0 m-0 space-y-2 border border-white/10 rounded-xl p-2 bg-black/20 max-h-72 overflow-y-auto">

                                {/* Verified members */}
                                {teamMembersDetails.map((member) => {
                                    const reg = currentTournament?.registrations.find(r => r.id === member.id);
                                    const isPendingRemove = pendingRemovalMembers.find(p => p.id === member.id);
                                    const isPendingInvite = pendingInvitedMembers.find(p => p.id === member.id);
                                    const shouldRenderAsRegistered = !!reg || !!isPendingRemove || !!isPendingInvite;
                                    const memberStatus = reg?.status || isPendingRemove?.status || (isPendingInvite ? 'invited' : undefined);
                                    const isBeingInvited = !!isPendingInvite;

                                    return (
                                        <li key={member.id} className={`flex justify-between items-center px-3 py-2 min-h-[44px] glass-inset text-sm transition-all duration-300 ${isPendingRemove ? 'opacity-50' : 'opacity-100'}`}>
                                            {shouldRenderAsRegistered ? (
                                                <>
                                                    <span className="flex items-center gap-2">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                        <span className="font-medium text-white">{member.name}</span>
                                                        {memberStatus === 'invited' && <span className="text-xs text-orange-300 italic font-medium px-2 py-0.5 bg-orange-500/15 rounded-full border border-orange-400/30">En attente</span>}
                                                        {memberStatus === 'confirmed' && <span className="text-xs text-green-300 font-semibold px-2 py-0.5 bg-green-500/15 rounded-full border border-green-400/30">Inscrit</span>}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveMember(reg || isPendingRemove || isPendingInvite)}
                                                        className="text-gray-400 hover:text-red-500 disabled:opacity-50 relative w-6 h-6 flex items-center justify-center transition-colors"
                                                        aria-label={`Retirer ${member.name}`}
                                                        disabled={targetActionStatus !== 'idle' || !!isPendingRemove || !!isPendingInvite}
                                                    >
                                                        {targetActionId === member.id ? (
                                                            targetActionStatus === 'loading' ? (
                                                                <div className="w-4 h-4 border-2 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                                            ) : targetActionStatus === 'success' ? (
                                                                <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                                                            ) : <X className="w-4 h-4" />
                                                        ) : <X className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <label className="flex items-center justify-between cursor-pointer w-full group">
                                                    <span className="flex items-center gap-2">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                        <span className={`text-sm font-medium transition-colors ${isBeingInvited ? 'text-gray-500' : 'text-gray-200 group-hover:text-white'}`}>{member.name}</span>
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={invitedMembersIds.includes(member.id)}
                                                        disabled={inviteStatus !== 'idle'}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setInvitedMembersIds((prev) => [...prev, member.id]);
                                                            else setInvitedMembersIds((prev) => prev.filter(id => id !== member.id));
                                                        }}
                                                        className="w-4 h-4 text-poker-gold bg-white border-gray-300 rounded focus:ring-poker-gold focus:ring-2 disabled:opacity-50"
                                                    />
                                                </label>
                                            )}
                                        </li>
                                    );
                                })}

                                {/* Pending / unverified members */}
                                {pendingMembers.map(pm => {
                                    const isAlreadyGuest = currentGuests.includes(pm.name);
                                    const isBeingAdded = pendingGuestStatus !== 'idle' && invitedPendingNames.includes(pm.name);
                                    const isBeingRemoved = pendingRemovalGuests.includes(pm.name);
                                    return (
                                        <li
                                            key={`pending-${pm.name}`}
                                            className={`flex justify-between items-center px-3 py-2 min-h-[44px] glass-inset text-sm border-orange-400/30 transition-all duration-300 ${(isBeingAdded || isBeingRemoved) ? 'opacity-50' : 'opacity-100'}`}
                                        >
                                            {isAlreadyGuest ? (
                                                <>
                                                    <span className="flex items-center gap-2">
                                                        <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                                        <span className="font-medium text-white">{pm.name}</span>
                                                        <span className="text-xs text-green-300 font-semibold px-2 py-0.5 bg-green-500/15 rounded-full border border-green-400/30">Invité</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveGuest(pm.name)}
                                                        className="text-gray-400 hover:text-red-500 disabled:opacity-50 relative w-6 h-6 flex items-center justify-center transition-colors"
                                                        aria-label={`Retirer ${pm.name}`}
                                                        disabled={targetActionStatus !== 'idle'}
                                                    >
                                                        {targetActionId === pm.name ? (
                                                            targetActionStatus === 'loading' ? (
                                                                <div className="w-4 h-4 border-2 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                                            ) : targetActionStatus === 'success' ? (
                                                                <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                                                            ) : <X className="w-4 h-4" />
                                                        ) : <X className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            ) : (
                                                <label className="flex items-center justify-between cursor-pointer w-full group">
                                                    <span className="flex items-center gap-2">
                                                        <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                                        <span className="font-medium text-gray-200">{pm.name}</span>
                                                        <span className="text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full font-medium">Non vérifié</span>
                                                    </span>
                                                    <input
                                                        type="checkbox"
                                                        checked={invitedPendingNames.includes(pm.name)}
                                                        disabled={pendingGuestStatus !== 'idle'}
                                                        onChange={e => {
                                                            if (e.target.checked) setInvitedPendingNames(prev => [...prev, pm.name]);
                                                            else setInvitedPendingNames(prev => prev.filter(n => n !== pm.name));
                                                        }}
                                                        className="w-4 h-4 text-orange-500 bg-white border-orange-300 rounded focus:ring-orange-400 focus:ring-2 disabled:opacity-50"
                                                    />
                                                </label>
                                            )}
                                        </li>
                                    );
                                })}

                                {/* Extra guests (hors groupe) */}
                                {extraGuests.map(guestName => {
                                    const isBeingRemoved = pendingRemovalGuests.includes(guestName);
                                    return (
                                        <li
                                            key={`guest-${guestName}`}
                                            className={`flex justify-between items-center px-3 py-2 min-h-[44px] glass-inset text-sm transition-all duration-300 ${isBeingRemoved ? 'opacity-50' : 'opacity-100'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                                <span className="font-medium text-white">{guestName}</span>
                                                <span className="text-xs text-green-300 font-semibold px-2 py-0.5 bg-green-500/15 rounded-full border border-green-400/30">Invité</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveGuest(guestName)}
                                                className="text-gray-400 hover:text-red-500 disabled:opacity-50 relative w-6 h-6 flex items-center justify-center transition-colors"
                                                aria-label={`Retirer ${guestName}`}
                                                disabled={targetActionStatus !== 'idle' || isBeingRemoved}
                                            >
                                                {targetActionId === guestName ? (
                                                    targetActionStatus === 'loading' ? (
                                                        <div className="w-4 h-4 border-2 border-red-500 rounded-full border-t-transparent animate-spin"></div>
                                                    ) : targetActionStatus === 'success' ? (
                                                        <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
                                                    ) : <X className="w-4 h-4" />
                                                ) : <X className="w-4 h-4" />}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            {/* ── Action buttons — only shown when at least one item is checked ── */}
                            {(invitedMembersIds.length > 0 || invitedPendingNames.length > 0) && (
                                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                                    {invitedMembersIds.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleInviteMembers}
                                            disabled={inviteStatus !== 'idle'}
                                            className={`btn btn-gold min-h-[40px] min-w-[180px] ${inviteStatus === 'success' ? 'btn-green' : ''}`}
                                        >
                                            <span className={`w-full text-center transition-opacity duration-300 ${inviteStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                                Inviter {invitedMembersIds.length} membre(s)
                                            </span>
                                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${inviteStatus === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                                <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                            </div>
                                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${inviteStatus === 'success' ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
                                                <Check className="w-6 h-6 text-white" strokeWidth={3} />
                                            </div>
                                        </button>
                                    )}
                                    {invitedPendingNames.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleAddPendingAsGuests}
                                            disabled={pendingGuestStatus !== 'idle'}
                                            className={`btn btn-orange min-h-[40px] min-w-[180px] ${pendingGuestStatus === 'success' ? 'btn-green' : ''}`}
                                        >
                                            <span className={`w-full text-center transition-opacity duration-300 ${pendingGuestStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                                Ajouter {invitedPendingNames.length} non vérifié(s)
                                            </span>
                                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${pendingGuestStatus === 'loading' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                                                <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                            </div>
                                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${pendingGuestStatus === 'success' ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
                                                <Check className="w-6 h-6 text-white" strokeWidth={3} />
                                            </div>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                <label htmlFor="guestName" className="block text-sm font-medium text-gray-200 mb-1">
                    Ajouter un invité (hors groupe)
                </label>
                {/* Responsive guest input/button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
                    <input
                        type="text"
                        id="guestName"
                        value={currentGuest}
                        onChange={(e) => setCurrentGuest(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                void handleAddGuest();
                            }
                        }}
                        className="glass-input flex-grow sm:text-sm"
                        placeholder="Nom de l'invité"
                    />
                    {/* Button container */}
                    <div className="self-stretch sm:self-center">
                        <button
                            type="button"
                            onClick={handleAddGuest}
                            className={`btn btn-blue w-full sm:w-auto px-6 min-h-[40px] ${guestStatus === 'success' ? 'btn-green' : ''}`}
                            aria-label="Ajouter l'invité"
                            disabled={!currentGuest.trim() || guestStatus !== 'idle'}
                        >
                            <span className={`inline-flex items-center transition-opacity duration-300 ${guestStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                                <UserPlus className="w-5 h-5" />
                                <span className="sm:hidden ml-2">Ajouter</span>
                            </span>

                            {guestStatus === 'loading' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                                </div>
                            )}
                            
                            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${guestStatus === 'success' ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
                                <Check className="w-6 h-6 text-white" strokeWidth={3} />
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        )}
        {/* End Guest Management Section */}

        {/* Responsive Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          {tournaments.find(t => t.id === tournamentId)?.status === 'scheduled' ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/tournaments')}
                className="btn btn-ghost w-full sm:w-auto"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitStatus !== 'idle'}
                className={`btn btn-gold w-full sm:w-auto min-w-[200px] ${submitStatus === 'success' ? 'btn-green' : ''}`}
              >
                  <span className={`transition-opacity duration-300 ${submitStatus !== 'idle' ? 'opacity-0' : 'opacity-100'}`}>
                      Enregistrer les modifications
                  </span>

                  {submitStatus === 'loading' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      </div>
                  )}
                  
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${submitStatus === 'success' ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}>
                      <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/tournaments')}
              className="btn btn-gold w-full sm:w-auto"
            >
              Terminer
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
