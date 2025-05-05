import { BaseLLMProvider } from '../../../src/llm-provider/base-provider.js';
import { MCPHost } from '../../../src/mcp/host.js';
import { MCPClient } from '../../../src/mcp/client.js';
import { LLMMessage, LLMOptions } from '../../../src/types/llm.js';
import { MCPResponse, MCPRequest, MCPErrorResponse } from '../../../src/types/mcp.js';
import { EventEmitter } from 'events';

// モックの実装
class MockLLMProvider extends BaseLLMProvider {
  readonly name = 'mock_provider';
  
  // sendMessageの呼び出しを記録
  messages: LLMMessage[] = [];
  options: LLMOptions = {};
  
  // 返すべき応答を設定
  nextResponse: string = 'default mock response';
  shouldThrowError: boolean = false;

  async sendMessage(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
    this.messages = [...messages];
    this.options = { ...options };
    
    if (this.shouldThrowError) {
      throw new Error('Mock LLM error');
    }
    
    return this.nextResponse;
  }
}

class MockClient implements MCPClient {
  // 記録用
  lastRequest: MCPRequest | null = null;
  nextResponse: MCPResponse | MCPErrorResponse = { id: '1', jsonrpc: '2.0', result: {} };
  shouldThrowError: boolean = false;
  
  // EventEmitterを使って非同期イベントをシミュレート
  events = new EventEmitter();

  async initialize(): Promise<void> {
    // initialize実装
  }
  
  async ping(): Promise<{ time: string }> {
    return { time: new Date().toISOString() };
  }
  
  async listTools(): Promise<{ tools: string[] }> {
    return { tools: ['test_tool'] };
  }
  
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    this.lastRequest = {
      jsonrpc: '2.0',
      method: 'function_call',
      id: '1',
      params: {
        name,
        arguments: JSON.stringify(args)
      }
    };
    
    if (this.shouldThrowError) {
      throw new Error('Mock client error');
    }
    
    // 非同期でツール呼び出し完了イベントを発火
    setTimeout(() => {
      this.events.emit('toolCalled', name, args);
    }, 10);
    
    return this.nextResponse.result;
  }
}

describe('MCPHost', () => {
  let host: MCPHost;
  let mockClient: MockClient;
  let mockLLMProvider: MockLLMProvider;
  
  beforeEach(() => {
    mockClient = new MockClient();
    mockLLMProvider = new MockLLMProvider();
    host = new MCPHost(mockClient, mockLLMProvider);
  });
  
  describe('constructor', () => {
    it('should initialize with client and LLM provider', () => {
      expect(host).toBeInstanceOf(MCPHost);
    });
  });
  
  describe('chat', () => {
    it('should process user message and return LLM response', async () => {
      const userMessage = 'Hello, world!';
      mockLLMProvider.nextResponse = 'Hello, human!';
      
      const response = await host.chat(userMessage);
      
      // LLMに正しいメッセージが送られたことを確認
      expect(mockLLMProvider.messages.length).toBeGreaterThan(0);
      expect(mockLLMProvider.messages.some(m => m.role === 'user' && m.content === userMessage)).toBe(true);
      
      // 応答が正しいことを確認
      expect(response).toBe('Hello, human!');
    });
    
    it('should handle tool calls in LLM response', async () => {
      const userMessage = 'Roll a dice.';
      mockLLMProvider.nextResponse = JSON.stringify({
        thoughts: "User wants to roll a dice. I'll use the dice tool.",
        function_calls: [{
          name: 'dice',
          arguments: { sides: 6 }
        }]
      });
      
      // ツールの戻り値を設定
      mockClient.nextResponse = {
        id: '1',
        jsonrpc: '2.0',
        result: { value: 4 }
      };
      
      // ツール呼び出し後のLLM応答を設定
      let firstCall = true;
      mockLLMProvider.sendMessage = async (messages: LLMMessage[], options: LLMOptions = {}): Promise<string> => {
        mockLLMProvider.messages = [...messages];
        mockLLMProvider.options = { ...options };
        
        if (firstCall) {
          firstCall = false;
          return JSON.stringify({
            thoughts: "User wants to roll a dice. I'll use the dice tool.",
            function_calls: [{
              name: 'dice',
              arguments: { sides: 6 }
            }]
          });
        } else {
          // ツール呼び出し後の応答
          return "I rolled a dice for you and got: 4";
        }
      };
      
      const response = await host.chat(userMessage);
      
      // クライアントに正しいツール呼び出しが行われたことを確認
      expect(mockClient.lastRequest).not.toBeNull();
      expect(mockClient.lastRequest?.params?.name).toBe('dice');
      
      // 最終的な応答が正しいことを確認
      expect(response).toBe("I rolled a dice for you and got: 4");
    });
    
    it('should handle LLM errors', async () => {
      const userMessage = 'Hello, world!';
      mockLLMProvider.shouldThrowError = true;
      
      await expect(host.chat(userMessage)).rejects.toThrow();
    });
    
    it('should handle tool call errors', async () => {
      const userMessage = 'Roll a dice.';
      mockLLMProvider.nextResponse = JSON.stringify({
        thoughts: "User wants to roll a dice. I'll use the dice tool.",
        function_calls: [{
          name: 'dice',
          arguments: { sides: 6 }
        }]
      });
      
      // ツール呼び出しエラーをシミュレート
      mockClient.shouldThrowError = true;
      
      // ツール呼び出し後のLLM応答を設定
      let firstCall = true;
      mockLLMProvider.sendMessage = async (messages: LLMMessage[], options: LLMOptions = {}): Promise<string> => {
        mockLLMProvider.messages = [...messages];
        mockLLMProvider.options = { ...options };
        
        if (firstCall) {
          firstCall = false;
          return JSON.stringify({
            thoughts: "User wants to roll a dice. I'll use the dice tool.",
            function_calls: [{
              name: 'dice',
              arguments: { sides: 6 }
            }]
          });
        } else {
          // ツール呼び出しエラー後の応答
          return "I'm sorry, I couldn't roll the dice due to an error.";
        }
      };
      
      const response = await host.chat(userMessage);
      
      // エラーが捕捉され、LLMに報告されたかを確認
      expect(mockLLMProvider.messages.some(m => 
        m.role === 'system' && m.content.includes('error')
      )).toBe(true);
      
      // 最終的な応答が正しいことを確認
      expect(response).toBe("I'm sorry, I couldn't roll the dice due to an error.");
    });
  });
}); 