import { Move, MoveDetails, LocalizedText } from './types';

export const APP_STRINGS: Record<string, LocalizedText> = {
  title: { en: 'RPSLS Battle', zh: '石头剪刀布·蜥蜴·史波克' },
  player: { en: 'Player', zh: '玩家' },
  ai: { en: 'Sheldon Bot', zh: '谢尔顿 AI' },
  you: { en: 'You', zh: '你' },
  waiting: { en: 'Waiting for your move...', zh: '等待出招...' },
  draw: { en: "It's a Draw!", zh: '平局！' },
  win: { en: 'You Win!', zh: '你赢了！' },
  lose: { en: 'You Lose!', zh: '你输了！' },
  playAgain: { en: 'Play Again', zh: '再来一局' },
  rulesTitle: { en: 'Logic Matrix', zh: '胜负法则' },
  rulesFooter: { 
    en: '"Scissors cuts Paper, Paper covers Rock, Rock crushes Lizard, Lizard poisons Spock, Spock smashes Scissors, Scissors decapitates Lizard, Lizard eats Paper, Paper disproves Spock, Spock vaporizes Rock, and as it always has, Rock crushes Scissors."',
    zh: '“剪刀剪布，布包石头，石头砸蜥蜴，蜥蜴毒史波克，史波克掰弯剪刀，剪刀砍蜥蜴，蜥蜴吃布，布反驳史波克，史波克蒸发石头，最后——石头砸剪刀。”'
  },
  aiCommentary: { en: 'AI Commentary', zh: 'AI 毒舌点评' },
  loading: { en: 'Thinking...', zh: '思考中...' },
  error: { en: '...', zh: '...' },
};

// The specific verbs for the game logic
export const GAME_RULES: Record<Move, MoveDetails> = {
  [Move.ROCK]: {
    id: Move.ROCK,
    name: { en: 'Rock', zh: '石头' },
    icon: '✊',
    color: 'border-stone-500 text-stone-500',
    beats: [
      { 
        target: Move.SCISSORS, 
        action: { en: 'crushes', zh: '砸' }, 
        description: { en: 'Rock crushes Scissors', zh: '石头砸剪刀' } 
      },
      { 
        target: Move.LIZARD, 
        action: { en: 'crushes', zh: '砸' }, 
        description: { en: 'Rock crushes Lizard', zh: '石头砸蜥蜴' } 
      },
    ],
  },
  [Move.PAPER]: {
    id: Move.PAPER,
    name: { en: 'Paper', zh: '布' },
    icon: '✋',
    color: 'border-yellow-600 text-yellow-600',
    beats: [
      { 
        target: Move.ROCK, 
        action: { en: 'covers', zh: '包' }, 
        description: { en: 'Paper covers Rock', zh: '布包石头' } 
      },
      { 
        target: Move.SPOCK, 
        action: { en: 'disproves', zh: '反驳' }, 
        description: { en: 'Paper disproves Spock', zh: '布反驳史波克' } 
      },
    ],
  },
  [Move.SCISSORS]: {
    id: Move.SCISSORS,
    name: { en: 'Scissors', zh: '剪刀' },
    icon: '✌️',
    color: 'border-red-500 text-red-500',
    beats: [
      { 
        target: Move.PAPER, 
        action: { en: 'cuts', zh: '剪' }, 
        description: { en: 'Scissors cuts Paper', zh: '剪刀剪布' } 
      },
      { 
        target: Move.LIZARD, 
        action: { en: 'decapitates', zh: '砍' }, 
        description: { en: 'Scissors decapitates Lizard', zh: '剪刀砍蜥蜴' } 
      },
    ],
  },
  [Move.LIZARD]: {
    id: Move.LIZARD,
    name: { en: 'Lizard', zh: '蜥蜴' },
    icon: '🦎',
    color: 'border-green-500 text-green-500',
    beats: [
      { 
        target: Move.SPOCK, 
        action: { en: 'poisons', zh: '毒' }, 
        description: { en: 'Lizard poisons Spock', zh: '蜥蜴毒史波克' } 
      },
      { 
        target: Move.PAPER, 
        action: { en: 'eats', zh: '吃' }, 
        description: { en: 'Lizard eats Paper', zh: '蜥蜴吃布' } 
      },
    ],
  },
  [Move.SPOCK]: {
    id: Move.SPOCK,
    name: { en: 'Spock', zh: '史波克' },
    icon: '🖖',
    color: 'border-blue-500 text-blue-500',
    beats: [
      { 
        target: Move.SCISSORS, 
        action: { en: 'smashes', zh: '掰弯' }, 
        description: { en: 'Spock smashes Scissors', zh: '史波克掰弯剪刀' } 
      },
      { 
        target: Move.ROCK, 
        action: { en: 'vaporizes', zh: '蒸发' }, 
        description: { en: 'Spock vaporizes Rock', zh: '史波克蒸发石头' } 
      },
    ],
  },
};

export const MOVES_LIST = Object.values(GAME_RULES);
