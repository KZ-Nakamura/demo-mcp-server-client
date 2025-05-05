import {
  MessageRole,
  Message,
  SystemMessage,
  UserMessage,
  AssistantMessage,
  ToolMessage,
  ToolCall,
  AssistantToolCallMessage,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk
} from '../../../src/types/llm.js';

describe('LLM Types', () => {
  describe('MessageRole', () => {
    it('should contain all valid roles', () => {
      const roles: MessageRole[] = ['system', 'user', 'assistant', 'tool'];
      
      expect(roles).toContain('system');
      expect(roles).toContain('user');
      expect(roles).toContain('assistant');
      expect(roles).toContain('tool');
    });
  });

  describe('Message', () => {
    it('should define a basic message', () => {
      const message: Message = {
        role: 'user',
        content: 'Hello, how are you?'
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello, how are you?');
    });
  });

  describe('SystemMessage', () => {
    it('should define a system message', () => {
      const message: SystemMessage = {
        role: 'system',
        content: 'You are a helpful assistant.'
      };

      expect(message.role).toBe('system');
      expect(message.content).toBe('You are a helpful assistant.');
    });
  });

  describe('UserMessage', () => {
    it('should define a user message', () => {
      const message: UserMessage = {
        role: 'user',
        content: 'Can you help me with TypeScript?'
      };

      expect(message.role).toBe('user');
      expect(message.content).toBe('Can you help me with TypeScript?');
    });
  });

  describe('AssistantMessage', () => {
    it('should define an assistant message', () => {
      const message: AssistantMessage = {
        role: 'assistant',
        content: 'Sure, I can help you with TypeScript. What do you want to know?'
      };

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Sure, I can help you with TypeScript. What do you want to know?');
    });
  });

  describe('ToolMessage', () => {
    it('should define a tool message', () => {
      const message: ToolMessage = {
        role: 'tool',
        content: '{"result": 4}',
        toolName: 'roll_dice'
      };

      expect(message.role).toBe('tool');
      expect(message.content).toBe('{"result": 4}');
      expect(message.toolName).toBe('roll_dice');
    });

    it('should optionally include a tool call ID', () => {
      const message: ToolMessage = {
        role: 'tool',
        content: '{"result": 4}',
        toolName: 'roll_dice',
        toolCallId: 'call_123'
      };

      expect(message.toolCallId).toBe('call_123');
    });
  });

  describe('ToolCall', () => {
    it('should define a tool call', () => {
      const toolCall: ToolCall = {
        id: 'call_123',
        type: 'function',
        function: {
          name: 'roll_dice',
          arguments: '{"sides": 6}'
        }
      };

      expect(toolCall.id).toBe('call_123');
      expect(toolCall.type).toBe('function');
      expect(toolCall.function.name).toBe('roll_dice');
      expect(toolCall.function.arguments).toBe('{"sides": 6}');
    });
  });

  describe('AssistantToolCallMessage', () => {
    it('should define an assistant message with tool calls', () => {
      const message: AssistantToolCallMessage = {
        role: 'assistant',
        content: null,
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'roll_dice',
              arguments: '{"sides": 6}'
            }
          }
        ]
      };

      expect(message.role).toBe('assistant');
      expect(message.content).toBeNull();
      expect(message.toolCalls.length).toBe(1);
      expect(message.toolCalls[0].id).toBe('call_123');
      expect(message.toolCalls[0].function.name).toBe('roll_dice');
    });

    it('should allow optional content with tool calls', () => {
      const message: AssistantToolCallMessage = {
        role: 'assistant',
        content: 'I will roll a dice for you.',
        toolCalls: [
          {
            id: 'call_123',
            type: 'function',
            function: {
              name: 'roll_dice',
              arguments: '{"sides": 6}'
            }
          }
        ]
      };

      expect(message.content).toBe('I will roll a dice for you.');
      expect(message.toolCalls.length).toBe(1);
    });
  });

  describe('LLMRequestOptions', () => {
    it('should define request options', () => {
      const options: LLMRequestOptions = {
        temperature: 0.7,
        maxTokens: 150,
        stream: false
      };

      expect(options.temperature).toBe(0.7);
      expect(options.maxTokens).toBe(150);
      expect(options.stream).toBe(false);
    });

    it('should allow tool options', () => {
      const options: LLMRequestOptions = {
        tools: [
          {
            type: 'function',
            function: {
              name: 'roll_dice',
              description: 'Roll a dice with given sides',
              parameters: {
                type: 'object',
                properties: {
                  sides: {
                    type: 'integer',
                    description: 'Number of sides'
                  }
                },
                required: ['sides']
              }
            }
          }
        ],
        toolChoice: 'auto'
      };

      expect(options.tools?.length).toBe(1);
      expect(options.tools?.[0].function.name).toBe('roll_dice');
      expect(options.toolChoice).toBe('auto');
    });

    it('should allow specific tool choice', () => {
      const options: LLMRequestOptions = {
        toolChoice: {
          type: 'function',
          function: { name: 'roll_dice' }
        }
      };

      expect(options.toolChoice).toEqual({
        type: 'function',
        function: { name: 'roll_dice' }
      });
    });
  });

  describe('LLMResponse', () => {
    it('should define a response with assistant message', () => {
      const response: LLMResponse = {
        message: {
          role: 'assistant',
          content: 'I can help you with TypeScript.'
        },
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30
        }
      };

      expect(response.message.role).toBe('assistant');
      expect(response.message.content).toBe('I can help you with TypeScript.');
      expect(response.usage?.promptTokens).toBe(20);
      expect(response.usage?.completionTokens).toBe(10);
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should define a response with tool calls', () => {
      const response: LLMResponse = {
        message: {
          role: 'assistant',
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'roll_dice',
                arguments: '{"sides": 6}'
              }
            }
          ]
        }
      };

      expect(response.message.role).toBe('assistant');
      expect('toolCalls' in response.message).toBeTruthy();
      expect((response.message as AssistantToolCallMessage).toolCalls[0].function.name).toBe('roll_dice');
    });
  });

  describe('LLMStreamChunk', () => {
    it('should define a streaming chunk', () => {
      const chunk: LLMStreamChunk = {
        message: {
          role: 'assistant',
          content: 'Hello'
        },
        isComplete: false
      };

      expect(chunk.message.role).toBe('assistant');
      expect(chunk.message.content).toBe('Hello');
      expect(chunk.isComplete).toBe(false);
    });

    it('should define a final streaming chunk', () => {
      const chunk: LLMStreamChunk = {
        message: {
          role: 'assistant',
          content: 'Hello, how can I help you today?'
        },
        isComplete: true
      };

      expect(chunk.message.content).toBe('Hello, how can I help you today?');
      expect(chunk.isComplete).toBe(true);
    });

    it('should define a tool call chunk', () => {
      const chunk: LLMStreamChunk = {
        message: {
          toolCalls: [
            {
              id: 'call_123',
              type: 'function',
              function: {
                name: 'roll_dice',
                arguments: '{"sides"'
              }
            }
          ]
        },
        isComplete: false
      };

      expect('toolCalls' in chunk.message).toBeTruthy();
      expect(chunk.isComplete).toBe(false);
    });
  });
}); 