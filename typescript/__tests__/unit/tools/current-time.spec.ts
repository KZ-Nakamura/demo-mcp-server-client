import { CurrentTimeTool } from '../../../src/tools/current-time.js';
import { ToolInputValidationError } from '../../../src/types/tools.js';

describe('CurrentTimeTool', () => {
  const tool = new CurrentTimeTool();

  describe('properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('current_time');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe('現在の時刻を取得する');
    });

    it('should have correct schema', () => {
      expect(tool.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['iso', 'readable', 'unix']
          }
        }
      });
    });
  });

  describe('execute', () => {
    // 固定の日時を使う
    const fixedTime = new Date('2023-05-15T12:34:56.789Z');
    
    beforeEach(() => {
      // Date.nowとグローバルDateオブジェクトを保存する必要はない
      // 代わりに、固定の日時を返すシンプルな関数を使用
      Date.now = () => fixedTime.getTime();
      // Dateコンストラクタのモックを簡素化
      global.Date = class extends Date {
        constructor() {
          super(fixedTime);
          return fixedTime;
        }
      } as any;
    });

    afterEach(() => {
      // テスト後にグローバルオブジェクトをリセット
      global.Date = Date;
    });

    it('should return time in ISO format by default', async () => {
      const result = await tool.execute({});
      expect(result).toBe('2023-05-15T12:34:56.789Z');
    });

    it('should return time in ISO format when specified', async () => {
      const result = await tool.execute({ format: 'iso' });
      expect(result).toBe('2023-05-15T12:34:56.789Z');
    });

    it('should return time in readable format when specified', async () => {
      const result = await tool.execute({ format: 'readable' });
      // 日本語ロケールでのフォーマットは環境によって異なる可能性があるため、部分一致でテスト
      expect(result).toContain('2023');
      expect(result).toContain('5');
      expect(result).toContain('15');
    });

    it('should return time in unix timestamp format when specified', async () => {
      const result = await tool.execute({ format: 'unix' });
      expect(result).toBe(fixedTime.getTime().toString());
    });

    it('should default to ISO format for invalid format', async () => {
      const result = await tool.execute({ format: 'invalid' as any });
      expect(result).toBe('2023-05-15T12:34:56.789Z');
    });
  });

  describe('validate', () => {
    it('should validate valid input', () => {
      expect(() => tool.validate({})).not.toThrow();
      expect(() => tool.validate({ format: 'iso' })).not.toThrow();
      expect(() => tool.validate({ format: 'readable' })).not.toThrow();
      expect(() => tool.validate({ format: 'unix' })).not.toThrow();
    });

    it('should throw for invalid format', () => {
      expect(() => tool.validate({ format: 'invalid' })).toThrow(ToolInputValidationError);
      expect(() => tool.validate({ format: 123 as any })).toThrow(ToolInputValidationError);
    });
  });
}); 