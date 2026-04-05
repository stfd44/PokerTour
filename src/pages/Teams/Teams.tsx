import React, { useEffect, useState, useCallback } from 'react';
import { useTeamStore, Team } from '../../store/useTeamStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Trash2, UserPlus, UserMinus, LogIn, Users, UserSearch, X, Hash, ShieldAlert, ShieldCheck } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const Teams: React.FC = () => {
  const { user } = useAuthStore();
  const { teams, createTeam, fetchTeams, leaveTeam, joinTeam, deleteTeam, joinTeamByTag, addMemberByName, removePendingMember } = useTeamStore();
  const [newTeamName, setNewTeamName] = useState('');
  const [joinTag, setJoinTag] = useState('');
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberDetails, setMemberDetails] = useState<{ [userId: string]: { name: string } }>({});
  const [loadingMemberDetails, setLoadingMemberDetails] = useState<boolean>(false);
  const [confirmDeleteTeamId, setConfirmDeleteTeamId] = useState<string | null>(null);

  // Add member modal state
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberNickname, setAddMemberNickname] = useState('');
  const [addMemberMessage, setAddMemberMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addingMember, setAddingMember] = useState(false);

  // Confirm remove pending member state
  const [confirmRemovePending, setConfirmRemovePending] = useState<{ teamId: string; name: string } | null>(null);

  const fetchMemberDetails = useCallback(async (memberIds: string[]) => {
    setLoadingMemberDetails(true);
    const detailsToFetch = memberIds.filter(id => !memberDetails[id]);
    if (detailsToFetch.length === 0) {
      setLoadingMemberDetails(false);
      return;
    }

    const fetchedDetails: { [userId: string]: { name: string } } = {};
    try {
      const promises = detailsToFetch.map(async (id) => {
        const userDocRef = doc(db, 'users', id);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          fetchedDetails[id] = { name: userDocSnap.data().nickname || userDocSnap.data().displayName || 'Utilisateur inconnu' };
        } else {
          fetchedDetails[id] = { name: 'Utilisateur inconnu' };
        }
      });
      await Promise.all(promises);
      setMemberDetails(prev => ({ ...prev, ...fetchedDetails }));
    } catch (error) {
      console.error("Error fetching member details:", error);
      detailsToFetch.forEach(id => {
        if (!fetchedDetails[id]) fetchedDetails[id] = { name: 'Erreur chargement' };
      });
      setMemberDetails(prev => ({ ...prev, ...fetchedDetails }));
    } finally {
      setLoadingMemberDetails(false);
    }
  }, [memberDetails]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  useEffect(() => {
    const allMemberIds = teams.reduce((acc, team) => {
      team.members.forEach(id => acc.add(id));
      return acc;
    }, new Set<string>());
    if (allMemberIds.size > 0) fetchMemberDetails(Array.from(allMemberIds));
  }, [teams, fetchMemberDetails]);

  const handleCreateTeam = async () => {
    if (!user) {
      setJoinMessage({ type: 'error', text: 'Vous devez être connecté pour créer un groupe' });
      return;
    }
    if (newTeamName.trim() === '') {
      setJoinMessage({ type: 'error', text: 'Veuillez entrer un nom pour votre groupe' });
      return;
    }
    try {
      await createTeam(newTeamName);
      setNewTeamName('');
      setJoinMessage({ type: 'success', text: 'Groupe créé avec succès !' });
      setTimeout(() => setJoinMessage(null), 3000);
    } catch (error) {
      setJoinMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de la création du groupe'
      });
    }
  };

  const handleLeaveTeam = async (teamId: string) => {
    if (user) await leaveTeam(teamId, user.uid);
  };

  const handleJoinTeam = async (teamId: string) => {
    if (user) await joinTeam(teamId, user.uid);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (user) setConfirmDeleteTeamId(teamId);
  };

  const confirmDeleteTeam = async () => {
    if (user && confirmDeleteTeamId) {
      try {
        await deleteTeam(confirmDeleteTeamId, user.uid);
      } catch (error) {
        console.error('Error deleting team:', error);
        alert((error as Error).message);
      } finally {
        setConfirmDeleteTeamId(null);
      }
    }
  };

  const handleJoinByTag = async () => {
    if (joinTag.trim() === '') {
      setJoinMessage({ type: 'error', text: 'Veuillez entrer un code de groupe.' });
      return;
    }
    setJoinMessage(null);
    try {
      await joinTeamByTag(joinTag.trim());
      setJoinMessage({ type: 'success', text: 'Groupe rejoint avec succès !' });
      setJoinTag('');
      setTimeout(() => setJoinMessage(null), 3000);
    } catch (error) {
      setJoinMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Une erreur inconnue est survenue.'
      });
    }
  };

  const openAddMemberModal = (teamId: string) => {
    setAddMemberTeamId(teamId);
    setAddMemberNickname('');
    setAddMemberMessage(null);
  };

  const closeAddMemberModal = () => {
    setAddMemberTeamId(null);
    setAddMemberNickname('');
    setAddMemberMessage(null);
  };

  const handleAddMemberByName = async () => {
    if (!addMemberTeamId || addMemberNickname.trim() === '') {
      setAddMemberMessage({ type: 'error', text: 'Veuillez saisir un nom.' });
      return;
    }
    setAddingMember(true);
    setAddMemberMessage(null);
    try {
      const result = await addMemberByName(addMemberTeamId, addMemberNickname.trim());
      if (result.verified) {
        setAddMemberMessage({
          type: 'success',
          text: `✓ ${result.name} a été ajouté en tant que membre vérifié.`
        });
      } else {
        setAddMemberMessage({
          type: 'success',
          text: `⚠ "${result.name}" ajouté comme membre non vérifié. Il apparaîtra dans la liste jusqu'à ce qu'il crée son compte.`
        });
      }
      setAddMemberNickname('');
      await fetchTeams();
    } catch (error) {
      setAddMemberMessage({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de l'ajout du membre"
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemovePendingMember = async () => {
    if (!confirmRemovePending) return;
    try {
      await removePendingMember(confirmRemovePending.teamId, confirmRemovePending.name);
    } catch (error) {
      console.error('Error removing pending member:', error);
    } finally {
      setConfirmRemovePending(null);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Communauté</h1>
        <p className="text-gray-600 text-base leading-relaxed">
          Créez ou rejoignez votre communauté, votre circuit ou votre championnat,
          ou tout simplement votre groupe d'amis avec lesquels vous jouez le plus souvent.
        </p>
      </div>

      {/* Create Group Section */}
      <div className="mb-6 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-1 text-gray-800">Créer un Championnat, un Circuit ou un Groupe</h2>
        <p className="text-sm text-gray-500 mb-4">Vous en deviendrez automatiquement le créateur et pourrez inviter vos joueurs.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            placeholder="Nom de votre groupe, circuit ou championnat"
            className="border border-gray-300 px-3 py-2 rounded-lg flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
          />
          <button
            onClick={handleCreateTeam}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Créer
          </button>
        </div>
        {joinMessage && (
          <p className={`text-sm mt-2 ${joinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {joinMessage.text}
          </p>
        )}
      </div>

      {/* Join Group Section */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-1 text-gray-800">Rejoindre un Championnat, un Circuit ou un Groupe</h2>
        <p className="text-sm text-gray-500 mb-4">
          Entrez le code unique du groupe (ex&nbsp;: <span className="font-mono bg-gray-100 px-1 rounded">nom_groupe_1234</span>) partagé par son créateur.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
          <div className="relative flex-grow">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Code du groupe (ex : amis_poker_2847)"
              className="border border-gray-300 pl-9 pr-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
              value={joinTag}
              onChange={(e) => setJoinTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByTag()}
            />
          </div>
          <button
            onClick={handleJoinByTag}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <LogIn className="w-4 h-4" />
            Rejoindre
          </button>
        </div>
        {joinMessage && (
          <p className={`text-sm mt-1 ${joinMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {joinMessage.text}
          </p>
        )}
      </div>

      {/* Group List */}
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Mes Groupes</h2>
      {teams.length > 0 ? (
        <ul className="space-y-4">
          {teams.map((team: Team) => {
            const isCreatorOfTeam = user?.uid === team.creatorId;
            const pendingMembers = team.pendingMembers || [];
            const totalCount = team.members.length + pendingMembers.length;

            return (
              <li key={team.id} className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                {/* Team Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <div className="mb-1 sm:mb-0">
                    <span className="font-semibold text-lg text-gray-900">{team.name}</span>
                    <div className="flex items-center mt-1 gap-1">
                      <Hash className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded select-all">{team.tag}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Créé le : {team.createdAt.toLocaleDateString()}</p>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0 justify-start sm:justify-end">
                    {isCreatorOfTeam && (
                      <button
                        onClick={() => openAddMemberModal(team.id)}
                        title="Ajouter un membre"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 text-sm transition-colors border border-blue-200"
                      >
                        <UserSearch className="w-4 h-4" />
                        <span className="hidden sm:inline">Ajouter</span>
                      </button>
                    )}
                    {isCreatorOfTeam && (
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        title="Supprimer le groupe"
                        className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1.5 px-2 rounded-lg flex items-center text-sm transition-colors border border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {team.members.includes(user?.uid || '') ? (
                      <button
                        onClick={() => handleLeaveTeam(team.id)}
                        title="Quitter le groupe"
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-800 font-semibold py-1.5 px-2 rounded-lg flex items-center text-sm transition-colors border border-yellow-200"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    ) : team.pastMembers.includes(user?.uid || '') ? (
                      <button
                        onClick={() => handleJoinTeam(team.id)}
                        title="Rejoindre le groupe"
                        className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-1.5 px-2 rounded-lg flex items-center text-sm transition-colors border border-green-200"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Members List */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-semibold mb-3 flex items-center text-gray-700">
                    <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                    Membres ({totalCount})
                    {pendingMembers.length > 0 && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                        {pendingMembers.length} non vérifié{pendingMembers.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </h4>

                  {/* Verified members */}
                  {loadingMemberDetails && team.members.some(id => !memberDetails[id]) ? (
                    <p className="text-xs text-gray-500 italic mb-2">Chargement des membres...</p>
                  ) : (
                    <ul className="space-y-1.5 mb-3">
                      {team.members.map(memberId => (
                        <li key={memberId} className="text-sm text-gray-700 flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span>{memberDetails[memberId]?.name || memberId}</span>
                          <div className="flex items-center gap-1 ml-auto">
                            {memberId === user?.uid && (
                              <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">Vous</span>
                            )}
                            {memberId === team.creatorId && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Créateur</span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Pending / unverified members */}
                  {pendingMembers.length > 0 && (
                    <>
                      <div className="border-t border-dashed border-orange-200 pt-3 mt-1">
                        <p className="text-xs text-orange-500 font-medium mb-2 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Membres non vérifiés — en attente de création de compte
                        </p>
                        <ul className="space-y-1.5">
                          {pendingMembers.map((pm) => (
                            <li key={pm.name} className="text-sm flex items-center gap-2">
                              <ShieldAlert className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                              <span className="text-gray-600">{pm.name}</span>
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                                Non vérifié
                              </span>
                              {/* Only creator can remove pending members */}
                              {isCreatorOfTeam && (
                                <button
                                  onClick={() => setConfirmRemovePending({ teamId: team.id, name: pm.name })}
                                  title="Retirer ce membre"
                                  className="ml-auto text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="italic">Vous n'êtes membre d'aucun groupe pour le moment.</p>
          <p className="text-sm mt-1">Créez votre premier groupe ou rejoignez-en un avec un code.</p>
        </div>
      )}

      {/* ── Modal: Add Member by Name ── */}
      {addMemberTeamId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl">
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-lg font-bold text-gray-900">Ajouter un membre</h3>
              <button onClick={closeAddMemberModal} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Saisissez le pseudo exact du joueur. S'il n'existe pas encore dans l'application,
              il sera ajouté comme <span className="font-medium text-orange-600">membre non vérifié</span> jusqu'à
              ce qu'il crée son compte.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Pseudo du joueur"
                className="border border-gray-300 px-3 py-2 rounded-lg flex-grow focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                value={addMemberNickname}
                onChange={(e) => setAddMemberNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMemberByName()}
                autoFocus
              />
              <button
                onClick={handleAddMemberByName}
                disabled={addingMember}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm flex items-center gap-1.5"
              >
                {addingMember ? (
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Ajouter
              </button>
            </div>

            {addMemberMessage && (
              <div className={`text-sm px-3 py-2 rounded-lg ${
                addMemberMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {addMemberMessage.text}
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={closeAddMemberModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm remove pending member ── */}
      {confirmRemovePending && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Retirer le membre ?</h3>
            <p className="text-gray-600 mb-1">
              Voulez-vous retirer <span className="font-semibold">"{confirmRemovePending.name}"</span> de la liste des membres ?
            </p>
            <p className="text-sm text-gray-400 mb-6">Ce membre n'est pas encore inscrit dans l'application.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemovePending(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleRemovePendingMember}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium"
              >
                Oui, retirer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirm delete group ── */}
      {confirmDeleteTeamId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-auto shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Supprimer le groupe ?</h3>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer ce groupe ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteTeamId(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteTeam}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium"
              >
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
