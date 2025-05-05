/**
 * ツール関連の型定義
 */

/**
 * ツールの入力スキーマ（JSONSchema準拠）
 */
export interface ToolInputSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

/**
 * ツールの基本情報
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

/**
 * ツール情報の型（サーバーからクライアントに送られる形式）
 */
export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

/**
 * ツールのハンドラー関数の型
 */
export type ToolHandler = (input: any) => Promise<any> | any;

/**
 * ツールの完全な定義
 */
export interface Tool extends ToolDefinition {
  handler: ToolHandler;
}

/**
 * ツール登録用のオプション
 */
export interface RegisterToolOptions {
  override?: boolean;
}

/**
 * ツール実行エラー型
 */
export class ToolExecutionError extends Error {
  constructor(message: string, public readonly data?: any) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

/**
 * ツール入力検証エラー型
 */
export class ToolInputValidationError extends Error {
  constructor(message: string, public readonly validationErrors: any[]) {
    super(message);
    this.name = 'ToolInputValidationError';
  }
} 