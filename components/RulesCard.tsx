import React from 'react';
import { GAME_RULES, MOVES_LIST, APP_STRINGS } from '../constants';
import { Language } from '../types';

interface RulesCardProps {
  language: Language;
}

export const RulesCard: React.FC<RulesCardProps> = ({ language }) => {
  return (
    <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-6 border border-slate-700 shadow-xl max-w-4xl mx-auto mt-12">
      <h3 className="text-xl font-bold text-center text-slate-200 mb-6 uppercase tracking-widest">
        {APP_STRINGS.rulesTitle[language]}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOVES_LIST.map((move) => (
          <div key={move.id} className="flex items-center space-x-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
            <span className="text-2xl">{move.icon}</span>
            <div className="flex-1">
              {move.beats.map((rule, idx) => (
                <div key={idx} className="text-sm text-slate-400 flex items-center">
                   <span className="font-semibold text-slate-200 mr-1">{rule.action[language]}</span> 
                   <span className="opacity-80">{GAME_RULES[rule.target].name[language]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center text-slate-500 text-sm italic">
        {APP_STRINGS.rulesFooter[language]}
      </div>
    </div>
  );
};
