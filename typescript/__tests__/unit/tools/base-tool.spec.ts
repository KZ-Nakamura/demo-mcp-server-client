import { BaseTool } from '../../../src/tools/base-tool.js';
import { ToolInputValidationError } from '../../../src/types/tools.js';

// テスト用のシンプルなツールクラスを作成
class TestTool extends BaseTool<{ value: number, text?: string }> {
  name = 'test_tool';
  description = 'A test tool';
  inputSchema = {
    type: 'object',
    properties: {
      value: { type: 'integer', minimum: 1 },
      text: { type: 'string' }
    },
    required: ['value']
  };

  // 検証メソッドの実行記録を追跡
  validateCalled = false;
  executeInput: any = null;
  
  validate(input: any): void {
    this.validateCalled = true;
    super.validate(input);
  }

  async execute(input: { value: number, text?: string }): Promise<any> {
    this.executeInput = input;
    return { result: input.value * 2, text: input.text || 'default' };
  }
}

describe('BaseTool', () => {
  let tool: TestTool;

  beforeEach(() => {
    tool = new TestTool();
    // 各テスト前に実行記録をリセット
    tool.validateCalled = false;
    tool.executeInput = null;
  });

  describe('constructor', () => {
    it('should initialize properties', () => {
      expect(tool.name).toBe('test_tool');
      expect(tool.description).toBe('A test tool');
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          value: { type: 'integer', minimum: 1 },
          text: { type: 'string' }
        },
        required: ['value']
      });
    });
  });

  describe('validate', () => {
    it('should validate correct input', () => {
      const input = { value: 5, text: 'hello' };
      expect(() => tool.validate(input)).not.toThrow();
    });

    it('should validate input with only required fields', () => {
      const input = { value: 5 };
      expect(() => tool.validate(input)).not.toThrow();
    });

    it('should throw for missing required fields', () => {
      const input = { text: 'hello' };
      expect(() => tool.validate(input)).toThrow(ToolInputValidationError);
    });

    it('should throw for invalid field types', () => {
      const input = { value: '5' };
      expect(() => tool.validate(input)).toThrow(ToolInputValidationError);
    });

    it('should throw for values below minimum', () => {
      const input = { value: 0 };
      expect(() => tool.validate(input)).toThrow(ToolInputValidationError);
    });
  });

  describe('handler', () => {
    it('should call validate and then execute', async () => {
      const input = { value: 5, text: 'hello' };
      
      const result = await tool.handler(input);
      
      expect(tool.validateCalled).toBe(true);
      expect(tool.executeInput).toEqual(input);
      expect(result).toEqual({ result: 10, text: 'hello' });
    });

    it('should throw validation error and not call execute for invalid input', async () => {
      const input = { value: 0 };
      
      await expect(tool.handler(input)).rejects.toThrow(ToolInputValidationError);
      
      expect(tool.validateCalled).toBe(true);
      expect(tool.executeInput).toBeNull();
    });

    it('should pass original error if execute throws', async () => {
      const input = { value: 5 };
      
      // executeメソッドを一時的にオーバーライド
      const originalExecute = tool.execute;
      tool.execute = async () => {
        throw new Error('Execute error');
      };
      
      await expect(tool.handler(input)).rejects.toThrow('Execute error');
      
      expect(tool.validateCalled).toBe(true);
      
      // 元のメソッドに戻す
      tool.execute = originalExecute;
    });
  });
}); 