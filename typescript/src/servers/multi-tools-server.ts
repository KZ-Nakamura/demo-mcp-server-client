import { MCPServer } from '../mcp/server.js';
import { StdioConnection } from '../mcp/stdio-connection.js';
import { defaultLogger } from '../utils/logger.js';
import { DiceTool } from '../tools/dice.js';
import { CurrentTimeTool } from '../tools/current-time.js';

/**
 * 複数のツールを提供するサーバー
 */
export class MultiToolsServer {
  private server: MCPServer;
  
  /**
   * コンストラクタ
   */
  constructor() {
    // 標準入出力を使用した接続を作成
    const connection = new StdioConnection();
    
    // MCPサーバーを作成
    this.server = new MCPServer(connection, defaultLogger);
    
    // ツールを登録
    this.registerTools();
  }
  
  /**
   * ツールを登録する
   */
  private registerTools(): void {
    // サイコロツール
    const diceTool = new DiceTool();
    this.server.registerTool(diceTool);
    
    // 現在時刻ツール
    const timeTool = new CurrentTimeTool();
    this.server.registerTool(timeTool);
  }
  
  /**
   * サーバーを開始する
   */
  async startServer(): Promise<void> {
    try {
      await this.server.start();
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }
  
  /**
   * サーバーを停止する
   */
  async stopServer(): Promise<void> {
    try {
      await this.server.stop();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  }
} 