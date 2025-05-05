import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { OpenAIProvider } from '../../../src/llm-provider/openai.js';
import { LLMMessage, LLMOptions, LLMResponseFormat } from '../../../src/types/llm.js';

// OpenAI APIのモック
// 実際のAPIを呼び出さないようにOpenAIをモックする
// 代わりにOpenAIをMockクラスで置き換える
class MockOpenAI {
  // 呼び出しを記録するためのプロパティ
  static lastConfig: any = null;
  static lastCreateParams: any = null;

  constructor(config: any) {
    MockOpenAI.lastConfig = config;
  }

  get chat() {
    return {
      completions: {
        create: async (params: any) => {
          // 呼び出しパラメータを記録
          MockOpenAI.lastCreateParams = params;
          
          return {
            choices: [
              {
                message: {
                  content: `Mock OpenAI response with ${params.messages.length} messages, temp: ${params.temperature}`
                },
                finish_reason: 'stop'
              }
            ]
          };
        }
      }
    };
  }
}

// OpenAIモジュールをモック
// テスト中はOpenAIのインポートを上記のモッククラスに置き換える
jest.mock('openai', () => ({ 
  default: MockOpenAI 
}));

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  
  beforeEach(() => {
    // テスト前に環境変数をセット
    process.env.OPENAI_API_KEY = 'test-api-key';
    provider = new OpenAIProvider();
    // モックの状態をリセット
    MockOpenAI.lastConfig = null;
    MockOpenAI.lastCreateParams = null;
  });

  afterEach(() => {
    // テスト後に環境変数をクリア
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize properties', () => {
      expect(provider.name).toBe('openai');
      expect(MockOpenAI.lastConfig).toEqual({ apiKey: 'test-api-key' });
    });

    it('should throw error if API key is not provided', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIProvider()).toThrow('OpenAI API key is required');
    });
  });

  describe('sendMessage', () => {
    it('should call OpenAI API with correct parameters', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];
      
      const options: LLMOptions = {
        temperature: 0.5,
        responseFormat: 'text' as LLMResponseFormat,
        maxTokens: 100
      };

      const result = await provider.sendMessage(messages, options);
      
      expect(result).toContain('Mock OpenAI response');
      expect(result).toContain('temp: 0.5');
      
      // OpenAI APIのcreateメソッドが正しく呼ばれたことを確認
      expect(MockOpenAI.lastCreateParams).toMatchObject({
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 100
      });
      
      // messagesがOpenAIの形式に正しく変換されていることを確認
      const apiMessages = MockOpenAI.lastCreateParams.messages;
      expect(apiMessages.length).toBe(2);
      expect(apiMessages[0]).toMatchObject({
        role: 'system',
        content: 'You are a helpful assistant.'
      });
    });

    it('should use default values if options are not provided', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];
      
      await provider.sendMessage(messages);
      
      // デフォルト値が適用されていることを確認
      expect(MockOpenAI.lastCreateParams).toMatchObject({
        model: 'gpt-4',
        temperature: 0.7
      });
      expect(MockOpenAI.lastCreateParams.max_tokens).toBeUndefined();
    });

    it('should handle OpenAI API errors', async () => {
      // エラーを発生させるようにモックを一時的に変更
      const originalCreate = MockOpenAI.prototype.chat.completions.create;
      MockOpenAI.prototype.chat.completions.create = async () => {
        throw new Error('API error');
      };
      
      const messages: LLMMessage[] = [{ role: 'user', content: 'Hello!' }];
      
      await expect(provider.sendMessage(messages)).rejects.toThrow('OpenAI API error: API error');
      
      // モックを元に戻す
      MockOpenAI.prototype.chat.completions.create = originalCreate;
    });
  });
}); 