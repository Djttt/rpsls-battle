import React, { useState, useEffect, useRef } from 'react';
import { gameService } from '../services/api';
import { MOVES_LIST, GAME_RULES, APP_STRINGS } from '../constants';
import { Move, GameResult } from '../types';
import { MoveButton } from './MoveButton';
import { LogOut, RefreshCw, Smile } from 'lucide-react';

interface MultiplayerBoardProps {
    gameId: string;
    hostIp?: string; // If undefined, I am the host
    topUser: string;
    onExit: () => void;
}

export const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ gameId, hostIp, topUser, onExit }) => {
    const [gameState, setGameState] = useState<any>(null);
    const [myMove, setMyMove] = useState<Move | null>(null);
    const [lastProcessedEvent, setLastProcessedEvent] = useState<number>(0);
    const [activeEmote, setActiveEmote] = useState<{ emoji: string, sender: string } | null>(null);
    const [showEmotePicker, setShowEmotePicker] = useState(false);

    // Sounds
    // Using simple online hosted sounds or generated ones. For now, assuming some URLs or just avoiding actual audio files if not provided.
    // I made a promise to use sounds. I will try to use browser SpeechSynthesis as a fallback for "Battle" sound or simple beeps if no assets.
    // Actually, "Sound Sync" implies actual SFX. I'll assume assets not present, so I'll generate beep/synth sounds.

    const playSound = (type: 'move' | 'win' | 'lose' | 'draw' | 'start' | 'emote') => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'move') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } else if (type === 'start') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (type === 'win') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.6);
        } else if (type === 'lose') {
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        } else if (type === 'emote') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    };
    // Use simple polling for game state
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await gameService.getGameState(gameId, hostIp);
                const newState = res.data;
                setGameState(newState);

                // Handle Events
                if (newState.last_event && newState.last_event.timestamp > lastProcessedEvent) {
                    setLastProcessedEvent(newState.last_event.timestamp);
                    const evt = newState.last_event;

                    if (evt.type === 'start') {
                        playSound('start');
                    } else if (evt.type === 'emote') {
                        playSound('emote');
                        setActiveEmote({ emoji: evt.emote, sender: evt.sender });
                        setTimeout(() => setActiveEmote(null), 3000);
                    } else if (evt.type === 'fight') {
                        // Decide win/loss for sound
                        // This is tricky as we need to calculate it or wait for render logic
                        // We will just play a 'move' sound or specialized
                        // Let's defer to result calculation logic to play sound?
                        // Or just play a general 'impact' sound here
                        playSound('move');
                    }
                }

            } catch (e) {
                console.error("Game state poll error", e);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameId, hostIp, lastProcessedEvent]);

    const sendEmote = async (emoji: string) => {
        try {
            await gameService.sendEmote(gameId, emoji, topUser, hostIp);
            setShowEmotePicker(false);
            // Local feedback handled by poll usually, or specific?
            // User wants sync, so waiting for poll is better for "sync" feeling? 
            // Or instant local. Let's wait for poll.
        } catch (e) { console.error(e); }
    };

    // Play win/lose sound when result appears
    useEffect(() => {
        if (gameState && gameState.state === 'finished') {
            // Calculate result
            const amIHost = !hostIp;
            const myMoveFinal = amIHost ? gameState.host_move : gameState.guest_move;
            const oppMoveFinal = amIHost ? gameState.guest_move : gameState.host_move;

            let myResult = GameResult.DRAW;
            if (myMoveFinal !== oppMoveFinal) {
                const rule = GAME_RULES[myMoveFinal as Move];
                const win = rule.beats.find(b => b.target === oppMoveFinal);
                myResult = win ? GameResult.WIN : GameResult.LOSE;
            }

            if (myResult === GameResult.WIN) playSound('win');
            else if (myResult === GameResult.LOSE) playSound('lose');
        }
    }, [gameState?.state]); // Trigger only when state changes to finished

    const handleMove = async (moveId: Move) => {
        try {
            await gameService.submitMove(gameId, topUser, moveId, hostIp);
            setMyMove(moveId);
        } catch (e) {
            console.error("Submit move error", e);
        }
    };

    // Determine result if finished
    let resultDisplay = null;
    let myResult: GameResult | null = null;

    if (gameState && gameState.state === 'finished') {
        const amIHost = !hostIp;
        const myMoveFinal = amIHost ? gameState.host_move : gameState.guest_move;
        const oppMoveFinal = amIHost ? gameState.guest_move : gameState.host_move;

        if (myMoveFinal === oppMoveFinal) myResult = GameResult.DRAW;
        else {
            const rule = GAME_RULES[myMoveFinal as Move];
            const win = rule.beats.find(b => b.target === oppMoveFinal);
            myResult = win ? GameResult.WIN : GameResult.LOSE;
        }

        resultDisplay = (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                <h2 className={`text-6xl font-black uppercase mb-4 ${myResult === GameResult.WIN ? 'text-green-500' : myResult === GameResult.LOSE ? 'text-red-500' : 'text-yellow-500'}`}>
                    {myResult === GameResult.WIN ? 'VICTORY' : myResult === GameResult.LOSE ? 'DEFEAT' : 'DRAW'}
                </h2>
                <div className="flex items-center gap-8 mb-8">
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-sm mb-2">YOU</span>
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-slate-800 text-4xl border-4 ${GAME_RULES[myMoveFinal as Move].color}`}>
                            {GAME_RULES[myMoveFinal as Move].icon}
                        </div>
                    </div>
                    <span className="text-2xl font-bold text-slate-600">VS</span>
                    <div className="flex flex-col items-center">
                        <span className="text-slate-400 text-sm mb-2">OPPONENT</span>
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center bg-slate-800 text-4xl border-4 ${GAME_RULES[oppMoveFinal as Move].color}`}>
                            {GAME_RULES[oppMoveFinal as Move].icon}
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={onExit} className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg text-white font-bold flex items-center gap-2">
                        <LogOut size={20} /> Exit
                    </button>
                    {/* Rematch not implemented yet */}
                </div>
            </div>
        );
    }

    if (!gameState) return <div className="text-center p-8 text-white">Connecting to arena...</div>;

    const amIHost = !hostIp;
    const opponentName = amIHost ? gameState.guest : gameState.host;
    const opponentMoved = amIHost ? gameState.guest_moved : gameState.host_moved;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <span className="text-2xl">⚔️</span>
                    <div>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">Multiplayer Arena</h1>
                        <p className="text-xs text-slate-400">vs <span className="text-white font-mono">{opponentName}</span></p>
                    </div>
                </div>
                <button onClick={onExit} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-red-400">
                    <LogOut size={24} />
                </button>
            </div>

            {/* Battle Area */}
            <div className="flex-1 relative flex flex-col justify-center items-center p-8">
                {resultDisplay}

                <div className="grid grid-cols-2 gap-16 w-full max-w-4xl mb-12">
                    {/* Me */}
                    <div className="flex flex-col items-center">
                        <span className="mb-4 text-emerald-400 font-bold tracking-widest">YOU</span>
                        <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${myMove ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900'}`}>
                            {myMove ? (
                                <span className="text-6xl">{GAME_RULES[myMove].icon}</span>
                            ) : (
                                <span className="text-slate-600 text-4xl font-bold">?</span>
                            )}
                        </div>
                        <p className="mt-4 text-slate-500">{myMove ? 'Locked In' : 'Choose your weapon'}</p>
                    </div>

                    {/* Opponent */}
                    <div className="flex flex-col items-center">
                        <span className="mb-4 text-red-400 font-bold tracking-widest">OPPONENT</span>
                        <div className={`w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-300 ${opponentMoved ? 'border-red-500 bg-red-500/10' : 'border-slate-700 bg-slate-900'}`}>
                            {opponentMoved ? (
                                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                                    <span className="text-4xl">🔒</span>
                                </div>
                            ) : (
                                <div className="w-full h-full rounded-full flex items-center justify-center">
                                    {/* Waiting animation */}
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-slate-500">{opponentMoved ? 'Ready' : 'Thinking...'}</p>
                    </div>
                </div>

                {/* Emote Display */}
                {activeEmote && (
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in spin-in-12 duration-500 pointer-events-none">
                        <div className="text-9xl filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                            {activeEmote.emoji}
                        </div>
                        <p className="text-center font-bold text-white bg-black/50 rounded px-2 mt-2">{activeEmote.sender}</p>
                    </div>
                )}

                {/* Emote Picker Trigger */}
                <div className="absolute bottom-8 right-8 z-40">
                    <button
                        onClick={() => setShowEmotePicker(!showEmotePicker)}
                        className="bg-slate-800 p-4 rounded-full text-yellow-400 hover:bg-slate-700 transition-colors shadow-lg border border-slate-700"
                        title="Taunt / Emote"
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

                {/* Controls */}
                {!myMove && (
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
                )}
            </div>
        </div>
    );
};
