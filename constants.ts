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

  // Auth
  welcomeBack: { en: 'Welcome Back', zh: '欢迎回来' },
  createAccount: { en: 'Create Account', zh: '创建账号' },
  enterCredentials: { en: 'Enter your credentials to continue', zh: '请输入凭证以继续' },
  signUpText: { en: 'Sign up to battle with friends', zh: '注册账号与好友对战' },
  username: { en: 'Username', zh: '用户名' },
  password: { en: 'Password', zh: '密码' },
  enterUsername: { en: 'Enter username', zh: '输入用户名' },
  enterPassword: { en: 'Enter password', zh: '输入密码' },
  signIn: { en: 'Sign In', zh: '登录' },
  noAccount: { en: "Don't have an account? Sign Up", zh: '没有账号？注册一个' },
  hasAccount: { en: 'Already have an account? Sign In', zh: '已有账号？去登录' },
  authError: { en: 'An error occurred', zh: '发生错误' },

  // Leaderboard
  leaderboard: { en: 'Leaderboard', zh: '排行榜' },
  rank: { en: 'Rank', zh: '排名' },
  loadingLeaderboard: { en: 'Loading top warriors...', zh: '正在加载顶尖战士...' },
  leaderboardError: { en: 'Failed to load leaderboard', zh: '加载排行榜失败' },
  noBattles: { en: 'No battles recorded yet.', zh: '暂无对战记录。' },

  // Discovery
  localPlayers: { en: 'Local Players', zh: '附近玩家' },
  refresh: { en: 'Refresh', zh: '刷新' },
  roomPasswordOptional: { en: 'Room Password (Optional)', zh: '房间密码（可选）' },
  noPlayersFound: { en: 'No players found nearby.', zh: '附近没有发现玩家。' },
  challenge: { en: 'Challenge', zh: '挑战' },
  sending: { en: 'Sending...', zh: '发送中...' },
  challengeSent: { en: 'Challenge sent to', zh: '挑战已发送给' },
  challengeFailed: { en: 'Failed to send challenge', zh: '挑战发送失败' },

  // Room & Lobby
  createRoom: { en: 'Create Room', zh: '创建房间' },
  customRoom: { en: 'Custom Room', zh: '自定义房间' },
  maxPlayers: { en: 'Max Players', zh: '最大玩家数' },
  seriesLength: { en: 'Series Length', zh: '赛制' },
  bestOf: { en: 'Best of', zh: '抢' },
  rounds: { en: 'Rounds', zh: '局' },
  password: { en: 'Password', zh: '密码' },
  optional: { en: 'Optional', zh: '可选' },
  lobby: { en: 'Lobby', zh: '大厅' },
  ready: { en: 'READY', zh: '已准备' },
  notReady: { en: 'NOT READY', zh: '未准备' },
  startGame: { en: 'START GAME', zh: '开始游戏' },
  waitingForHost: { en: 'Waiting for Host...', zh: '等待房主...' },
  leave: { en: 'Leave', zh: '离开' },

  // Invites
  challengeReceived: { en: 'Challenge Received!', zh: '收到挑战！' },
  from: { en: 'from', zh: '来自' },
  passwordProtected: { en: 'Password Protected', zh: '密码保护' },
  enterPasswordDots: { en: 'Enter Password...', zh: '输入密码...' },
  joinFailed: { en: 'Failed to join game (Wrong Password?)', zh: '加入游戏失败（密码错误？）' }
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
