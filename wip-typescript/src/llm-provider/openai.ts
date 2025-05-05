import OpenAI from 'openai';
import { BaseLLMProvider } from './base-provider.js';
import { LLMMessage, LLMOptions } from '../types/llm.js';

/**
 * OpenAI LLMプロバイダー
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private defaultModel = 'gpt-4';

  /**
   * コンストラクタ
   * 環境変数からAPIキーを取得
   * @throws APIキーが設定されていない場合はエラー
   */
  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.client = new OpenAI({ apiKey });
  }

  /**
   * OpenAI APIにメッセージを送信して応答を取得
   * @param messages 送信するメッセージの配列
   * @param options LLM呼び出しオプション
   * @returns OpenAIからの応答テキスト
   */
  async sendMessage(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
    try {
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens;
      
      // LLMMessageをOpenAIの形式に変換
      const openaiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(msg => {
        const { role, content } = msg;
        
        // OpenAIの型に合わせて変換
        if (role === 'function' && msg.name) {
          return {
            role: 'function',
            content,
            name: msg.name
          };
        } else if (role === 'system' || role === 'user' || role === 'assistant') {
          return {
            role,
            content
          };
        } else {
          // デフォルトはuserとして扱う
          return {
            role: 'user',
            content
          };
        }
      });
      
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: openaiMessages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {})
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 