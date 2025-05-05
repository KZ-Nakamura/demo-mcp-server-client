import { Tool, ToolInputSchema } from '../types/tools.js';
import { validateSchema } from '../utils/schema-validator.js';

/**
 * ツール実装の基底クラス
 * 全てのツールはこのクラスを継承して実装する
 */
export abstract class BaseTool<T = any> implements Tool {
  abstract name: string;
  abstract description: string;
  abstract inputSchema: ToolInputSchema;

  /**
   * 入力値を検証する
   * @param input 検証する入力値
   */
  validate(input: unknown): void {
    validateSchema(this.inputSchema, input);
  }

  /**
   * ツールの処理を実行する
   * サブクラスで実装する
   * @param input 検証済みの入力値
   */
  abstract execute(input: T): Promise<any>;

  /**
   * ツールのハンドラ関数
   * 入力値を検証し、検証に成功した場合にツールの処理を実行する
   * @param input 入力値
   * @returns ツールの実行結果
   */
  async handler(input: unknown): Promise<any> {
    this.validate(input);
    return await this.execute(input as T);
  }
} 