import { Connection } from '../interfaces/connection.js';
import { MCPServer } from '../mcp/server.js';
import { StdioConnection } from '../mcp/stdio-connection.js';
import { defaultLogger } from '../utils/logger.js';
import { BaseTool } from '../tools/base-tool.js';
import { DiceTool } from '../tools/dice.js';
import { CurrentTimeTool } from '../tools/current-time.js';

/**
 * 複数のツールを提供するサーバー
 */
export class MultiToolsServer {
  private server: MCPServer;
  
  /**
   * コンストラクタ
   * @param tools 提供するツール（デフォルトは組み込みツール）
   */
  constructor(tools?: BaseTool[]) {
    // 標準入出力を使用した接続を作成
    const connection = new StdioConnection();
    
    // MCPサーバーを作成
    this.server = new MCPServer(connection, defaultLogger);
    
    // ツールを登録
    if (tools && tools.length > 0) {
      this.registerCustomTools(tools);
    } else {
      this.registerDefaultTools();
    }
  }
  
  /**
   * デフォルトツールを登録する
   */
  private registerDefaultTools(): void {
    // サイコロツール
    const diceTool = new DiceTool();
    this.server.registerTool(diceTool);
    
    // 現在時刻ツール
    const timeTool = new CurrentTimeTool();
    this.server.registerTool(timeTool);
  }
  
  /**
   * カスタムツールを登録する
   */
  private registerCustomTools(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.server.registerTool(tool);
    }
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

  /**
   * 指定された接続を使用してサーバーを実行する
   * @param connection 使用する接続
   */
  async run(connection: Connection): Promise<void> {
    // 新しい接続を使用してサーバーを作成
    this.server = new MCPServer(connection, defaultLogger);
    
    // サーバーを開始
    return this.server.start();
  }
} 