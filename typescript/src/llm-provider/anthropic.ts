import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './base-provider.js';
import { LLMMessage, LLMOptions } from '../types/llm.js';

/**
 * Anthropic LLMプロバイダー
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;
  private defaultModel = 'claude-3-sonnet-20240229';

  /**
   * コンストラクタ
   * 環境変数からAPIキーを取得
   * @throws APIキーが設定されていない場合はエラー
   */
  constructor() {
    super();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Anthropic APIにメッセージを送信して応答を取得
   * @param messages 送信するメッセージの配列
   * @param options LLM呼び出しオプション
   * @returns Anthropicからの応答テキスト
   */
  async sendMessage(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
    try {
      const temperature = options.temperature ?? 0.7;
      const maxTokens = options.maxTokens ?? 4096;
      
      // システムメッセージを抽出（最初のsystemメッセージを使用）
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      
      // システムメッセージ以外のメッセージを抽出
      const nonSystemMessages = messages.filter(m => m.role !== 'system');
      
      // Anthropicの型に変換
      const anthropicMessages = nonSystemMessages.map(msg => {
        if (msg.role === 'function') {
          // Anthropicはfunction messagesをサポートしていないためassistantとして扱う
          return { role: 'assistant' as const, content: msg.content };
        }
        
        // roleの型を明示的に指定
        let role: 'user' | 'assistant';
        if (msg.role === 'user') {
          role = 'user';
        } else if (msg.role === 'assistant') {
          role = 'assistant';
        } else {
          // デフォルトはuserとして扱う
          role = 'user';
        }
        
        return { role, content: msg.content };
      });
      
      const response = await this.client.messages.create({
        model: this.defaultModel,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: anthropicMessages,
        temperature,
        max_tokens: maxTokens
      });

      // 応答テキストを取得
      const textContent = response.content
        .filter(content => content.type === 'text')
        .map(content => 'text' in content ? content.text : '')
        .join('\n');

      return textContent;
    } catch (error) {
      throw new Error(`Anthropic API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 