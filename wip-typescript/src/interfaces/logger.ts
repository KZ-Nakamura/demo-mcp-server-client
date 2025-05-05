/**
 * ロガーインターフェース
 */
export interface Logger {
  /**
   * デバッグレベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  debug(message: string, ...meta: any[]): void;

  /**
   * 情報レベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  info(message: string, ...meta: any[]): void;

  /**
   * 警告レベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  warn(message: string, ...meta: any[]): void;

  /**
   * エラーレベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  error(message: string, ...meta: any[]): void;

  /**
   * ログレベルを設定
   * @param level 設定するログレベル
   */
  setLevel(level: LogLevel): void;
}

/**
 * ロガーのレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ロガーの設定オプション
 */
export interface LoggerOptions {
  /**
   * ログレベル
   */
  level?: LogLevel;

  /**
   * ファイルへの出力パス（指定なしの場合は標準出力のみ）
   */
  filePath?: string;

  /**
   * フォーマット設定
   */
  format?: 'json' | 'simple' | 'detailed';

  /**
   * タイムスタンプ形式
   */
  timestamp?: boolean;

  /**
   * カラー出力を有効にするかどうか
   */
  colorize?: boolean;
} 