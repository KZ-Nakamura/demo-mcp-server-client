import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AnthropicProvider } from '../../../src/llm-provider/anthropic.js';
import { LLMMessage, LLMOptions, LLMResponseFormat } from '../../../src/types/llm.js';

// Anthropic APIのモック
// 実際のAPIを呼び出さないようにAnthropicをモックする
class MockAnthropic {
  // 呼び出しを記録するためのプロパティ
  static lastConfig: any = null;
  static lastCreateParams: any = null;

  constructor(config: any) {
    MockAnthropic.lastConfig = config;
  }

  get messages() {
    return {
      create: async (params: any) => {
        // 呼び出しパラメータを記録
        MockAnthropic.lastCreateParams = params;
        
        return {
          content: [
            {
              type: 'text',
              text: `Mock Anthropic response with ${params.messages.length} messages, temp: ${params.temperature}`
            }
          ]
        };
      }
    };
  }
}

// Anthropicモジュールをモック
jest.mock('@anthropic-ai/sdk', () => ({ 
  default: MockAnthropic 
}));

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;
  
  beforeEach(() => {
    // テスト前に環境変数をセット
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    provider = new AnthropicProvider();
    // モックの状態をリセット
    MockAnthropic.lastConfig = null;
    MockAnthropic.lastCreateParams = null;
  });

  afterEach(() => {
    // テスト後に環境変数をクリア
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('constructor', () => {
    it('should initialize properties', () => {
      expect(provider.name).toBe('anthropic');
      expect(MockAnthropic.lastConfig).toEqual({ apiKey: 'test-api-key' });
    });

    it('should throw error if API key is not provided', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AnthropicProvider()).toThrow('Anthropic API key is required');
    });
  });

  describe('sendMessage', () => {
    it('should call Anthropic API with correct parameters', async () => {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];
      
      const options: LLMOptions = {
        temperature: 0.5,
        responseFormat: 'text' as LLMResponseFormat,
        maxTokens: 1000
      };

      const result = await provider.sendMessage(messages, options);
      
      expect(result).toContain('Mock Anthropic response');
      expect(result).toContain('temp: 0.5');
      
      // Anthropic APIのcreateメソッドが正しく呼ばれたことを確認
      expect(MockAnthropic.lastCreateParams).toMatchObject({
        model: 'claude-3-sonnet-20240229',
        system: 'You are a helpful assistant.',
        temperature: 0.5,
        max_tokens: 1000
      });
      
      // システムメッセージとユーザーメッセージを正しく変換していることを確認
      const apiMessages = MockAnthropic.lastCreateParams.messages;
      expect(apiMessages.length).toBe(1);
      expect(apiMessages[0]).toMatchObject({
        role: 'user',
        content: 'Hello!'
      });
    });

    it('should use default values if options are not provided', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];
      
      await provider.sendMessage(messages);
      
      // デフォルト値が適用されていることを確認
      expect(MockAnthropic.lastCreateParams).toMatchObject({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: 'Hello!' }],
        temperature: 0.7,
        max_tokens: 4096
      });
    });

    it('should handle Anthropic API errors', async () => {
      // エラーを発生させるようにモックを一時的に変更
      const originalCreate = MockAnthropic.prototype.messages.create;
      MockAnthropic.prototype.messages.create = async () => {
        throw new Error('API error');
      };
      
      const messages: LLMMessage[] = [{ role: 'user', content: 'Hello!' }];
      
      await expect(provider.sendMessage(messages)).rejects.toThrow('Anthropic API error: API error');
      
      // モックを元に戻す
      MockAnthropic.prototype.messages.create = originalCreate;
    });
  });
}); 