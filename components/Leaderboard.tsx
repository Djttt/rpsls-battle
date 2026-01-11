import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { Trophy, Medal, AlertCircle } from 'lucide-react';

interface LeaderboardEntry {
    username: string;
    wins: number;
    losses: number;
    draws: number;
}

export const Leaderboard: React.FC = () => {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            const res = await gameService.getLeaderboard();
            setLeaders(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setError('Failed to load leaderboard');
            setLoading(false);
        }
    };

    if (loading) return <div className="text-white text-center p-4">Loading top warriors...</div>;
    if (error) return <div className="text-red-400 text-center p-4"><AlertCircle className="inline mr-2" />{error}</div>;

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-auto shadow-2xl">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                <Trophy className="text-yellow-400" size={24} />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Leaderboard</h2>
            </div>

            <div className="space-y-2">
                {leaders.length === 0 ? (
                    <p className="text-slate-500 text-center italic">No battles recorded yet.</p>
                ) : (
                    leaders.map((player, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono 
                                   ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                        idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                                            idx === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/50' : 'bg-slate-700 text-slate-400'}`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <p className="text-white font-medium">{player.username}</p>
                                    <p className="text-xs text-slate-500">
                                        <span className="text-green-400">{player.wins}W</span> •
                                        <span className="text-red-400 ml-1">{player.losses}L</span> •
                                        <span className="text-slate-400 ml-1">{player.draws}D</span>
                                    </p>
                                </div>
                            </div>
                            {idx < 3 && <Medal size={16} className={
                                idx === 0 ? 'text-yellow-400' :
                                    idx === 1 ? 'text-slate-300' :
                                        'text-orange-400'
                            } />}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
