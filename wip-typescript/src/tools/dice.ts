import { BaseTool } from './base-tool.js';
import { ToolInputSchema } from '../types/tools.js';

interface DiceInput {
  sides?: number;
}

interface DiceResult {
  result: number;
  sides: number;
}

/**
 * サイコロを振るツール
 */
export class DiceTool extends BaseTool<DiceInput> {
  name = 'dice';
  description = '指定された面数のサイコロを振る';
  inputSchema: ToolInputSchema = {
    type: 'object',
    properties: {
      sides: {
        type: 'integer',
        minimum: 1,
        description: 'サイコロの面数'
      }
    }
  };

  /**
   * サイコロを振る
   * @param input 入力パラメータ
   * @returns 出目と面数
   */
  async execute(input: DiceInput): Promise<DiceResult> {
    // デフォルトは6面体
    const sides = input.sides || 6;
    
    // 1からsidesまでの整数をランダムに選択
    const result = Math.floor(Math.random() * sides) + 1;
    
    return {
      result,
      sides
    };
  }
} 