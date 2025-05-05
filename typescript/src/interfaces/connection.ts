/// <reference types="node" />

/**
 * MCP通信インターフェース
 */
export interface Connection {
  /**
   * 初期化処理
   */
  initialize(): Promise<void>;

  /**
   * メッセージ送信
   * @param message 送信するメッセージ（JSON文字列形式）
   */
  send(message: string): Promise<void>;

  /**
   * メッセージ受信
   * @returns 受信したメッセージ（JSON文字列形式）
   */
  receive(): Promise<string>;

  /**
   * 接続終了
   */
  close(): Promise<void>;

  /**
   * 接続が有効かどうかを確認
   */
  isConnected(): boolean;
}

/**
 * 読み取り可能なストリームインターフェース
 */
export interface ReadableStreamLike {
  on(event: 'data', listener: (chunk: Buffer | string) => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'close', listener: () => void): this;
  removeListener(event: string, listener: Function): this;
  removeAllListeners(event?: string): this;
}

/**
 * 書き込み可能なストリームインターフェース
 */
export interface WritableStreamLike {
  write(chunk: string | Buffer, callback?: (error?: Error | null) => void): boolean;
  end(callback?: () => void): void;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'close', listener: () => void): this;
  removeListener(event: string, listener: Function): this;
  removeAllListeners(event?: string): this;
} 