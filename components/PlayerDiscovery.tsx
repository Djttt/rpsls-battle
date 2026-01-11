import React, { useEffect, useState } from 'react';
import { discoveryService, gameService } from '../services/api';
import { Radio, RefreshCw, Wifi } from 'lucide-react';
import { APP_STRINGS } from '../constants';
import { Language } from '../types';

export const PlayerDiscovery: React.FC<{ currentUser: any, language: Language }> = ({ currentUser, language }) => {
    const [peers, setPeers] = useState<any[]>([]);
    const [scanning, setScanning] = useState(false);
    const [inviting, setInviting] = useState<string | null>(null);

    const scanPeers = async () => {
        setScanning(true);
        try {
            await discoveryService.start();
            // Poll for peers
            const res = await discoveryService.getPeers();
            setPeers(res.data);
        } catch (error) {
            console.error("Discovery error:", error);
        } finally {
            // Keep scanning visually for a bit
            setTimeout(() => setScanning(false), 1000);
        }
    };

    const [password, setPassword] = useState('');

    const handleChallenge = async (peer: any) => {
        setInviting(peer.ip);
        try {
            await gameService.sendChallenge(peer.ip, peer.username, password || undefined);
            alert(`${APP_STRINGS.challengeSent[language]} ${peer.username}!`);
            setPassword(''); // Reset password after send
        } catch (error) {
            console.error("Challenge error", error);
            alert(APP_STRINGS.challengeFailed[language]);
        } finally {
            setInviting(null);
        }
    };

    useEffect(() => {
        // Initial scan
        scanPeers();

        // Timer to poll
        const interval = setInterval(async () => {
            const res = await discoveryService.getPeers();
            setPeers(res.data);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Wifi className="text-indigo-400" />
                    <h3 className="text-lg font-bold text-white">{APP_STRINGS.localPlayers[language]}</h3>
                </div>
                <button
                    onClick={scanPeers}
                    className={`p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors ${scanning ? 'animate-spin' : ''}`}
                    title={APP_STRINGS.refresh[language]}
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder={APP_STRINGS.roomPasswordOptional[language]}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
            </div>

            {peers.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-lg">
                    {APP_STRINGS.noPlayersFound[language]}
                </div>
            ) : (
                <div className="space-y-2">
                    {peers.map((peer, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                                <span className="font-bold text-white">{peer.username}</span>
                                <span className="text-xs text-slate-500 font-mono">({peer.ip})</span>
                            </div>
                            {peer.username !== currentUser.username && (
                                <button
                                    onClick={() => handleChallenge(peer)}
                                    disabled={inviting === peer.ip}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-3 py-1 rounded transition-colors"
                                >
                                    {inviting === peer.ip ? APP_STRINGS.sending[language] : APP_STRINGS.challenge[language]}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
