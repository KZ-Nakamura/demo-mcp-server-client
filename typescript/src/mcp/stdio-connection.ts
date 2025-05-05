import { Connection, ReadableStreamLike, WritableStreamLike } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { createInterface } from 'readline';

/**
 * 標準入出力を使用した通信実装
 */
export class StdioConnection implements Connection {
  private connected = false;
  private readBuffer: string[] = [];
  private waitingForData: ((value: string) => void)[] = [];
  private rl: ReturnType<typeof createInterface> | null = null;

  /**
   * コンストラクタ
   * @param input 入力ストリーム（デフォルトはprocess.stdin）
   * @param output 出力ストリーム（デフォルトはprocess.stdout）
   * @param logger ロガー
   */
  constructor(
    private readonly input: ReadableStreamLike = process.stdin,
    private readonly output: WritableStreamLike = process.stdout,
    private readonly logger: Logger = defaultLogger
  ) {}

  /**
   * 通信の初期化
   */
  async initialize(): Promise<void> {
    if (this.connected) {
      return;
    }

    this.rl = createInterface({
      input: this.input as NodeJS.ReadableStream,
      terminal: false
    });

    this.rl.on('line', (line) => {
      this.logger.debug(`Received: ${line}`);
      
      if (this.waitingForData.length > 0) {
        // 待機中のリクエストがあれば、最初のリクエストに応答する
        const resolve = this.waitingForData.shift()!;
        resolve(line);
      } else {
        // 待機中のリクエストがなければバッファに追加
        this.readBuffer.push(line);
      }
    });

    this.connected = true;
    this.logger.info('StdioConnection initialized');
  }

  /**
   * メッセージの送信
   * @param message 送信するメッセージ（JSON文字列形式）
   */
  async send(message: string): Promise<void> {
    if (!this.connected) {
      throw new Error('Connection not initialized');
    }

    this.logger.debug(`Sending: ${message}`);
    
    return new Promise<void>((resolve, reject) => {
      this.output.write(`${message}\n`, (error) => {
        if (error) {
          this.logger.error(`Failed to send message: ${error.message}`);
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * メッセージの受信
   * @returns 受信したメッセージ（JSON文字列形式）
   */
  async receive(): Promise<string> {
    if (!this.connected) {
      throw new Error('Connection not initialized');
    }

    // バッファにデータがあればそれを返す
    if (this.readBuffer.length > 0) {
      return this.readBuffer.shift()!;
    }

    // バッファが空の場合は新しいデータを待つ
    return new Promise<string>((resolve) => {
      this.waitingForData.push(resolve);
    });
  }

  /**
   * 接続の終了
   */
  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    this.connected = false;
    this.logger.info('StdioConnection closed');
  }

  /**
   * 接続が有効かどうかを確認
   */
  isConnected(): boolean {
    return this.connected;
  }
} 