import { BaseLLMProvider } from '../../../src/llm-provider/base-provider.js';
import { LLMMessage, LLMOptions, LLMResponseFormat } from '../../../src/types/llm.js';

// テスト用の具象クラス
class TestLLMProvider extends BaseLLMProvider {
  name = 'test_provider';
  
  // 呼び出しを記録するためのプロパティ
  lastMessages: LLMMessage[] = [];
  lastOptions: LLMOptions = {};

  async sendMessage(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<string> {
    // 呼び出しパラメータを記録
    this.lastMessages = [...messages];
    this.lastOptions = {...options};
    
    // 簡単なモック実装
    return `Response from test provider with ${messages.length} messages, temp: ${options.temperature || 0.7}`;
  }
}

describe('BaseLLMProvider', () => {
  let provider: TestLLMProvider;

  beforeEach(() => {
    provider = new TestLLMProvider();
  });

  describe('constructor', () => {
    it('should initialize the properties', () => {
      expect(provider.name).toBe('test_provider');
    });
  });

  describe('sendMessage', () => {
    it('should pass messages and options to concrete implementation', async () => {
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
      
      // 正しいパラメータで呼び出されたことを確認
      expect(provider.lastMessages).toEqual(messages);
      expect(provider.lastOptions).toEqual(options);
      expect(result).toContain('Response from test provider');
    });

    it('should provide default options if not specified', async () => {
      const messages: LLMMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];
      
      const result = await provider.sendMessage(messages);
      
      expect(result).toContain('temp: 0.7');
    });
  });
}); 