import React, { useState } from 'react';
import {
  X, Database, Plus, Upload, Download, Search, Check, AlertCircle, Trash2, Edit2
} from 'lucide-react';
import { Player, PlayerRole } from '../types';
import { INITIAL_PLAYER_POOL, parseCSVToPlayers, validatePlayer, VERIFIED_DATA_CUTOFF } from '../data/players';
import { IPL_TEAMS } from '../data/teams';

interface PlayerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPool: Player[];
  onUpdatePlayerPool: (newPool: Player[]) => void;
}

export const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  isOpen,
  onClose,
  playerPool,
  onUpdatePlayerPool,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // New Player Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<PlayerRole>('batter');
  const [formNationality, setFormNationality] = useState('India');
  const [formIsOverseas, setFormIsOverseas] = useState(false);
  const [formBattingStyle, setFormBattingStyle] = useState('Right-hand bat');
  const [formBowlingStyle, setFormBowlingStyle] = useState('');
  const [formBasePriceCr, setFormBasePriceCr] = useState('2.0');
  const [formCategory, setFormCategory] = useState<Player['category']>('Batters');
  const [formOriginalTeam, setFormOriginalTeam] = useState('');
  const [formImage, setFormImage] = useState('');

  if (!isOpen) return null;

  const filteredPlayers = playerPool.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.nationality.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    const basePrice = parseFloat(formBasePriceCr);
    const newPlayer: Player = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: formName.trim(),
      role: formRole,
      nationality: formNationality.trim(),
      isOverseas: formIsOverseas,
      battingStyle: formBattingStyle,
      bowlingStyle: formBowlingStyle ? formBowlingStyle : undefined,
      basePriceCr: isNaN(basePrice) ? 1.0 : basePrice,
      category: formCategory,
      originalTeam: formOriginalTeam ? formOriginalTeam : undefined,
      image: formImage.trim() || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&auto=format&fit=crop&q=80',
      verifiedCutoff: VERIFIED_DATA_CUTOFF
    };

    const val = validatePlayer(newPlayer);
    if (!val.valid) {
      alert(val.error);
      return;
    }

    onUpdatePlayerPool([newPlayer, ...playerPool]);
    setIsAdding(false);
    // Reset form
    setFormName('');
    setNotification(`Added ${newPlayer.name} to the active auction pool.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeletePlayer = (id: string) => {
    onUpdatePlayerPool(playerPool.filter(p => p.id !== id));
  };

  const handleCsvImport = () => {
    if (!csvText.trim()) return;
    const { players, errors } = parseCSVToPlayers(csvText);
    if (errors.length > 0) {
      setImportErrors(errors);
    }
    if (players.length > 0) {
      onUpdatePlayerPool([...players, ...playerPool]);
      setShowImport(false);
      setCsvText('');
      setNotification(`Successfully imported ${players.length} players!`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(playerPool, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ipl_player_pool_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetToOfficialSeed = () => {
    if (confirm('Reset player catalog back to official verified 2025/2026 IPL seed pool?')) {
      onUpdatePlayerPool(INITIAL_PLAYER_POOL);
      setNotification('Reset back to official seed pool.');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg text-white">Player Pool Management</h3>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Cutoff: {VERIFIED_DATA_CUTOFF}
                </span>
              </div>
              <p className="text-xs text-slate-400">Curated active player database, verified base prices, CSV/JSON import</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notification && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shrink-0">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search player name, nationality..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="batter">Batters</option>
              <option value="bowler">Bowlers</option>
              <option value="all-rounder">All-Rounders</option>
              <option value="wicketkeeper">WKs</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAdding ? 'Cancel' : 'Add Player'}</span>
            </button>

            <button
              onClick={() => setShowImport(!showImport)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export</span>
            </button>

            <button
              onClick={handleResetToOfficialSeed}
              className="text-[11px] text-slate-500 hover:text-rose-400 underline ml-1"
            >
              Reset Seed
            </button>
          </div>
        </div>

        {/* Add Player Form Tray */}
        {isAdding && (
          <form onSubmit={handleAddPlayer} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 my-2 space-y-3 shrink-0">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              Add New Player to Auction Pool
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Jasprit Bumrah"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Primary Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as PlayerRole)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                >
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-Rounder</option>
                  <option value="wicketkeeper">Wicketkeeper-Batter</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Base Price (₹ Cr)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.2"
                  max="20"
                  value={formBasePriceCr}
                  onChange={(e) => setFormBasePriceCr(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nationality</label>
                <input
                  type="text"
                  value={formNationality}
                  onChange={(e) => {
                    setFormNationality(e.target.value);
                    setFormIsOverseas(e.target.value.toLowerCase() !== 'india');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Original Team (for RTM)</label>
                <select
                  value={formOriginalTeam}
                  onChange={(e) => setFormOriginalTeam(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                >
                  <option value="">None / Open</option>
                  {IPL_TEAMS.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Photo URL</label>
                <input
                  type="url"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Save Player
              </button>
            </div>
          </form>
        )}

        {/* CSV Import Box */}
        {showImport && (
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 my-2 space-y-2 shrink-0">
            <h4 className="font-bold text-xs text-white uppercase tracking-wider">
              Import Players from CSV
            </h4>
            <p className="text-[11px] text-slate-400">
              Format: <code>name,role,basepricecr,nationality,isoverseas,originalteam</code>
            </p>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="name,role,basepricecr,nationality,isoverseas,originalteam&#10;Travis Head,batter,2.0,Australia,true,srh&#10;Mayank Yadav,bowler,0.5,India,false,lsg"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
            />
            {importErrors.length > 0 && (
              <div className="p-2 rounded bg-rose-500/10 text-rose-300 text-[11px] space-y-0.5">
                {importErrors.map((err, i) => <div key={i}>• {err}</div>)}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="px-3 py-1 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCsvImport}
                className="px-4 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Process CSV Import
              </button>
            </div>
          </div>
        )}

        {/* Player List Table */}
        <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
          {filteredPlayers.length === 0 ? (
            <p className="text-slate-500 text-center py-10 text-xs">
              No players found matching current filters.
            </p>
          ) : (
            filteredPlayers.map(p => (
              <div
                key={p.id}
                className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded">
                        {p.role}
                      </span>
                      {p.isOverseas && (
                        <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1 py-0.2 rounded">
                          Overseas
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {p.nationality} • {p.battingStyle} {p.originalTeam ? `• RTM: ${p.originalTeam.toUpperCase()}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 block">
                      ₹{p.basePriceCr.toFixed(2)} Cr
                    </span>
                    <span className="text-[10px] text-slate-500 block">Base Price</span>
                  </div>

                  <button
                    onClick={() => handleDeletePlayer(p.id)}
                    title="Remove from pool"
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
