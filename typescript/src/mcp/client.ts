import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { 
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCSuccessResponse,
  MCPListToolsResult,
  MCPCallToolResult
} from '../types/mcp.js';
import { ToolInfo } from '../types/tools.js';

/**
 * MCPクライアント
 * サーバーと通信して利用可能なツールのリストを取得したり、ツールを呼び出したりする
 */
export class MCPClient {
  private connected = false;
  private requestCounter = 0;

  /**
   * コンストラクタ
   * @param connection 通信層の実装
   * @param logger ロガー
   */
  constructor(
    private readonly connection: Connection,
    private readonly logger: Logger = defaultLogger
  ) {}

  /**
   * クライアントの初期化
   */
  async initialize(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.connection.initialize();
    
    // JSONRPCプロトコルバージョン2を使用する初期化リクエスト
    const initResult = await this.sendJsonRpcRequest('initialize', {
      protocolVersion: '2025-03-26',
      client: {
        name: 'MCP TypeScript Client',
        version: '1.0.0'
      }
    });
    
    // 初期化通知
    await this.connection.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }));
    
    this.connected = true;
    this.logger.info('MCP client initialized');
  }

  /**
   * クライアントの終了
   */
  async close(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.sendJsonRpcRequest('shutdown', {});
    } catch (error) {
      this.logger.warn('Shutdown request failed', { error });
    }

    await this.connection.close();
    this.connected = false;
    this.logger.info('MCP client closed');
  }

  /**
   * 利用可能なツールのリストを取得
   * @returns 利用可能なツールのリスト
   */
  async listTools(): Promise<ToolInfo[]> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    const result = await this.sendJsonRpcRequest<MCPListToolsResult>('tools/list', {});
    return result.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }

  /**
   * ツールを呼び出す
   * @param toolName 呼び出すツールの名前
   * @param inputs ツールの入力値
   * @returns ツールの出力値
   */
  async callTool(toolName: string, inputs: Record<string, any> = {}): Promise<any> {
    if (!this.connected) {
      throw new Error('Client not initialized');
    }

    const result = await this.sendJsonRpcRequest<MCPCallToolResult>('tools/call', {
      name: toolName,
      args: inputs
    });
    
    return result.content;
  }

  /**
   * JSONRPCリクエストを送信し、レスポンスを待つ
   * @param method メソッド名
   * @param params パラメータ
   * @returns レスポンス結果
   */
  private async sendJsonRpcRequest<T>(method: string, params: any): Promise<T> {
    const id = ++this.requestCounter;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };
    
    const requestStr = JSON.stringify(request);
    this.logger.debug(`Sending JSON-RPC request:`, { request });
    await this.connection.send(requestStr);

    const responseStr = await this.connection.receive();
    this.logger.debug(`Received JSON-RPC response:`, { response: responseStr });
    
    const response = this.parseJsonRpcResponse(responseStr);
    
    if ('error' in response && response.error) {
      const errorMsg = `Server error: ${response.error.message} (${response.error.code})`;
      this.logger.error(errorMsg, { error: response.error });
      throw new Error(errorMsg);
    }
    
    return response.result as T;
  }

  /**
   * レスポンス文字列をJSONRPCレスポンスオブジェクトにパース
   * @param responseStr レスポンス文字列
   * @returns パースされたレスポンスオブジェクト
   */
  private parseJsonRpcResponse(responseStr: string): JSONRPCResponse {
    try {
      // JSONオブジェクトかどうかを確認
      const trimmed = responseStr.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        // JSONでない場合はエラーとして扱う
        this.logger.warn('非JSONレスポンスを受信:', { responseStr });
        return {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: `Parse error: Response is not a valid JSON - ${responseStr}`
          }
        };
      }
      
      // 通常のJSONパース
      const response = JSON.parse(responseStr) as JSONRPCResponse;
      
      if (!response || typeof response !== 'object' || response.jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid JSON-RPC response'
          }
        };
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to parse JSON-RPC response:`, { error, responseStr });
      return {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${error instanceof Error ? error.message : String(error)}`
        }
      };
    }
  }
} 