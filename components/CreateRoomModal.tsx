import React, { useState } from 'react';
import { X, Users, Trophy, Lock, Play } from 'lucide-react';
import { gameService } from '../services/api';
import { APP_STRINGS } from '../constants';
import { Language } from '../types';

interface CreateRoomModalProps {
    onClose: () => void;
    onRoomCreated: (gameId: string) => void;
    language: Language;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ onClose, onRoomCreated, language }) => {
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [bestOf, setBestOf] = useState(1);
    const [password, setPassword] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await gameService.createRoom(maxPlayers, bestOf, password);
            onRoomCreated(res.data.game_id);
            onClose();
        } catch (e: any) {
            console.error(e);
            alert('Failed to create room');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Play className="text-indigo-500" />
                    {APP_STRINGS.createRoom[language]}
                </h2>

                <div className="space-y-6">
                    {/* Players Count */}
                    <div>
                        <label className="text-slate-400 text-sm font-bold mb-3 block flex items-center gap-2">
                            <Users size={16} /> {APP_STRINGS.maxPlayers[language]}
                        </label>
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                            {[2, 3, 4].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setMaxPlayers(num)}
                                    className={`flex-1 py-2 rounded-md transition-all ${maxPlayers === num
                                        ? 'bg-indigo-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {num} {APP_STRINGS.player[language]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Series Length */}
                    <div>
                        <label className="text-slate-400 text-sm font-bold mb-3 block flex items-center gap-2">
                            <Trophy size={16} /> {APP_STRINGS.seriesLength[language]}
                        </label>
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                            {[1, 3, 5, 7].map(num => (
                                <button
                                    key={num}
                                    onClick={() => setBestOf(num)}
                                    className={`flex-1 py-2 rounded-md transition-all ${bestOf === num
                                        ? 'bg-orange-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    {num === 1 ? `1 ${APP_STRINGS.rounds[language]}` : `${APP_STRINGS.bestOf[language]} ${num}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-slate-400 text-sm font-bold mb-3 block flex items-center gap-2">
                            <Lock size={16} /> {APP_STRINGS.roomPasswordOptional[language]}
                        </label>
                        <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={APP_STRINGS.enterPasswordDots[language]}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={creating}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {creating ? APP_STRINGS.loading[language] : APP_STRINGS.createRoom[language]}
                    </button>
                </div>
            </div>
        </div>
    );
};
