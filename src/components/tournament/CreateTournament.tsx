// src/components/tournament/CreateTournament.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, AlertCircle, ShieldCheck, ShieldAlert, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTournamentStore } from '../../store/tournamentStore';
import { useTeamStore } from '../../store/useTeamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getUserData } from '../../lib/firebase';

const questions = [
    'Comment s’appelle votre tournoi ?',
    'Quand aura-t-il lieu ?',
    'Avec quel groupe jouez-vous ?',
    'Quel est le buy-in ?',
    'Combien de joueurs au maximum ?',
    'Où se retrouve-t-on ?',
    'Qui souhaitez-vous inviter ?',
    'Tout est prêt ?'
];
const fields = ['name', 'date', 'teamId', 'buyin', 'maxPlayers', 'location'] as const;

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
    const [startHour, setStartHour] = useState('20');
    const [startMinute, setStartMinute] = useState('00');
    const updateStartTime = (hour: string, minute: string) => {
        setStartHour(hour);
        setStartMinute(minute);
        setFormData(prev => ({
            ...prev,
            date: prev.date ? `${prev.date.split('T')[0]}T${hour}:${minute}` : '',
        }));
    };
    const [currentGuest, setCurrentGuest] = useState('');
    const [guests, setGuests] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [step, setStep] = useState(0);
    const [returnToReview, setReturnToReview] = useState(false);
    const [transition, setTransition] = useState<'idle' | 'out' | 'in'>('idle');
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const nextStep = useRef(0);
    const navigationLocked = useRef(false);
    const submittingRef = useRef(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    const goTo = (target: number) => {
        if (navigationLocked.current || submittingRef.current) return;
        navigationLocked.current = true;
        nextStep.current = target;
        setDirection(target < step ? 'backward' : 'forward');
        setError(null);
        setTransition('out');
    };

    useEffect(() => {
        headingRef.current?.focus({ preventScroll: true });
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [step]);

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
                        name: selectedTeam.memberNames?.[id] || data?.nickname || `Utilisateur_${id.substring(0, 5)}`
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
        if (navigationLocked.current || submittingRef.current) return;
        setError(null);
        if (step < questions.length - 1) {
            if (step < fields.length && !formData[fields[step]].trim()) {
                setError('Veuillez renseigner ce champ.');
                return;
            }
            if (step === 6 && currentGuest.trim()) {
                handleAddGuest();
                return;
            }
            goTo(returnToReview ? 7 : step + 1);
            setReturnToReview(false);
            return;
        }

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
            submittingRef.current = true;
            setIsSubmitting(true);
            try {
                const invitedMembersData = teamMembersDetails.filter(m => invitedMembersIds.includes(m.id));

                // Merge manually typed guests + selected pending members into the guests list
                const allGuests = [...guests, ...invitedPendingNames];

                await addTournament(
                    {
                        name: formData.name.trim(),
                        date: formData.date,
                        buyin: Number(formData.buyin),
                        maxPlayers: Number(formData.maxPlayers),
                        location: formData.location.trim(),
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
                submittingRef.current = false;
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

    const summary = [
        formData.name,
        formData.date && !isNaN(new Date(formData.date).getTime()) ? new Date(formData.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '',
        teams.find(team => team.id === formData.teamId)?.name,
        `${formData.buyin} € par joueur`,
        `${formData.maxPlayers} joueurs maximum`,
        formData.location,
        [...teamMembersDetails.filter(member => invitedMembersIds.includes(member.id)).map(member => member.name), ...invitedPendingNames, ...guests].join(', ') || 'Aucun invité supplémentaire'
    ];
    const labels = ['Nom', 'Date et heure', 'Groupe', 'Buy-in', 'Capacité', 'Lieu', 'Invités'];

    return (
        <form onSubmit={handleSubmit} className="w-full flex flex-col overflow-hidden" aria-label="Création d’un tournoi">
            <div className="shrink-0 mb-5">
                <p className="text-xs text-gray-400 mb-2" aria-live="polite">Étape {step + 1} sur {questions.length}</p>
                <div className="flex gap-1" aria-hidden="true">
                    {questions.map((question, index) => <span key={question} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-poker-gold' : 'bg-white/10'}`} />)}
                </div>
            </div>
            <fieldset disabled={isSubmitting || transition !== 'idle'} className={`min-w-0 flex flex-col game-wizard-${transition}-${direction}`}
                onAnimationEnd={event => {
                    if (event.target !== event.currentTarget) return;
                    if (transition === 'out') { setStep(nextStep.current); setTransition('in'); }
                    else if (transition === 'in') { navigationLocked.current = false; setTransition('idle'); }
                }}>
                <div ref={bodyRef} className="space-y-5 min-h-[240px] max-h-[55dvh] overflow-y-auto px-1 pb-5" style={{ overscrollBehavior: 'contain' }}>
                    <h2 ref={headingRef} tabIndex={-1} className="text-xl sm:text-2xl font-semibold text-white outline-none">{questions[step]}</h2>
                    {step === 0 && (
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="name" className="block text-sm font-semibold text-gray-200 mb-1.5">
                            Nom du tournoi
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="glass-input w-full px-4 py-2.5 rounded-xl"
                            placeholder="Ex: Main Event Friday"
                        />
                    </div>
                    )}
                    {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-semibold text-gray-200 mb-1.5">Date</label>
                            <input
                                type="date"
                                id="date"
                                value={formData.date.split('T')[0]}
                                onChange={event => {
                                    const day = event.target.value;
                                    setFormData(prev => ({ ...prev, date: day ? `${day}T${startHour}:${startMinute}` : '' }));
                                }}
                                required
                                className="glass-input w-full min-w-0 px-4 py-2.5 rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="startHour" className="block text-sm font-semibold text-gray-200 mb-1.5">Heure</label>
                                <select id="startHour" value={startHour} onChange={event => updateStartTime(event.target.value, startMinute)} className="glass-input w-full px-4 py-2.5 rounded-xl">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const value = String(hour).padStart(2, '0');
                                        return <option key={value} value={value}>{value} h</option>;
                                    })}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="startMinute" className="block text-sm font-semibold text-gray-200 mb-1.5">Minutes</label>
                                <select id="startMinute" value={startMinute} onChange={event => updateStartTime(startHour, event.target.value)} className="glass-input w-full px-4 py-2.5 rounded-xl">
                                    {['00', '15', '30', '45'].map(minute => <option key={minute} value={minute}>{minute}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    )}
                    {step === 2 && (
                    <div>
                        <label htmlFor="teamId" className="block text-sm font-semibold text-gray-200 mb-1.5">
                            Groupe
                        </label>
                        <select
                            id="teamId"
                            value={formData.teamId}
                            onChange={handleChange}
                            required
                            className="glass-input w-full px-4 py-2.5 rounded-xl transition-all"
                        >
                            <option value="">Sélectionner un groupe</option>
                            {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    )}
                    {step === 3 && (
                    <div>
                        <label htmlFor="buyin" className="block text-sm font-semibold text-gray-200 mb-1.5">
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
                            className="glass-input w-full px-4 py-2.5 rounded-xl"
                            placeholder="20"
                        />
                    </div>
                    )}
                    {step === 4 && (
                    <div>
                        <label htmlFor="maxPlayers" className="block text-sm font-semibold text-gray-200 mb-1.5">
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
                            className="glass-input w-full px-4 py-2.5 rounded-xl"
                            placeholder="9"
                        />
                    </div>
                    )}
                    {step === 5 && (
                    <div className="col-span-1 md:col-span-2">
                        <label htmlFor="location" className="block text-sm font-semibold text-gray-200 mb-1.5">
                            Lieu
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="glass-input w-full px-4 py-2.5 rounded-xl"
                            placeholder="Ex: Chez Alex"
                        />
                    </div>
                    )}
                    {step === 2 && teams.length === 0 && <p className="text-sm text-amber-200">Un groupe est nécessaire. Créez ou rejoignez un groupe pour organiser votre tournoi.</p>}
                    {step === 6 && <>
                        <p className="text-sm text-gray-400">Cette étape est facultative. Vous pourrez aussi inviter des joueurs plus tard.</p>
                {/* ── Group Members (verified + pending) ── */}
                {hasGroupMembers && (
                    <div className="pt-4 border-t border-white/10">
                        <label className="block text-sm font-semibold text-gray-200 mb-3">
                            Inviter des membres du groupe
                        </label>

                        {/* Verified members */}
                        {teamMembersDetails.length > 0 && (
                            <>
                                <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                    Membres vérifiés
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                                    {teamMembersDetails.map((member) => (
                                        <label
                                            key={member.id}
                                            className="flex items-center space-x-3 p-2.5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
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
                                            <span className="text-sm text-gray-200 font-medium">{member.name}</span>
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
                                            className="flex items-center space-x-3 p-2.5 border border-orange-400/30 bg-orange-500/10 rounded-lg cursor-pointer hover:bg-orange-500/15 transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={invitedPendingNames.includes(pm.name)}
                                                onChange={(e) => togglePendingMember(pm.name, e.target.checked)}
                                                className="w-4 h-4 text-orange-500 bg-white border-orange-300 rounded focus:ring-orange-400 focus:ring-2"
                                            />
                                            <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-200 font-medium">{pm.name}</span>
                                            <span className="ml-auto text-xs bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
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
                <div className="pt-4 border-t border-white/10">
                    <label htmlFor="guestName" className="block text-sm font-semibold text-gray-200 mb-1.5">
                        Ajouter des invités supplémentaires (optionnel)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="guestName"
                            value={currentGuest}
                            onChange={(e) => setCurrentGuest(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGuest())}
                            className="glass-input min-w-0 flex-grow px-4 py-2.5 rounded-xl"
                            placeholder="Nom de l'invité"
                        />
                        <button
                            type="button"
                            aria-label="Ajouter cet invité"
                            onClick={handleAddGuest}
                            className="btn btn-blue px-4 py-2.5 shrink-0"
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
                                        aria-label={`Retirer ${guest}`}
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


                    </>}
                    {step === 7 && <>
                        <p className="text-sm text-gray-400">Vérifiez vos choix avant de créer le tournoi.</p>
                        {summary.map((value, index) => (
                            <div key={labels[index]} className="rounded-xl bg-white/5 p-3 flex items-start justify-between gap-3">
                                <div className="min-w-0"><p className="text-xs text-gray-400">{labels[index]}</p><p className="text-sm text-gray-100 break-words">{value}</p></div>
                                <button type="button" onClick={() => { setReturnToReview(true); goTo(index); }} aria-label={`Modifier : ${labels[index]}`} className="text-sm text-poker-gold shrink-0">Modifier</button>
                            </div>
                        ))}
                    </>}
                </div>
                {error && <p role="alert" className="my-3 text-sm text-red-300 flex items-center gap-2"><AlertCircle className="w-5 h-5 shrink-0" />{error}</p>}
                <div className="shrink-0 border-t border-white/10 pt-4 flex items-center justify-between gap-2">
                    <button type="button" onClick={() => { if (returnToReview) { setReturnToReview(false); goTo(7); } else if (step > 0) goTo(step - 1); else if (onClose) onClose(); else navigate('/tournaments'); }} className="btn btn-ghost gap-1">
                        {step > 0 && <ArrowLeft size={16} aria-hidden="true" />}{step === 0 && !returnToReview ? 'Annuler' : 'Retour'}
                    </button>
                    <button type="submit" className="btn btn-gold gap-2">
                        {isSubmitting ? 'Création…' : step === 7 ? 'Créer le tournoi' : step === 6 || returnToReview ? 'Voir le récapitulatif' : 'Continuer'}
                        {step < 7 && <ArrowRight size={16} aria-hidden="true" />}
                    </button>
                </div>
            </fieldset>
        </form>
    );
}
