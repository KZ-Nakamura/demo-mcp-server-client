import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { 
  MCPRequest, 
  MCPResponse, 
  MCPCallToolRequest, 
  MCPListToolsRequest,
  MCPCallToolResponse,
  MCPListToolsResponse
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
        
        let request: MCPRequest;
        let response: MCPResponse;
        
        try {
          request = JSON.parse(requestStr) as MCPRequest;
          response = await this.processRequest(request);
        } catch (error) {
          this.logger.error(`Error processing request: ${error instanceof Error ? error.message : String(error)}`);
          response = {
            id: 'unknown_id',
            error: `Error processing request: ${error instanceof Error ? error.message : String(error)}`
          } as MCPResponse;
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
   * リクエストを処理する
   * @param request リクエスト
   * @returns レスポンス
   */
  private async processRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.action) {
      case 'list_tools':
        return this.handleListTools(request as MCPListToolsRequest);
      case 'call_tool':
        return await this.handleCallTool(request as MCPCallToolRequest);
      default:
        return {
          id: request.id,
          error: `Unknown action: ${(request as any).action}`
        } as MCPResponse;
    }
  }

  /**
   * ツール一覧取得リクエストを処理する
   * @param request リクエスト
   * @returns レスポンス
   */
  private handleListTools(request: MCPListToolsRequest): MCPListToolsResponse {
    try {
      const tools = this.listTools();
      return {
        id: request.id,
        tools
      };
    } catch (error) {
      return {
        id: request.id,
        tools: [],
        error: `Error listing tools: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * ツール呼び出しリクエストを処理する
   * @param request リクエスト
   * @returns レスポンス
   */
  private async handleCallTool(request: MCPCallToolRequest): Promise<MCPCallToolResponse> {
    try {
      const output = await this.callTool(request.tool_name, request.inputs);
      return {
        id: request.id,
        output
      };
    } catch (error) {
      return {
        id: request.id,
        output: null,
        error: `Error calling tool '${request.tool_name}': ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // レスポンスを送信する処理
  private sendResponse = (response: MCPResponse) => {
    try {
      this.connection.send(JSON.stringify(response));
    } catch (error) {
      console.error('Failed to send response:', error);
    }
  };

  /**
   * リクエストのIDを取得する
   * @param request リクエスト
   * @returns リクエストID
   */
  private getRequestId(request: MCPRequest): string {
    if ('id' in request) {
      return request.id;
    }
    return `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  /**
   * 関数呼び出しを処理する
   * 
   * この関数は将来の拡張用途として残しておくが現在は使用しない
   */
  async handleFunctionCall(request: MCPRequest): Promise<void> {
    // 関数呼び出し以外は無視
    if (!('type' in request) || request.type !== 'function_call') return;

    try {
      // ツール名を取得
      if (!('name' in request)) {
        throw new Error('Tool name is missing');
      }
      const toolName = request.name as string;
      
      // 引数を解析
      let args: Record<string, any> = {};
      try {
        if ('arguments' in request) {
          args = JSON.parse(request.arguments as string);
        }
      } catch (error) {
        throw new Error(`Invalid arguments: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // ツールを実行
      try {
        const result = await this.callTool(toolName, args);
        
        // 成功レスポンスを送信
        const response: MCPCallToolResponse = {
          id: this.getRequestId(request),
          output: result
        };
        this.sendResponse(response);
      } catch (error) {
        // エラーレスポンスを送信
        const response: MCPCallToolResponse = {
          id: this.getRequestId(request),
          output: null,
          error: `Error calling tool: ${error instanceof Error ? error.message : String(error)}`
        };
        this.sendResponse(response);
      }
    } catch (error) {
      // 予期しないエラー
      const errorMessage = error instanceof Error ? error.message : String(error);
      defaultLogger.error(`Function call error: ${errorMessage}`);
      
      const response: MCPCallToolResponse = {
        id: this.getRequestId(request),
        error: `Function call error: ${errorMessage}`,
        output: null
      };
      this.sendResponse(response);
    }
  }
} 