import { Connection } from '../interfaces/connection.js';
import { createInterface, Interface } from 'readline';
import { defaultLogger } from '../utils/logger.js';

/**
 * 標準入出力を使ったMCP接続
 */
export class StdioConnection implements Connection {
  private readline: Interface;
  private isOpen: boolean = false;
  private queue: string[] = [];
  private resolveMap: Map<string, (message: string) => void> = new Map();

  /**
   * 標準入出力接続を初期化
   * @param input 入力ストリーム（デフォルトはprocess.stdin）
   * @param output 出力ストリーム（デフォルトはprocess.stdout）
   */
  constructor(
    private readonly input = process.stdin,
    private readonly output = process.stdout
  ) {
    this.readline = createInterface({
      input: this.input,
      output: this.output,
      terminal: false
    });

    this.isOpen = true;

    // 標準入力からのメッセージを処理
    this.readline.on('line', (line: string) => {
      this.handleInput(line);
    });

    // 終了時の処理
    process.on('exit', () => {
      this.close();
    });
  }

  /**
   * 初期化処理
   * すでにコンストラクタで初期化済みだが、インターフェース互換のため
   */
  async initialize(): Promise<void> {
    // コンストラクタですでに初期化済み
    if (!this.isOpen) {
      this.isOpen = true;
      defaultLogger.debug('接続を再初期化しました');
    }
  }

  /**
   * 標準入力から受け取ったデータを処理
   * @param line 入力行
   */
  private handleInput(line: string): void {
    if (!this.isOpen) return;

    try {
      const message = line.trim();
      if (message) {
        defaultLogger.debug('受信メッセージ:', { message });
        
        // キューに追加
        this.queue.push(message);
        
        // 待機中のreceiveがあれば解決
        const resolve = this.resolveMap.get('receive');
        if (resolve) {
          const nextMessage = this.queue.shift();
          this.resolveMap.delete('receive');
          resolve(nextMessage!);
        }
      }
    } catch (error) {
      defaultLogger.error('入力処理エラー:', { error });
    }
  }

  /**
   * 接続が有効かどうかを確認
   * @returns 接続が有効な場合はtrue
   */
  isConnected(): boolean {
    return this.isOpen;
  }

  /**
   * メッセージを送信
   * @param message 送信するメッセージ
   */
  async send(message: string): Promise<void> {
    if (!this.isOpen) {
      throw new Error('Connection is closed');
    }

    defaultLogger.debug('送信メッセージ:', { message });
    this.output.write(`${message}\n`);
  }

  /**
   * メッセージを受信
   * @returns 受信したメッセージのPromise
   */
  async receive(): Promise<string> {
    if (!this.isOpen) {
      throw new Error('Connection is closed');
    }

    // キューにメッセージがあればすぐに返す
    if (this.queue.length > 0) {
      return this.queue.shift()!;
    }

    // メッセージを待機
    return new Promise<string>((resolve) => {
      this.resolveMap.set('receive', resolve);
    });
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    this.readline.close();
    
    // 待機中のPromiseをすべて解決
    for (const [, resolve] of this.resolveMap) {
      resolve('');
    }
    
    this.resolveMap.clear();
    defaultLogger.debug('接続を閉じました');
  }
} 