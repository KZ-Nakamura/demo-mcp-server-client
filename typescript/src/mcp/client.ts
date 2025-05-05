import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { 
  MCPMessage, 
  MCPRequest, 
  MCPResponse,
  MCPListToolsResponse,
  MCPCallToolResponse
} from '../types/mcp.js';
import { ToolInfo } from '../types/tools.js';

/**
 * MCPクライアント
 * サーバーと通信して利用可能なツールのリストを取得したり、ツールを呼び出したりする
 */
export class MCPClient {
  private connected = false;

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

    const request: MCPRequest = {
      action: 'list_tools',
      id: this.generateRequestId()
    };

    const response = await this.sendRequest<MCPListToolsResponse>(request);
    return response.tools;
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

    const request: MCPRequest = {
      action: 'call_tool',
      id: this.generateRequestId(),
      tool_name: toolName,
      inputs
    };

    const response = await this.sendRequest<MCPCallToolResponse>(request);
    return response.output;
  }

  /**
   * リクエストを送信し、レスポンスを待つ
   * @param request リクエスト
   * @returns レスポンス
   */
  private async sendRequest<T extends MCPResponse>(request: MCPRequest): Promise<T> {
    const requestStr = JSON.stringify(request);
    
    this.logger.debug(`Sending request: ${requestStr}`);
    await this.connection.send(requestStr);

    const responseStr = await this.connection.receive();
    this.logger.debug(`Received response: ${responseStr}`);
    
    const response = this.parseResponse<T>(responseStr);
    
    if (response.error) {
      throw new Error(`Server error: ${response.error}`);
    }
    
    return response;
  }

  /**
   * レスポンス文字列をJSONオブジェクトにパース
   * @param responseStr レスポンス文字列
   * @returns パースされたレスポンスオブジェクト
   */
  private parseResponse<T extends MCPResponse>(responseStr: string): T {
    try {
      const response = JSON.parse(responseStr) as T;
      
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to parse response: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Failed to parse response: ${responseStr}`);
    }
  }

  /**
   * リクエストIDを生成
   * @returns リクエストID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }
} 