import { GoogleGenAI } from "@google/genai";
import { Move, GameResult, Language } from "../types";
import { GAME_RULES } from "../constants";

export const getGeminiCommentary = async (
  playerMove: Move,
  computerMove: Move,
  result: GameResult,
  language: Language
): Promise<string> => {
  if (!process.env.API_KEY) {
    return language === 'zh' ? "Bazinga! (缺少 API 密钥)" : "Bazinga! (API Key missing)";
  }

  const systemInstruction = language === 'zh' 
    ? `你正在玩“石头剪刀布蜥蜴史波克”。你是一个机智、略带书呆子气且说话刻薄的 AI 对手（灵感来自谢尔顿·库珀）。
       根据玩家的出招、你的出招和比赛结果，给出简短有力的评论（不超过30字）。
       如果你赢了，请用一种高智商的方式炫耀。
       如果你输了，找一个科学借口或表示难以置信。
       如果是平局，评论一下这种统计学上的小概率事件。
       请用中文回答，风格要幽默毒舌。`
    : `You are playing the game "Rock Paper Scissors Lizard Spock".
       You are a witty, slightly nerdy, and sarcastic AI opponent (inspired by Sheldon Cooper but not explicitly him).
       You will be given the Player's move, Your move (the AI), and the Result.
       Provide a very short, punchy 1-sentence commentary on the outcome.
       If you (AI) won, gloat intelligently.
       If you lost, make a scientific excuse or express disbelief.
       If it's a draw, comment on the statistical improbability.
       Keep it under 20 words.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Get localized names for context
    const playerMoveName = GAME_RULES[playerMove].name[language];
    const computerMoveName = GAME_RULES[computerMove].name[language];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Player chose ${playerMoveName}. AI chose ${computerMoveName}. Result for AI: ${result === GameResult.LOSE ? 'WIN' : result === GameResult.WIN ? 'LOSE' : 'DRAW'}. Language: ${language}.`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.9,
        maxOutputTokens: 60,
      },
    });

    return response.text || (language === 'zh' ? "有趣的结局。" : "Interesting outcome.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return language === 'zh' ? "计算无果。（网络错误）" : "Calculations inconclusive. (Network Error)";
  }
};
