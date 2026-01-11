import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { Swords, Check, X, Bell } from 'lucide-react';
import { MultiplayerBoard } from './MultiplayerBoard';
import { Lobby } from './Lobby';
import { APP_STRINGS } from '../constants';
import { Language } from '../types';

interface MultiplayerManagerProps {
    currentUser: { username: string };
    onGameStart: () => void;
    activeGameId?: string; // If passed from parent (e.g. created room)
    onGameEnd: () => void;
    language: Language;
}

export const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({ currentUser, onGameStart, activeGameId, onGameEnd, language }) => {
    const [invites, setInvites] = useState<any[]>([]);
    const [activeGame, setActiveGame] = useState<{ id: string, hostIp?: string, state: 'lobby' | 'active' } | null>(null);
    const [polling, setPolling] = useState(true);

    // Initial Active Game Check (if we created one from outside)
    useEffect(() => {
        if (activeGameId && !activeGame) {
            setActiveGame({ id: activeGameId, state: 'lobby', hostIp: undefined }); // hostIp undefined implies localhost
            setPolling(false);
            onGameStart();
        }
    }, [activeGameId]);

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
            await gameService.joinRoom(invite.game_id, invite.from_ip, passwordInput || undefined);
            setActiveGame({ id: invite.game_id, hostIp: invite.from_ip, state: 'lobby' }); // Assume lobby on join
            setPolling(false);
            onGameStart();
            setPasswordInput('');
            setSelectedInvite(null);
            setInvites([]); // Clear invites
        } catch (e: any) {
            console.error("Join error", e);
            const msg = e.response?.data?.error || APP_STRINGS.joinFailed[language];
            alert(msg);
        }
    };

    const handleExit = async () => {
        if (activeGame) {
            try {
                // If in lobby, we leave room. If active, we forfeit/leave?
                // For now just leave room endpoint.
                await gameService.leaveRoom(activeGame.id);
            } catch (e) { console.error(e); }
        }
        setActiveGame(null);
        setPolling(true);
        onGameEnd();
    };

    if (activeGame) {
        if (activeGame.state === 'lobby') {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur">
                    <div className="w-full max-w-4xl">
                        <Lobby
                            gameId={activeGame.id}
                            hostIp={activeGame.hostIp}
                            currentUser={currentUser}
                            onStart={() => setActiveGame({ ...activeGame, state: 'active' })}
                            onLeave={handleExit}
                            language={language}
                        />
                    </div>
                </div>
            );
        }

        return (
            <MultiplayerBoard
                gameId={activeGame.id}
                hostIp={activeGame.hostIp}
                topUser={currentUser.username}
                onExit={handleExit}
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
                            onClick={() => {/* Reject */ }}
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
