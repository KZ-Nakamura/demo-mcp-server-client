import { DiceTool } from '../../../src/tools/dice.js';
import { ToolInputValidationError } from '../../../src/types/tools.js';

describe('DiceTool', () => {
  const diceTool = new DiceTool();

  describe('properties', () => {
    it('should have correct name', () => {
      expect(diceTool.name).toBe('dice');
    });

    it('should have correct description', () => {
      expect(diceTool.description).toBe('指定された面数のサイコロを振る');
    });

    it('should have correct schema', () => {
      expect(diceTool.inputSchema).toMatchObject({
        type: 'object',
        properties: {
          sides: {
            type: 'integer',
            minimum: 1
          }
        }
      });
    });
  });

  describe('validate', () => {
    it('should validate valid input', () => {
      expect(() => diceTool.validate({ sides: 6 })).not.toThrow();
      expect(() => diceTool.validate({ sides: 20 })).not.toThrow();
      expect(() => diceTool.validate({})).not.toThrow(); // デフォルト値を使用
    });

    it('should throw for invalid sides', () => {
      expect(() => diceTool.validate({ sides: 0 })).toThrow(ToolInputValidationError);
      expect(() => diceTool.validate({ sides: -5 })).toThrow(ToolInputValidationError);
      expect(() => diceTool.validate({ sides: 'six' as any })).toThrow(ToolInputValidationError);
    });
  });

  describe('execute', () => {
    it('should return a number between 1 and sides', async () => {
      const result = await diceTool.execute({ sides: 6 });
      expect(result.result).toBeGreaterThanOrEqual(1);
      expect(result.result).toBeLessThanOrEqual(6);
      expect(result.sides).toBe(6);
    });

    it('should use 6 sides by default', async () => {
      const result = await diceTool.execute({});
      expect(result.result).toBeGreaterThanOrEqual(1);
      expect(result.result).toBeLessThanOrEqual(6);
      expect(result.sides).toBe(6);
    });

    // サイドが0以下の場合のテストは、validateメソッドのテストで代替する
    // validateメソッドがエラーをスローすればhandlerメソッドはexecuteを実行しないため

    it('should have uniform distribution (rough test)', async () => {
      const sides = 6;
      const rolls = 1000;
      const counts = new Array(sides + 1).fill(0); // インデックス0は使用しない
      
      for (let i = 0; i < rolls; i++) {
        const result = await diceTool.execute({ sides });
        counts[result.result]++;
      }
      
      // 各目の出現回数が期待範囲内かチェック（完全な均一分布は期待できないため大まかな検証）
      const expectedAverage = rolls / sides;
      const tolerance = 0.3; // 許容誤差（30%）
      
      for (let i = 1; i <= sides; i++) {
        const count = counts[i];
        expect(count).toBeGreaterThan(expectedAverage * (1 - tolerance));
        expect(count).toBeLessThan(expectedAverage * (1 + tolerance));
      }
    });
  });
}); 