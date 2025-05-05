import { BaseTool } from './base-tool.js';
import { ToolInputSchema } from '../types/tools.js';

/**
 * 時刻フォーマットの種類
 */
type TimeFormat = 'iso' | 'readable' | 'unix';

interface CurrentTimeInput {
  format?: TimeFormat;
}

/**
 * 現在時刻ツール
 * 現在の時刻を様々なフォーマットで返す
 */
export class CurrentTimeTool extends BaseTool<CurrentTimeInput> {
  name = 'current_time';
  description = '現在の時刻を取得する';
  inputSchema: ToolInputSchema = {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['iso', 'readable', 'unix']
      }
    }
  };

  /**
   * 現在時刻を指定されたフォーマットで返す
   * @param input 入力パラメータ
   * @returns フォーマットされた現在時刻
   */
  async execute(input: CurrentTimeInput): Promise<string> {
    const format = input.format || 'iso';
    const now = new Date();

    switch (format) {
      case 'iso':
        return now.toISOString();
      case 'readable':
        return now.toString();
      case 'unix':
        return now.getTime().toString();
      default:
        return now.toISOString();
    }
  }
} 