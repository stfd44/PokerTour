// src/components/tournament/CreateTournament.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getUserData } from '../../lib/firebase';
import { cn } from '../../lib/utils';

interface CreateTournamentProps {
    onClose?: () => void;
    onSuccess?: () => void;
}

export function CreateTournament({ onClose, onSuccess }: CreateTournamentProps) {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const { addTournament, fetchTournaments } = useTournamentStore();
    const { teams, fetchTeams } = useTeamStore();
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        buyin: '',
        maxPlayers: '',
        location: '',
        teamId: '',
    });
    const [currentGuest, setCurrentGuest] = useState('');
    const [guests, setGuests] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Verified team members (have an account)
    const [teamMembersDetails, setTeamMembersDetails] = useState<{ id: string; name: string }[]>([]);
    const [invitedMembersIds, setInvitedMembersIds] = useState<string[]>([]);

    // Pending/unverified members from the group
    const [pendingMembers, setPendingMembers] = useState<{ name: string }[]>([]);
    const [invitedPendingNames, setInvitedPendingNames] = useState<string[]>([]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (!formData.teamId || !user) {
                setTeamMembersDetails([]);
                setInvitedMembersIds([]);
                setPendingMembers([]);
                setInvitedPendingNames([]);
                return;
            }
            const selectedTeam = teams.find(t => t.id === formData.teamId);
            if (selectedTeam) {
                // Verified members (excluding creator)
                const memberIds = selectedTeam.members.filter(id => id !== user.uid);
                const membersData = await Promise.all(memberIds.map(async (id) => {
                    const data = await getUserData(id);
                    return {
                        id,
                        name: data?.nickname || `Utilisateur_${id.substring(0, 5)}`
                    };
                }));
                setTeamMembersDetails(membersData);
                setInvitedMembersIds([]);

                // Pending/unverified members
                setPendingMembers(selectedTeam.pendingMembers || []);
                setInvitedPendingNames([]);
            }
        };
        fetchTeamMembers();
    }, [formData.teamId, teams, user]);

    const handleAddGuest = () => {
        if (currentGuest.trim() && !guests.includes(currentGuest.trim())) {
            setGuests([...guests, currentGuest.trim()]);
            setCurrentGuest('');
            setError(null);
        } else if (guests.includes(currentGuest.trim())) {
            setError('Ce nom est déjà dans la liste des invités.');
        }
    };

    const handleRemoveGuest = (guestToRemove: string) => {
        setGuests(guests.filter(guest => guest !== guestToRemove));
    };

    const togglePendingMember = (name: string, checked: boolean) => {
        if (checked) {
            setInvitedPendingNames(prev => [...prev, name]);
        } else {
            setInvitedPendingNames(prev => prev.filter(n => n !== name));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.date || isNaN(new Date(formData.date).getTime())) {
            setError("Veuillez sélectionner une date et heure valides.");
            setIsSubmitting(false);
            return;
        }

        if (!formData.teamId) {
            setError("Veuillez sélectionner un groupe.");
            return;
        }

        if (user) {
            setIsSubmitting(true);
            try {
                const invitedMembersData = teamMembersDetails.filter(m => invitedMembersIds.includes(m.id));

                // Merge manually typed guests + selected pending members into the guests list
                const allGuests = [...guests, ...invitedPendingNames];

                await addTournament(
                    {
                        name: formData.name,
                        date: formData.date,
                        buyin: Number(formData.buyin),
                        maxPlayers: Number(formData.maxPlayers),
                        location: formData.location,
                        teamId: formData.teamId,
                    },
                    user.uid,
                    formData.teamId,
                    allGuests,
                    invitedMembersData
                );

                await fetchTournaments(user.uid);

                if (onSuccess) {
                    onSuccess();
                } else {
                    navigate('/tournaments');
                }
            } catch (err) {
                console.error('Error creating tournament:', err);
                setError('Une erreur est survenue lors de la création du tournoi.');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: value,
        }));
    };

    const hasGroupMembers = teamMembersDetails.length > 0 || pendingMembers.length > 0;

    return (
        <div className="w-full">
            {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-5">
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Nom du tournoi
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                            placeholder="Ex: Main Event Friday"
                        />
                    </div>

                    <div>
                        <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Date et Heure
                        </label>
                        <input
                            type="datetime-local"
                            id="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="teamId" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Groupe
                        </label>
                        <select
                            id="teamId"
                            value={formData.teamId}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none bg-white"
                        >
                            <option value="">Sélectionner un groupe</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="buyin" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Buy-in (€)
                        </label>
                        <input
                            type="number"
                            id="buyin"
                            value={formData.buyin}
                            onChange={handleChange}
                            required
                            min="0"
                            step="5"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                            placeholder="20"
                        />
                    </div>

                    <div>
                        <label htmlFor="maxPlayers" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Joueurs Max
                        </label>
                        <input
                            type="number"
                            id="maxPlayers"
                            value={formData.maxPlayers}
                            onChange={handleChange}
                            required
                            min="2"
                            max="100"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                            placeholder="9"
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Lieu
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                            placeholder="Ex: Chez Alex"
                        />
                    </div>
                </div>

                {/* ── Group Members (verified + pending) ── */}
                {hasGroupMembers && (
                    <div className="pt-4 border-t border-gray-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Inviter des membres du groupe
                        </label>

                        {/* Verified members */}
                        {teamMembersDetails.length > 0 && (
                            <>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                    Membres vérifiés
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    {teamMembersDetails.map((member) => (
                                        <label
                                            key={member.id}
                                            className="flex items-center space-x-3 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={invitedMembersIds.includes(member.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setInvitedMembersIds(prev => [...prev, member.id]);
                                                    } else {
                                                        setInvitedMembersIds(prev => prev.filter(id => id !== member.id));
                                                    }
                                                }}
                                                className="w-4 h-4 text-poker-gold bg-white border-gray-300 rounded focus:ring-poker-gold focus:ring-2"
                                            />
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 font-medium">{member.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Pending / unverified members */}
                        {pendingMembers.length > 0 && (
                            <>
                                <p className="text-xs text-orange-500 flex items-center gap-1 mb-2">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Membres non vérifiés — pas encore inscrit dans l'application
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {pendingMembers.map((pm) => (
                                        <label
                                            key={pm.name}
                                            className="flex items-center space-x-3 p-2.5 border border-orange-200 bg-orange-50/40 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={invitedPendingNames.includes(pm.name)}
                                                onChange={(e) => togglePendingMember(pm.name, e.target.checked)}
                                                className="w-4 h-4 text-orange-500 bg-white border-orange-300 rounded focus:ring-orange-400 focus:ring-2"
                                            />
                                            <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 font-medium">{pm.name}</span>
                                            <span className="ml-auto text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                                                Non vérifié
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Manual guests ── */}
                <div className="pt-4 border-t border-gray-100">
                    <label htmlFor="guestName" className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Ajouter des invités supplémentaires (optionnel)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="guestName"
                            value={currentGuest}
                            onChange={(e) => setCurrentGuest(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGuest())}
                            className="flex-grow px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-poker-gold focus:border-transparent transition-all outline-none"
                            placeholder="Nom de l'invité"
                        />
                        <button
                            type="button"
                            onClick={handleAddGuest}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition-colors flex items-center shrink-0"
                        >
                            <UserPlus className="h-5 w-5" />
                        </button>
                    </div>

                    {guests.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {guests.map((guest, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 bg-poker-gold/10 text-poker-gold border border-poker-gold/20 px-3 py-1 rounded-full text-sm font-medium"
                                >
                                    {guest}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveGuest(guest)}
                                        className="hover:text-poker-red transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 mt-2 flex gap-3 border-t border-gray-100 pb-8">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                        >
                            Annuler
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                            "flex-[2] bg-poker-red text-white py-3 rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg shadow-poker-red/20",
                            isSubmitting && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isSubmitting ? 'Création...' : 'Créer le tournoi'}
                    </button>
                </div>
            </form>
        </div>
    );
}
