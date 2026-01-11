import React, { useState, useEffect, useRef } from 'react';
import { MOVES_LIST, GAME_RULES, APP_STRINGS } from './constants';
import { Move, GameResult, RoundState, RuleOutcome, Language } from './types';
import { MoveButton } from './components/MoveButton';
import { RulesCard } from './components/RulesCard';
import { getGeminiCommentary } from './services/geminiService';
import { Sparkles, Trophy, Skull, RefreshCw, Bot, User, Globe } from 'lucide-react';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh'); // Default to Chinese
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameState, setGameState] = useState<RoundState>({
    playerMove: null,
    computerMove: null,
    result: null,
    outcomeDetails: null,
    commentary: null,
    isThinking: false,
  });
  const [score, setScore] = useState({ player: 0, computer: 0 });
  
  // Header visibility state
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll handler for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // If scrolling up or at the very top (within 50px), show header
      if (currentScrollY < lastScrollY.current || currentScrollY < 50) {
        setIsHeaderVisible(true);
      } 
      // If scrolling down and past threshold, hide header
      else if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsHeaderVisible(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  const handlePlay = (playerMoveId: Move) => {
    // 1. Determine Computer Move
    const moves = Object.values(Move);
    const randomIndex = Math.floor(Math.random() * moves.length);
    const computerMoveId = moves[randomIndex];

    // 2. Determine Result
    let result = GameResult.DRAW;
    let outcomeDetails: RuleOutcome | null = null;

    if (playerMoveId !== computerMoveId) {
      const playerMoveDetails = GAME_RULES[playerMoveId];
      const winScenario = playerMoveDetails.beats.find(r => r.target === computerMoveId);

      if (winScenario) {
        result = GameResult.WIN;
        outcomeDetails = winScenario;
      } else {
        result = GameResult.LOSE;
        // Find how computer won for details
        const computerMoveDetails = GAME_RULES[computerMoveId];
        outcomeDetails = computerMoveDetails.beats.find(r => r.target === playerMoveId) || null;
      }
    }

    // 3. Start Countdown Animation sequence
    // We don't set gameState yet. We wait for countdown.
    setCountdown(3);

    const stepDuration = 600; // ms per count

    // Sequence: 3 -> 2 -> 1 -> Reveal
    setTimeout(() => setCountdown(2), stepDuration);
    setTimeout(() => setCountdown(1), stepDuration * 2);
    
    setTimeout(() => {
      setCountdown(null);
      
      // 4. Update State to Reveal Result
      setGameState({
        playerMove: playerMoveId,
        computerMove: computerMoveId,
        result,
        outcomeDetails,
        commentary: null,
        isThinking: true, // Start thinking for commentary
      });

      // 5. Update Score
      if (result === GameResult.WIN) {
        setScore(prev => ({ ...prev, player: prev.player + 1 }));
      } else if (result === GameResult.LOSE) {
        setScore(prev => ({ ...prev, computer: prev.computer + 1 }));
      }
    }, stepDuration * 3);
  };

  // Effect to fetch Gemini commentary when round finishes
  useEffect(() => {
    let isMounted = true;

    const fetchCommentary = async () => {
      if (gameState.playerMove && gameState.computerMove && gameState.result && gameState.isThinking) {
        try {
          const comment = await getGeminiCommentary(
            gameState.playerMove,
            gameState.computerMove,
            gameState.result,
            language
          );
          
          if (isMounted) {
            setGameState(prev => ({
              ...prev,
              commentary: comment,
              isThinking: false,
            }));
          }
        } catch (error) {
           if (isMounted) {
            setGameState(prev => ({
              ...prev,
              commentary: APP_STRINGS.error[language],
              isThinking: false,
            }));
          }
        }
      }
    };

    fetchCommentary();

    return () => {
      isMounted = false;
    };
  }, [gameState.playerMove, gameState.computerMove, gameState.result, gameState.isThinking, language]);

  const resetGame = () => {
    setGameState({
      playerMove: null,
      computerMove: null,
      result: null,
      outcomeDetails: null,
      commentary: null,
      isThinking: false,
    });
  };

  const getResultColor = (res: GameResult | null) => {
    switch (res) {
      case GameResult.WIN: return 'text-green-400';
      case GameResult.LOSE: return 'text-red-400';
      case GameResult.DRAW: return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  const getResultText = (res: GameResult | null) => {
    if (!res) return '';
    if (res === GameResult.DRAW) return APP_STRINGS.draw[language];
    if (res === GameResult.WIN) return APP_STRINGS.win[language];
    return APP_STRINGS.lose[language];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white pb-20">
      
      {/* Header */}
      <header 
        className={`bg-slate-900 border-b border-slate-800 p-4 fixed top-0 left-0 right-0 z-50 shadow-2xl transition-transform duration-300 ${
          isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg shadow-lg">
              <span className="text-2xl">🖖</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 hidden sm:block">
              {APP_STRINGS.title[language]}
            </h1>
          </div>
          
          <div className="flex items-center space-x-6 text-sm md:text-base font-mono">
             <div className="flex flex-col items-end">
                <span className="text-slate-400 text-xs uppercase">{APP_STRINGS.player[language]}</span>
                <span className="font-bold text-green-400 text-xl">{score.player}</span>
             </div>
             <div className="h-8 w-px bg-slate-700"></div>
             <div className="flex flex-col items-start">
                <span className="text-slate-400 text-xs uppercase">{language === 'zh' ? 'AI' : 'A.I.'}</span>
                <span className="font-bold text-red-400 text-xl">{score.computer}</span>
             </div>
             
             <button 
               onClick={toggleLanguage}
               className="ml-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
               title="Switch Language"
             >
               <Globe size={20} />
               <span className="sr-only">Switch Language</span>
               <span className="ml-1 text-xs font-bold">{language === 'en' ? 'EN' : '中'}</span>
             </button>
          </div>
        </div>
      </header>

      {/* Main Content - Added padding top to account for fixed header */}
      <main className="max-w-5xl mx-auto px-4 pt-28 md:pt-32">
        
        {/* Battle Area */}
        <div className="relative min-h-[400px] flex flex-col justify-between">
          
          {/* Result Overlay */}
          {gameState.result && !countdown && (
            <div className="absolute inset-0 z-0 flex flex-col items-center justify-center pointer-events-none opacity-10">
               <span className={`text-[100px] md:text-[200px] font-black uppercase tracking-tighter ${getResultColor(gameState.result)}`}>
                 {gameState.result}
               </span>
            </div>
          )}

          {/* Active Gameplay State */}
          <div className="z-10 grid grid-cols-2 gap-8 md:gap-16 items-center justify-center mb-12">
            
            {/* Player Side */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <User size={20} />
                <span className="font-bold tracking-widest uppercase text-sm">{APP_STRINGS.you[language]}</span>
              </div>
              
              <div className={`transition-all duration-500 transform ${gameState.playerMove || countdown ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}`}>
                {countdown !== null ? (
                   // Countdown: Show Fist Pump
                   <div className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center border-8 border-slate-700 bg-slate-800 animate-bounce" style={{ animationDuration: '0.6s' }}>
                      <span className="text-6xl md:text-8xl">✊</span>
                   </div>
                ) : gameState.playerMove ? (
                  // Result: Show Choice
                  <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center border-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900 ${GAME_RULES[gameState.playerMove].color}`}>
                    <span className="text-6xl md:text-8xl">{GAME_RULES[gameState.playerMove].icon}</span>
                  </div>
                ) : (
                  // Idle: Show Placeholder
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/50">
                    <span className="text-slate-600 text-4xl font-black">?</span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Side */}
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Bot size={20} />
                <span className="font-bold tracking-widest uppercase text-sm">{APP_STRINGS.ai[language]}</span>
              </div>
              <div className={`transition-all duration-500 transform ${gameState.computerMove || countdown ? 'scale-100 opacity-100' : 'scale-90 opacity-50'}`}>
                {countdown !== null ? (
                   // Countdown: Show Fist Pump
                   <div className="w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center border-8 border-slate-700 bg-slate-800 animate-bounce" style={{ animationDuration: '0.6s' }}>
                      <span className="text-6xl md:text-8xl">✊</span>
                   </div>
                ) : gameState.computerMove ? (
                  // Result: Show Choice
                  <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full flex items-center justify-center border-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900 ${GAME_RULES[gameState.computerMove].color}`}>
                    <span className="text-6xl md:text-8xl">{GAME_RULES[gameState.computerMove].icon}</span>
                  </div>
                ) : (
                  // Idle: Show Placeholder
                   <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center bg-slate-900/50">
                    <span className="text-slate-600 text-4xl font-black">?</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Outcome Text / Countdown Text */}
          <div className="z-10 h-24 flex flex-col items-center justify-center text-center mb-8">
            {countdown !== null ? (
               <div className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">
                 {countdown}
               </div>
            ) : gameState.result ? (
              <div className="animate-in fade-in zoom-in duration-300">
                <h2 className={`text-4xl md:text-6xl font-black uppercase drop-shadow-lg ${getResultColor(gameState.result)}`}>
                  {getResultText(gameState.result)}
                </h2>
                {gameState.outcomeDetails && (
                  <p className="text-slate-300 text-lg md:text-xl font-medium mt-2 tracking-wide flex items-center justify-center gap-2 bg-slate-900/60 px-4 py-1 rounded-full border border-slate-700">
                    {gameState.outcomeDetails.description[language]}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-500 font-mono text-sm animate-pulse">{APP_STRINGS.waiting[language]}</p>
            )}
          </div>

          {/* Gemini Commentary Bubble */}
          {(gameState.commentary || gameState.isThinking) && (
            <div className="max-w-xl mx-auto w-full mb-8 z-10 animate-in slide-in-from-bottom-4 duration-500">
               <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 p-4 rounded-2xl rounded-tl-none shadow-xl flex gap-4 items-start relative mx-4 md:mx-0">
                  <div className="absolute -top-3 -left-1 text-slate-700 transform rotate-12">
                    <Bot size={32} className="fill-slate-800 text-indigo-500" />
                  </div>
                  <div className="flex-1">
                     <p className="text-indigo-300 text-xs font-bold uppercase mb-1 tracking-wider">{APP_STRINGS.aiCommentary[language]}</p>
                     {gameState.isThinking ? (
                       <div className="flex space-x-1 h-5 items-center">
                         <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                         <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                         <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                       </div>
                     ) : (
                       <p className="text-slate-200 text-sm md:text-base italic leading-relaxed">
                         "{gameState.commentary}"
                       </p>
                     )}
                  </div>
               </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center flex-wrap gap-4 md:gap-6 z-20 min-h-[120px]">
             {gameState.result === null && countdown === null ? (
               MOVES_LIST.map((move) => (
                 <MoveButton
                   key={move.id}
                   details={move}
                   onClick={() => handlePlay(move.id)}
                   disabled={false}
                   selected={false}
                   language={language}
                 />
               ))
             ) : countdown !== null ? (
               // Hidden/Placeholder controls during countdown to prevent jumping
               <div className="text-slate-600 text-sm font-bold tracking-widest animate-pulse uppercase">
                  {APP_STRINGS.title[language]}...
               </div>
             ) : (
                <button
                  onClick={resetGame}
                  className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] transition-all duration-300 transform hover:-translate-y-1"
                >
                  <RefreshCw className="group-hover:rotate-180 transition-transform duration-500" />
                  {APP_STRINGS.playAgain[language]}
                </button>
             )}
          </div>
        </div>

        <RulesCard language={language} />

      </main>
    </div>
  );
};

export default App;
