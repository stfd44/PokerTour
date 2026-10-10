import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTeamStore, type BlindPreset } from '../store/useTeamStore';
import { useAuthStore } from '../store/useAuthStore';
import { BlindPresetForm } from '../components/teams/BlindPresetForm';

export default function Settings() {
  const { user } = useAuthStore();
  const { teams, fetchTeams, deleteBlindPreset } = useTeamStore();
  const [presetEditor, setPresetEditor] = useState<{ teamId: string; teamName: string; preset?: BlindPreset } | null>(null);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleDeleteBlindPreset = async (teamId: string, presetId: string) => {
    try {
      await deleteBlindPreset(teamId, presetId);
    } catch (error) {
      console.error('Error deleting blind preset:', error);
      alert((error as Error).message);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      {presetEditor && <BlindPresetForm {...presetEditor} onClose={() => setPresetEditor(null)} />}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-sm">Paramètres</h1>
        <p className="text-gray-200 text-base leading-relaxed">
          Gérez les structures de blindes de vos groupes pour vos prochaines parties.
        </p>
      </div>
      <h2 className="text-xl font-semibold mb-4 text-white">Structures de blindes</h2>
      {teams.length > 0 ? (
        <ul className="space-y-4">
          {teams.map((team) => {
            const isCreatorOfTeam = user?.uid === team.creatorId;
            const isMemberOfTeam = team.members.includes(user?.uid || '');

            return (
              <li key={team.id} className="glass-card p-5">
                <h3 className="font-semibold text-lg text-white">{team.name}</h3>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h4 className="text-sm font-semibold flex items-center text-gray-200">
                      <Layers className="w-4 h-4 mr-1.5 text-gray-400" />
                      Structures de blindes ({team.blindPresets?.length || 0})
                    </h4>
                    {isMemberOfTeam && (
                      <button onClick={() => setPresetEditor({ teamId: team.id, teamName: team.name })} className="btn btn-blue py-1.5 px-3 text-sm">
                        <Plus className="w-4 h-4" />Créer une structure
                      </button>
                    )}
                  </div>

                  {team.blindPresets && team.blindPresets.length > 0 ? (
                    <ul className="space-y-2">
                      {team.blindPresets.map((preset) => (
                        <li key={preset.id} className="flex items-center justify-between gap-3 text-sm glass-inset px-3 py-2">
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{preset.name}</p>
                            <p className="text-xs text-gray-400">
                              Stack {preset.startingStack.toLocaleString()} | {preset.levels.length} niveaux | Départ {preset.levels[0]?.blinds.small}/{preset.levels[0]?.blinds.big} | {preset.rebuyLimitMode === 'max_per_player' ? `Recaves : ${preset.maxRebuysPerPlayer ?? 2} max par joueur` : `Rebuy jusqu'au niveau ${preset.rebuyAllowedUntilLevel}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isMemberOfTeam && (
                              <button onClick={() => setPresetEditor({ teamId: team.id, teamName: team.name, preset })} aria-label={`Modifier la structure ${preset.name}`} title="Modifier cette structure" className="text-blue-300 hover:text-blue-200 transition-colors p-1 rounded">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {isCreatorOfTeam && (
                              <button
                                onClick={() => handleDeleteBlindPreset(team.id, preset.id)}
                                title="Supprimer cette structure"
                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Aucune structure enregistrée. Les membres du groupe peuvent en créer ici pour les prochaines parties.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="glass-card p-6 text-center text-gray-400">
          <Layers className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p>Rejoignez ou créez un groupe pour gérer ses structures de blindes.</p>
          <Link to="/teams" className="btn btn-blue mt-4">Accéder à la communauté</Link>
        </div>
      )}
    </div>
  );
}
