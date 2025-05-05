import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { 
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCSuccessResponse,
  JSONRPCErrorResponse,
  JSONRPCError,
  MCPErrorCode,
  MCPListToolsResult,
  MCPCallToolResult
} from '../types/mcp.js';
import { 
  Tool, 
  ToolInputValidationError, 
  ToolExecutionError,
  ToolInfo
} from '../types/tools.js';
import { validateInput } from '../utils/schema-validator.js';

/**
 * MCPサーバー
 * ツールの登録、リスト取得、実行などの機能を提供
 */
export class MCPServer {
  private running = false;
  private tools: Map<string, Tool> = new Map();
  private initialized = false;

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
   * サーバーを開始する
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    await this.connection.initialize();
    this.running = true;
    this.logger.info('MCP server started');
    
    try {
      await this.handleRequests();
    } catch (error) {
      this.logger.error(`Server error: ${error instanceof Error ? error.message : String(error)}`);
      await this.stop();
    }
  }

  /**
   * サーバーを停止する
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    await this.connection.close();
    this.running = false;
    this.logger.info('MCP server stopped');
  }

  /**
   * ツールを登録する
   * @param tool 登録するツール
   * @param override 既存のツールを上書きするかどうか
   */
  registerTool(tool: Tool, override = false): void {
    if (this.tools.has(tool.name) && !override) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }

    this.tools.set(tool.name, tool);
    this.logger.info(`Tool '${tool.name}' registered`);
  }

  /**
   * ツールを削除する
   * @param name 削除するツールの名前
   */
  unregisterTool(name: string): void {
    if (!this.tools.has(name)) {
      throw new Error(`Tool '${name}' is not registered`);
    }

    this.tools.delete(name);
    this.logger.info(`Tool '${name}' unregistered`);
  }

  /**
   * 登録されているツールの一覧を取得する
   * @returns ツール一覧
   */
  listTools(): ToolInfo[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));
  }

  /**
   * ツールを実行する
   * @param name 実行するツールの名前
   * @param inputs ツールの入力値
   * @returns ツールの出力値
   */
  async callTool(name: string, inputs: Record<string, any> = {}): Promise<any> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    this.logger.debug(`Calling tool '${name}' with inputs: ${JSON.stringify(inputs)}`);
    
    try {
      // 入力値のバリデーション
      await validateInput(tool.inputSchema, inputs);
      
      // ツールの実行
      const output = await tool.handler(inputs);
      
      this.logger.debug(`Tool '${name}' execution result: ${JSON.stringify(output)}`);
      return output;
    } catch (error) {
      if (error instanceof ToolInputValidationError) {
        this.logger.warn(`Input validation failed for tool '${name}': ${error.message}`);
        throw error;
      }
      
      this.logger.error(`Error executing tool '${name}': ${error instanceof Error ? error.message : String(error)}`);
      throw new ToolExecutionError(`Error executing tool '${name}'`, error);
    }
  }

  /**
   * リクエストの処理ループ
   */
  private async handleRequests(): Promise<void> {
    while (this.running) {
      try {
        const requestStr = await this.connection.receive();
        this.logger.debug(`Received request: ${requestStr}`);
        
        let request: JSONRPCRequest;
        let response: JSONRPCResponse;
        
        try {
          // リクエストをパースする
          request = this.parseJsonRpcRequest(requestStr);
          
          // JSON-RPC通知（IDなし）の場合
          if (request.id === null || request.id === undefined) {
            if (request.method === 'notifications/initialized') {
              this.initialized = true;
              this.logger.info('Server initialized');
            }
            continue; // レスポンスは返さない
          }
          
          // リクエストを処理
          response = await this.processJsonRpcRequest(request);
        } catch (error) {
          this.logger.error(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
          
          // パースエラーの場合は不明なリクエストIDとして扱う
          response = {
            jsonrpc: '2.0',
            id: null,
            error: {
              code: MCPErrorCode.ParseError,
              message: error instanceof Error ? error.message : String(error)
            }
          };
        }
        
        const responseStr = JSON.stringify(response);
        this.logger.debug(`Sending response: ${responseStr}`);
        await this.connection.send(responseStr);
      } catch (error) {
        this.logger.error(`Connection error: ${error instanceof Error ? error.message : String(error)}`);
        if (this.connection.isConnected()) {
          continue;
        }
        break;
      }
    }
  }

  /**
   * JSON-RPCリクエストをパースする
   * @param requestStr リクエスト文字列
   * @returns パースされたJSONRPCリクエスト
   */
  private parseJsonRpcRequest(requestStr: string): JSONRPCRequest {
    if (!requestStr || typeof requestStr !== 'string') {
      throw new Error('Invalid request format: empty or not a string');
    }
    
    let parsed: any;
    try {
      parsed = JSON.parse(requestStr);
    } catch (error) {
      throw new Error(`JSON parse error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid request format: not an object');
    }
    
    // jsonrpcフィールドのチェック
    if (parsed.jsonrpc !== '2.0') {
      throw new Error(`Invalid JSON-RPC version: ${parsed.jsonrpc}`);
    }
    
    // methodフィールドのチェック
    if (!parsed.method || typeof parsed.method !== 'string') {
      throw new Error('Invalid method field');
    }
    
    return parsed as JSONRPCRequest;
  }

  /**
   * JSON-RPCリクエストを処理する
   * @param request JSONRPCリクエスト
   * @returns JSONRPCレスポンス
   */
  private async processJsonRpcRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    // 初期化前の許可されたメソッド
    const allowedPreInitMethods = ['initialize', 'ping'];
    
    // 初期化前で許可されていないメソッドの場合はエラー
    if (!this.initialized && !allowedPreInitMethods.includes(request.method)) {
      return this.createErrorResponse(request.id, MCPErrorCode.MethodNotFound,
        `Method ${request.method} is not allowed before initialization`);
    }
    
    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(request);
        
      case 'ping':
        return this.createSuccessResponse(request.id, 'pong');
        
      case 'tools/list':
        return this.handleListTools(request);
        
      case 'tools/call':
        return await this.handleCallTool(request);
        
      case 'shutdown':
        // シャットダウンリクエストの処理
        setTimeout(() => this.stop(), 100);
        return this.createSuccessResponse(request.id, { success: true });
        
      default:
        return this.createErrorResponse(request.id, MCPErrorCode.MethodNotFound,
          `Method ${request.method} not found`);
    }
  }

  /**
   * 初期化リクエストを処理する
   * @param request 初期化リクエスト
   * @returns JSONRPCレスポンス
   */
  private handleInitialize(request: JSONRPCRequest): JSONRPCSuccessResponse {
    const params = request.params || {};
    this.logger.info(`Initializing with client: ${JSON.stringify(params.client || {})}`);
    
    return this.createSuccessResponse(request.id, {
      protocolVersion: '2025-03-26',
      serverInfo: {
        name: 'MCP TypeScript Server',
        version: '1.0.0'
      }
    });
  }

  /**
   * ツール一覧リクエストを処理する
   * @param request ツール一覧リクエスト
   * @returns JSONRPCレスポンス
   */
  private handleListTools(request: JSONRPCRequest): JSONRPCSuccessResponse {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    
    const result: MCPListToolsResult = { tools };
    return this.createSuccessResponse(request.id, result);
  }

  /**
   * ツール呼び出しリクエストを処理する
   * @param request ツール呼び出しリクエスト
   * @returns JSONRPCレスポンス
   */
  private async handleCallTool(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const params = request.params || {};
    
    if (!params.name || typeof params.name !== 'string') {
      return this.createErrorResponse(request.id, MCPErrorCode.InvalidParams,
        'Tool name is required and must be a string');
    }
    
    const toolName = params.name;
    const args = params.args || {};
    
    try {
      // ツールの呼び出し
      const output = await this.callTool(toolName, args);
      
      // Ruby実装との互換性を保つ
      const result: MCPCallToolResult = {
        output,
        content: output // Ruby実装では'content'を使用
      };
      
      return this.createSuccessResponse(request.id, result);
    } catch (error) {
      if (error instanceof ToolInputValidationError) {
        return this.createErrorResponse(request.id, MCPErrorCode.InvalidToolInput, error.message);
      } else if (error instanceof ToolExecutionError) {
        return this.createErrorResponse(request.id, MCPErrorCode.ToolExecutionError, error.message);
      } else if (error instanceof Error && error.message.includes('not found')) {
        return this.createErrorResponse(request.id, MCPErrorCode.ToolNotFound, error.message);
      } else {
        return this.createErrorResponse(request.id, MCPErrorCode.InternalError,
          `Tool execution error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * 成功レスポンスを作成する
   * @param id リクエストID
   * @param result 結果オブジェクト
   * @returns 成功レスポンス
   */
  private createSuccessResponse(id: string | number | null, result: any): JSONRPCSuccessResponse {
    return {
      jsonrpc: '2.0',
      id,
      result
    };
  }

  /**
   * エラーレスポンスを作成する
   * @param id リクエストID
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param data 追加データ（オプション）
   * @returns エラーレスポンス
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): JSONRPCErrorResponse {
    const error: JSONRPCError = {
      code,
      message
    };
    
    if (data !== undefined) {
      error.data = data;
    }
    
    return {
      jsonrpc: '2.0',
      id,
      error
    };
  }
} 