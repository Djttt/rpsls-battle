import React, { useState, useEffect } from 'react';
import { gameService } from '../services/api';
import { MOVES_LIST, GAME_RULES, APP_STRINGS } from '../constants';
import { Move, GameResult } from '../types';
import { MoveButton } from './MoveButton';
import { LogOut, RefreshCw } from 'lucide-react';

interface MultiplayerBoardProps {
    gameId: string;
    hostIp?: string; // If undefined, I am the host
    topUser: string;
    onExit: () => void;
}

export const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ gameId, hostIp, topUser, onExit }) => {
    const [gameState, setGameState] = useState<any>(null);
    const [myMove, setMyMove] = useState<Move | null>(null);
    // Use simple polling for game state

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await gameService.getGameState(gameId, hostIp);
                setGameState(res.data);
            } catch (e) {
                console.error("Game state poll error", e);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [gameId, hostIp]);

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
