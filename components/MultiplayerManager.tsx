import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { Swords, Check, X, Bell } from 'lucide-react';
import { MultiplayerBoard } from './MultiplayerBoard';
import { APP_STRINGS } from '../constants';
import { Language } from '../types';

interface MultiplayerManagerProps {
    currentUser: { username: string };
    onGameStart: () => void; // Callback to hide main menu if needed
    language: Language;
}

export const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({ currentUser, onGameStart, language }) => {
    const [invites, setInvites] = useState<any[]>([]);
    const [activeGame, setActiveGame] = useState<{ id: string, hostIp?: string } | null>(null);
    const [polling, setPolling] = useState(true);

    // Poll for invites
    useEffect(() => {
        if (!polling) return;
        const interval = setInterval(async () => {
            try {
                const res = await gameService.getInvites();
                setInvites(res.data);
            } catch (e) {
                console.error("Poll invites error", e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [polling]);

    const [passwordInput, setPasswordInput] = useState('');
    const [selectedInvite, setSelectedInvite] = useState<any | null>(null);

    const handleAccept = async (invite: any) => {
        if (invite.has_password && selectedInvite !== invite) {
            setSelectedInvite(invite);
            return;
        }

        try {
            await gameService.acceptInvite(invite.game_id, invite.from_ip, passwordInput || undefined);
            setActiveGame({ id: invite.game_id, hostIp: invite.from_ip });
            setPolling(false);
            onGameStart();
            setPasswordInput('');
            setSelectedInvite(null);
        } catch (e) {
            console.error("Accept error", e);
            alert(APP_STRINGS.joinFailed[language]);
        }
    };

    if (activeGame) {
        return (
            <MultiplayerBoard
                gameId={activeGame.id}
                hostIp={activeGame.hostIp}
                topUser={currentUser.username}
                onExit={() => {
                    setActiveGame(null);
                    setPolling(true);
                }}
            />
        );
    }

    if (invites.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {invites.map((invite, idx) => (
                <div key={idx} className="bg-slate-800 border border-indigo-500 shadow-2xl p-4 rounded-xl flex flex-col gap-4 animate-in slide-in-from-right">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-600 p-2 rounded-full animate-pulse">
                            <Swords size={24} className="text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white text-sm">{APP_STRINGS.challengeReceived[language]}</h4>
                            <p className="text-xs text-slate-400">{APP_STRINGS.from[language]} <span className="text-indigo-300 font-mono">{invite.from_user}</span></p>
                            {invite.has_password && <p className="text-[10px] text-yellow-400">🔒 {APP_STRINGS.passwordProtected[language]}</p>}
                        </div>
                    </div>

                    {selectedInvite === invite && (
                        <input
                            type="text"
                            placeholder={APP_STRINGS.enterPasswordDots[language]}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                        />
                    )}

                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => handleAccept(invite)}
                            className="p-2 bg-green-600 hover:bg-green-500 rounded-lg text-white transition-colors"
                            title="Accept"
                        >
                            <Check size={16} />
                        </button>
                        <button
                            onClick={() => {/* Reject? Need backend support or just ignore */ }}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition-colors"
                            title="Ignore"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
