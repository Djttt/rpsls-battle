export enum Move {
  ROCK = 'Rock',
  PAPER = 'Paper',
  SCISSORS = 'Scissors',
  LIZARD = 'Lizard',
  SPOCK = 'Spock',
}

export enum GameResult {
  WIN = 'WIN',
  LOSE = 'LOSE',
  DRAW = 'DRAW',
}

export type Language = 'en' | 'zh';

export interface LocalizedText {
  en: string;
  zh: string;
}

export interface RuleOutcome {
  target: Move;
  action: LocalizedText; // Localized verb
  description: LocalizedText; // Localized full sentence
}

export interface MoveDetails {
  id: Move;
  name: LocalizedText; // Localized name of the move
  icon: string; // Emoji
  color: string; // Tailwind color class for border/bg
  beats: RuleOutcome[];
}

export interface RoundState {
  playerMove: Move | null;
  computerMove: Move | null;
  result: GameResult | null;
  outcomeDetails: RuleOutcome | null;
  commentary: string | null;
  isThinking: boolean; // For Gemini commentary
}
