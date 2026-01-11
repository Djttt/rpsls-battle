import React from 'react';
import { MoveDetails, Language } from '../types';

interface MoveButtonProps {
  details: MoveDetails;
  onClick: () => void;
  disabled: boolean;
  selected?: boolean;
  language: Language;
}

export const MoveButton: React.FC<MoveButtonProps> = ({ details, onClick, disabled, selected, language }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative group flex flex-col items-center justify-center 
        w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 
        rounded-full border-4 shadow-lg transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-110 cursor-pointer'}
        ${selected ? `scale-110 ring-4 ring-offset-2 ring-offset-slate-900 ring-white ${details.color} bg-slate-800` : `bg-slate-800 border-slate-600 hover:border-white text-slate-300`}
      `}
      aria-label={`Choose ${details.name[language]}`}
    >
      <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none">{details.icon}</span>
      <span className="text-[10px] sm:text-xs font-bold uppercase mt-1 tracking-wider opacity-80 group-hover:opacity-100 whitespace-nowrap">
        {details.name[language]}
      </span>
    </button>
  );
};
