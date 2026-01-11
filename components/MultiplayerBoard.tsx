import React, { useState, useEffect, useRef } from 'react';
import { gameService } from '../services/api';
import { MOVES_LIST, GAME_RULES, APP_STRINGS } from '../constants';
import { Move, GameResult } from '../types';
import { MoveButton } from './MoveButton';
import { LogOut, RefreshCw, Smile, Users, Crown, Trophy, CheckCircle } from 'lucide-react';

interface MultiplayerBoardProps {
    gameId: string;
    hostIp?: string;
    topUser: string;
    onExit: () => void;
}

export const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ gameId, hostIp, topUser, onExit }) => {
    const [gameState, setGameState] = useState<any>(null);
    const [myMove, setMyMove] = useState<Move | null>(null);
    const [lastProcessedEvent, setLastProcessedEvent] = useState<number>(0);
    const [activeEmote, setActiveEmote] = useState<{ emoji: string, sender: string } | null>(null);
    const [showEmotePicker, setShowEmotePicker] = useState(false);

    // Round Result State (Local, to show animation before next round)
    const [roundResult, setRoundResult] = useState<any>(null);
    const [countdown, setCountdown] = useState<number | null>(null);

    const playSound = (type: 'move' | 'win' | 'lose' | 'draw' | 'start' | 'emote') => {
        // ... (Sound logic same as before, omitted for brevity, adding back simpler version)
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);

            if (type === 'start') {
                osc.frequency.setValueAtTime(300, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.3);
                osc.start(); osc.stop(ctx.currentTime + 0.3);
            } else if (type === 'move') {
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.setValueAtTime(600, ctx.currentTime + 0.2);
                osc.start(); osc.stop(ctx.currentTime + 0.5);
            } else if (type === 'emote') {
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
                osc.start(); osc.stop(ctx.currentTime + 0.2);
            }
        } catch (e) { }
    };

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await gameService.getGameState(gameId, hostIp);
                const newState = res.data;
                setGameState(newState);

                // Check for new round to clear local state
                if (newState.current_round > (roundResult?.round || 0) && !newState.last_event?.type.includes('over')) {
                    // New round started and we are not looking at round over event
                    // Actually, we clear roundResult when timer expires.
                }

                if (newState.last_event && newState.last_event.timestamp > lastProcessedEvent) {
                    setLastProcessedEvent(newState.last_event.timestamp);
                    const evt = newState.last_event;

                    if (evt.type === 'start' || evt.type === 'game_start') {
                        playSound('start');
                        setRoundResult(null);
                        setMyMove(null);
                    } else if (evt.type === 'emote') {
                        playSound('emote');
                        setActiveEmote({ emoji: evt.emoteId, sender: evt.sender });
                        setTimeout(() => setActiveEmote(null), 3000);
                    } else if (evt.type === 'round_over' || evt.type === 'game_over') {
                        // Show results
                        setRoundResult(evt);
                        setMyMove(null); // Clear my move selection locally (since new round will start)
                        // Play sound based on MY score delta in this round
                        const myDelta = evt.results?.[topUser]?.score_delta || 0;
                        if (myDelta > 0) playSound('win');
                        else playSound('move'); // Draw/Loss

                        // Auto-clear round result after 5s if NOT game over
                        if (evt.type === 'round_over') {
                            setTimeout(() => {
                                setRoundResult(null);
                            }, 5000);
                        }
                    }
                }
            } catch (e) { console.error(e); }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameId, hostIp, lastProcessedEvent, topUser]);

    const handleMove = async (moveId: Move) => {
        try {
            await gameService.submitMove(gameId, topUser, moveId, hostIp);
            setMyMove(moveId);
            playSound('move');
        } catch (e) { console.error(e); }
    };

    const sendEmote = async (emoji: string) => {
        try {
            await gameService.sendEmote(gameId, emoji, topUser, hostIp); // fix api signature
            setShowEmotePicker(false);
        } catch (e) { console.error(e); }
    };

    if (!gameState) return <div className="text-center p-8 text-white">Connecting...</div>;

    const players = gameState.players || {};
    const playerList = Object.keys(players);
    const settings = gameState.settings || { max_players: 2, best_of: 1 };

    // Determine view to show:
    // 1. Game Over Screen (if state=finished OR event=game_over)
    // 2. Round Result Screen (if roundResult is set)
    // 3. Gameplay Screen

    // Sort players: Me first?
    const sortedPlayers = [...playerList].sort((a, b) => a === topUser ? -1 : b === topUser ? 1 : 0);

    const isGameOver = gameState.state === 'finished' || roundResult?.type === 'game_over';

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <span className="text-2xl">⚔️</span>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            Multiplayer Arena
                            <span className="px-2 py-0.5 bg-indigo-600 text-xs rounded-full">Round {gameState.current_round} / {settings.best_of}</span>
                        </h1>
                        <p className="text-xs text-slate-400">
                            Best of {settings.best_of} • {playerList.length} Players
                        </p>
                    </div>
                </div>
                <button onClick={onExit} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-400">
                    <LogOut size={24} />
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 relative flex flex-col p-4 overflow-y-auto">

                {/* Scoreboard / Players Grid */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                    {sortedPlayers.map(pName => {
                        const pData = players[pName];
                        const isMe = pName === topUser;
                        const isHost = pName === gameState.host;
                        const hasMoved = pData.move !== null; // Real-time status

                        // If showing results, use `roundResult.moves`
                        const resultMove = roundResult?.moves?.[pName];
                        const resultScore = roundResult?.scores?.[pName]; // Score AFTER round
                        const displayScore = resultScore !== undefined ? resultScore : pData.score;

                        const moveDetails = resultMove ? GAME_RULES[resultMove as Move] : null;

                        return (
                            <div key={pName} className={`relative pt-8 pb-4 px-6 rounded-2xl border-2 transition-all min-w-[150px] flex flex-col items-center
                                 ${isMe ? 'bg-indigo-900/20 border-indigo-500' : 'bg-slate-800 border-slate-700'}
                                 ${hasMoved && !roundResult ? 'ring-2 ring-emerald-500/50' : ''}
                             `}>
                                {/* Avatar */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl border-4 border-slate-950
                                         ${isHost ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white'}
                                     `}>
                                        {pName[0].toUpperCase()}
                                    </div>
                                </div>

                                <div className="mt-2 text-center">
                                    <p className="font-bold text-white flex items-center justify-center gap-1">
                                        {isMe ? 'YOU' : pName}
                                        {isHost && <Crown size={12} className="text-yellow-400" />}
                                    </p>
                                    <p className="text-2xl font-black text-indigo-400 mt-1">{displayScore} <span className="text-xs text-slate-500 font-normal">pts</span></p>
                                </div>

                                {/* Status / Move */}
                                <div className="mt-4 h-16 flex items-center justify-center">
                                    {roundResult ? (
                                        // Result Reveal
                                        moveDetails ? (
                                            <div className={`text-4xl animate-in zoom-in spin-in-12`}>
                                                {moveDetails.icon}
                                            </div>
                                        ) : <span className="text-slate-500">?</span>
                                    ) : (
                                        // Waiting / Moving
                                        isMe ? (
                                            myMove ? <span className="text-4xl">{GAME_RULES[myMove].icon}</span> : <span className="text-xs text-slate-500 italic">Choosing...</span>
                                        ) : (
                                            hasMoved ? (
                                                <div className="flex gap-1">
                                                    <span className="text-2xl animate-bounce">🔒</span>
                                                </div>
                                            ) : <div className="flex gap-1 items-center justify-center h-full">
                                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                                <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Results Overlay (Round Over) */}
                {roundResult && !isGameOver && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-40 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 animate-in zoom-in fade-in slide-in-from-bottom-4">
                            <h2 className="text-3xl font-black text-white text-center uppercase drop-shadow-lg">
                                Round Over
                            </h2>
                            <p className="text-center text-slate-300 text-sm mt-1">Starting next round...</p>
                        </div>
                    </div>
                )}

                {/* Game Over Modal */}
                {isGameOver && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in">
                        <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-6xl font-black text-white mb-2 uppercase tracking-tighter">Game Over</h2>

                        {/* Winner logic: Max score */}
                        {(() => {
                            const maxScore = Math.max(...playerList.map((p: string) => roundResult?.scores?.[p] || players[p].score));
                            const winners = playerList.filter((p: string) => (roundResult?.scores?.[p] || players[p].score) === maxScore);
                            const iAmWinner = winners.includes(topUser);

                            return (
                                <div className="text-center mb-8">
                                    <p className="text-2xl text-slate-300 mb-2">Winner</p>
                                    <div className="text-4xl font-bold gradient-text bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
                                        {winners.join(' & ')}
                                    </div>
                                    {iAmWinner && <p className="text-green-400 font-bold mt-4 text-xl">VICTORY!</p>}
                                </div>
                            );
                        })()}

                        <button onClick={onExit} className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-full text-white font-bold flex items-center gap-2 transition-all hover:scale-105">
                            <LogOut size={20} /> Exit Game
                        </button>
                    </div>
                )}

                {/* Controls */}
                {!roundResult && !isGameOver && (
                    <div className="mt-auto mb-8">
                        {!myMove ? (
                            <div className="flex justify-center flex-wrap gap-4">
                                {MOVES_LIST.map((move) => (
                                    <MoveButton
                                        key={move.id}
                                        details={move}
                                        onClick={() => handleMove(move.id)}
                                        disabled={false}
                                        selected={false}
                                        language={'en'} // Use EN for multiplayer for now
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 font-mono animate-pulse">
                                Waiting for opponents...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Emote Overlay */}
            {activeEmote && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in spin-in-12 duration-500 pointer-events-none">
                    <div className="text-9xl filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                        {activeEmote.emoji}
                    </div>
                    <p className="text-center font-bold text-white bg-black/50 rounded px-2 mt-2">{activeEmote.sender}</p>
                </div>
            )}

            {/* Emote Picker */}
            <div className="absolute bottom-8 right-8 z-40">
                <button
                    onClick={() => setShowEmotePicker(!showEmotePicker)}
                    className="bg-slate-800 p-4 rounded-full text-yellow-400 hover:bg-slate-700 transition-colors shadow-lg border border-slate-700"
                >
                    <Smile size={32} />
                </button>
                {showEmotePicker && (
                    <div className="absolute bottom-16 right-0 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl w-64 grid grid-cols-4 gap-2">
                        {['😀', '😂', '😎', '🤔', '😭', '😡', '😱', '👍', '👎', '👏', '🔥', '🐔'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => sendEmote(emoji)}
                                className="text-2xl hover:bg-slate-800 p-2 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
