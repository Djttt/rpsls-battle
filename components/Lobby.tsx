import { APP_STRINGS } from '../constants';
import { Language } from '../types';
import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { Users, Crown, CheckCircle, Clock } from 'lucide-react';

interface LobbyProps {
    gameId: string;
    hostIp?: string; // If guest, we might need to know host IP for some calls, but proxy_join handles init.
    // Polling should probably use a proxy too or direct?
    // Currently getGameState is hitting local backend which should proxy?
    // Wait, `get_game_state` in backend looks at LOCAL `games`.
    // If I am GUEST, `game_id` is NOT in my local `games`.
    // I need `proxy_get_state`!

    currentUser: { username: string };
    onStart: () => void;
    onLeave: () => void;
    language: Language;
}

export const Lobby: React.FC<LobbyProps> = ({ gameId, hostIp, currentUser, onStart, onLeave, language }) => {
    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // If I am Guest, I cannot just call `getGameState` which checks local.
    // I need to fetch state from HOST.
    // Let's assume we modify api.ts or backend to handle remote state fetch?
    // OR: for now, assume Host IP is reachable and we use a direct fetch or proxy?

    // Ideally, Guest Backend should hold a "cache" or "reference" to the remote game?
    // Or we just fetch directly from Host if we have IP.
    // In `joinRoom`, we successfully joined.
    // Let's implement `fetchState` that handles Host IP.

    const fetchState = async () => {
        try {
            // This logic needs Backend support for proxying state or Direct call.
            // Let's assume we added proxy logic or Direct call.
            // Direct call from Browser to Host IP is constrained by CORS (but we enabled CORS *).
            // So Direct Call is best for LAN.

            let res;
            if (hostIp) {
                // Guest Mode: Call Host IP directly
                res = await gameService.getGameStateRemote(hostIp, gameId);
            } else {
                // Host Mode: Call Local
                res = await gameService.getGameState(gameId);
            }

            setRoom(res.data);
            setLoading(false);

            // Check if active
            if (res.data.state === 'active') {
                onStart();
            }
        } catch (e) {
            console.error("Lobby poll error", e);
        }
    };

    useEffect(() => {
        fetchState();
        const interval = setInterval(fetchState, 1000); // 1s polling
        return () => clearInterval(interval);
    }, [gameId, hostIp]);

    const toggleReady = async () => {
        // Must call HOST backend
        try {
            if (hostIp) await gameService.toggleReadyRemote(hostIp, gameId);
            else await gameService.toggleReady(gameId);
            fetchState();
        } catch (e) { console.error(e); }
    };

    const startGame = async () => {
        try {
            await gameService.startGame(gameId);
        } catch (e) { console.error(e); }
    };

    if (loading || !room) return <div className="text-white text-center p-8">{APP_STRINGS.loadingLeaderboard[language]}</div>;

    const players = room.players || {};
    const playerList = Object.keys(players);
    const settings = room.settings || {};
    const amIHost = room.host === currentUser.username;
    const myStatus = players[currentUser.username]?.status;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="text-indigo-400" />
                        {APP_STRINGS.lobby[language]}
                        <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded">
                            {playerList.length} / {settings.max_players} {APP_STRINGS.player[language]}
                        </span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                        {APP_STRINGS.bestOf[language]} <span className="text-orange-400 font-bold">{settings.best_of}</span>
                        {settings.password && <span className="ml-3 text-yellow-500 text-xs">🔒 {APP_STRINGS.passwordProtected[language]}</span>}
                    </p>
                </div>
                <button onClick={onLeave} className="text-red-400 hover:text-red-300 text-sm underline">
                    {APP_STRINGS.leave[language]}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {playerList.map((pName: string) => {
                    const pData = players[pName];
                    const isHost = pName === room.host;
                    const isMe = pName === currentUser.username;
                    const isReady = pData.status === 'ready';

                    return (
                        <div key={pName} className={`p-4 rounded-xl border flex items-center justify-between
                            ${isMe ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800 border-slate-700'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                                    ${isHost ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white'}`}>
                                    {pName[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-bold text-white flex items-center gap-2">
                                        {pName}
                                        {isHost && <Crown size={14} className="text-yellow-400" />}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono">{pData.ip}</p>
                                </div>
                            </div>

                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1
                                ${isReady ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                {isReady ? <CheckCircle size={14} /> : <Clock size={14} />}
                                {isReady ? APP_STRINGS.ready[language] : 'WAITING'}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
                {amIHost ? (
                    <button
                        onClick={startGame}
                        disabled={playerList.length < 2 || playerList.some((p: string) => p !== room.host && players[p].status !== 'ready')}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
                    >
                        {APP_STRINGS.startGame[language]}
                    </button>
                ) : (
                    <button
                        onClick={toggleReady}
                        className={`font-bold py-3 px-8 rounded-xl shadow-lg transition-all text-white
                            ${myStatus === 'ready' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                    >
                        {myStatus === 'ready' ? APP_STRINGS.notReady[language] : APP_STRINGS.ready[language]}
                    </button>
                )}
            </div>
        </div>
    );
};
