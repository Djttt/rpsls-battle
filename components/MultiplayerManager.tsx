import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { Swords, Check, X, Bell } from 'lucide-react';
import { MultiplayerBoard } from './MultiplayerBoard';

interface MultiplayerManagerProps {
    currentUser: { username: string };
    onGameStart: () => void; // Callback to hide main menu if needed
}

export const MultiplayerManager: React.FC<MultiplayerManagerProps> = ({ currentUser, onGameStart }) => {
    const [invites, setInvites] = useState<any[]>([]);
    const [activeGame, setActiveGame] = useState<{ id: string, hostIp?: string } | null>(null);
    const [polling, setPolling] = useState(true);

    // Poll for invites
    useEffect(() => {
        if (!polling) return;
        const interval = setInterval(async () => {
            try {
                const res = await gameService.getInvites();
                // Filter out processed invites if needed, backend currently just dumps all
                setInvites(res.data);
            } catch (e) {
                console.error("Poll invites error", e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [polling]);

    const handleAccept = async (invite: any) => {
        try {
            // invite contains: game_id, from_ip, from_user
            await gameService.acceptInvite(invite.game_id, invite.from_ip);
            setActiveGame({ id: invite.game_id, hostIp: invite.from_ip });
            setPolling(false);
            onGameStart();
        } catch (e) {
            console.error("Accept error", e);
            alert("Failed to join game");
        }
    };

    // If active game, render the board
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

    // Render invites notification
    if (invites.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {invites.map((invite, idx) => (
                <div key={idx} className="bg-slate-800 border border-indigo-500 shadow-2xl p-4 rounded-xl flex items-center gap-4 animate-in slide-in-from-right">
                    <div className="bg-indigo-600 p-2 rounded-full animate-pulse">
                        <Swords size={24} className="text-white" />
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-sm">Challenge Received!</h4>
                        <p className="text-xs text-slate-400">from <span className="text-indigo-300 font-mono">{invite.from_user}</span></p>
                    </div>
                    <div className="flex gap-2">
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
