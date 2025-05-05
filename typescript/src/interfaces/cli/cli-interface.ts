/**
 * CLI関連のインターフェース定義
 */

/**
 * CLIインターフェース
 * すべてのCLI実装はこのインターフェースを実装する
 */
export interface CLIInterface {
  /**
   * CLIを開始する
   */
  start(): Promise<void>;

  /**
   * CLIを停止する
   */
  stop(): Promise<void>;
}

/**
 * 対話型CLIインターフェース
 * ユーザーとの対話を行うCLI
 */
export interface InteractiveCLIInterface extends CLIInterface {
  /**
   * 対話セッションを開始する
   */
  startInteractiveSession(): Promise<void>;

  /**
   * ユーザー入力を処理する
   * @param input ユーザー入力
   */
  processInput(input: string): Promise<void>;

  /**
   * ヘルプメッセージを表示する
   */
  showHelp(): void;
}

/**
 * 自然言語対話CLIインターフェース
 * LLMとの対話を行うCLI
 */
export interface NaturalLanguageCLIInterface extends InteractiveCLIInterface {
  /**
   * チャット履歴をクリアする
   */
  clearHistory(): void;

  /**
   * チャット履歴を取得する
   */
  getHistory(): any[];
} 