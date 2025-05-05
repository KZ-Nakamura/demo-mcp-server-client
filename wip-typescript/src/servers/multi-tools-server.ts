import { Connection } from '../interfaces/connection.js';
import { MCPServer } from '../mcp/server.js';
import { StdioConnection } from '../mcp/stdio-connection.js';
import { defaultLogger } from '../utils/logger.js';
import { BaseTool } from '../tools/base-tool.js';
import { DiceTool } from '../tools/dice.js';
import { CurrentTimeTool } from '../tools/current-time.js';
import { Tool } from '../types/tools.js';

/**
 * 複数のツールを提供するサーバー
 */
export class MultiToolsServer {
  private server: MCPServer;
  private tools: Map<string, Tool> = new Map();
  
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
    this.tools.set(diceTool.name, diceTool);
    
    // 現在時刻ツール
    const timeTool = new CurrentTimeTool();
    this.server.registerTool(timeTool);
    this.tools.set(timeTool.name, timeTool);
  }
  
  /**
   * カスタムツールを登録する
   */
  private registerCustomTools(tools: BaseTool[]): void {
    for (const tool of tools) {
      this.server.registerTool(tool);
      this.tools.set(tool.name, tool);
    }
  }
  
  /**
   * ツールを登録する
   * @param tool 登録するツール
   */
  registerTool(tool: BaseTool): void {
    this.server.registerTool(tool);
    this.tools.set(tool.name, tool);
  }
  
  /**
   * メッセージを処理する
   * @param message 処理するメッセージ
   * @param connection 使用する接続
   */
  async handleMessage(message: any, connection: Connection): Promise<void> {
    if (message.type !== 'function_call') return;
    
    try {
      // ツール名を取得
      const toolName = message.name;
      if (!toolName) {
        throw new Error('Tool name is missing');
      }
      
      // ツールを取得
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }
      
      // 引数を解析
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(message.arguments || '{}');
      } catch (error) {
        throw new Error(`Invalid JSON in arguments: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // ツールを実行
      const result = await tool.handler(args);
      
      // 成功レスポンスを送信
      const response = {
        type: 'function_call_response',
        name: toolName,
        content: JSON.stringify(result),
        id: message.id || `response_${Date.now()}`
      };
      
      await connection.send(JSON.stringify(response));
    } catch (error) {
      // エラーレスポンスを送信
      const response = {
        type: 'function_call_response',
        name: message.name || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        id: message.id || `error_${Date.now()}`
      };
      
      await connection.send(JSON.stringify(response));
    }
  }
  
  /**
   * 登録されているツールの一覧を取得する
   * @returns ツール一覧
   */
  getTools(): Tool[] {
    return Array.from(this.tools.values());
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
    
    // すでに登録済みのツールを再登録
    for (const tool of this.tools.values()) {
      this.server.registerTool(tool);
    }
    
    // サーバーを開始
    return this.server.start();
  }
} 