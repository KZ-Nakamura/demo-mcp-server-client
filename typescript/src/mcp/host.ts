import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { LLMProvider } from '../interfaces/llm-provider.js';
import { MCPClient } from './client.js';
import { ToolInfo } from '../types/tools.js';
import { LLMChatRequest, LLMChatResponse } from '../types/llm.js';

/**
 * MCPホスト
 * LLMプロバイダとの通信を行い、ツールの実行を仲介する
 */
export class MCPHost {
  private client: MCPClient;
  private availableTools: ToolInfo[] = [];
  private ready = false;

  /**
   * コンストラクタ
   * @param connection 通信層の実装
   * @param llmProvider LLMプロバイダ
   * @param logger ロガー
   */
  constructor(
    private readonly connection: Connection,
    private readonly llmProvider: LLMProvider,
    private readonly logger: Logger = defaultLogger
  ) {
    this.client = new MCPClient(connection, logger);
  }

  /**
   * ホストを初期化する
   */
  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    // MCPクライアントを初期化
    await this.client.initialize();
    
    // 利用可能なツールを取得
    this.availableTools = await this.client.listTools();
    this.logger.info(`Loaded ${this.availableTools.length} available tools`);
    
    this.ready = true;
    this.logger.info('MCP host initialized');
  }

  /**
   * ホストを終了する
   */
  async close(): Promise<void> {
    if (!this.ready) {
      return;
    }

    await this.client.close();
    this.ready = false;
    this.logger.info('MCP host closed');
  }

  /**
   * LLMとの会話を処理する
   * @param request LLMチャットリクエスト
   * @returns LLMチャットレスポンス
   */
  async chat(request: LLMChatRequest): Promise<LLMChatResponse> {
    if (!this.ready) {
      throw new Error('Host not initialized');
    }

    // ツール情報をLLMに提供
    const llmRequest = this.prepareLLMRequest(request);
    
    // LLMからの応答を取得
    let llmResponse = await this.llmProvider.chat(llmRequest);
    
    // ツール呼び出しを処理
    let toolCallCount = 0;
    const maxToolCalls = 10; // 無限ループ防止のための最大ツール呼び出し回数
    
    while (llmResponse.toolCalls && llmResponse.toolCalls.length > 0 && toolCallCount < maxToolCalls) {
      this.logger.debug(`Processing ${llmResponse.toolCalls.length} tool calls`);
      
      // ツール呼び出しの結果を格納する配列
      const toolResults = [];
      
      // 各ツール呼び出しを処理
      for (const toolCall of llmResponse.toolCalls) {
        try {
          const result = await this.processToolCall(toolCall);
          toolResults.push({
            toolCallId: toolCall.id,
            result
          });
        } catch (error) {
          this.logger.error(`Error processing tool call: ${error instanceof Error ? error.message : String(error)}`);
          toolResults.push({
            toolCallId: toolCall.id,
            error: `Error: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }
      
      // LLMに結果を送信して続きを取得
      llmResponse = await this.llmProvider.chat({
        ...llmRequest,
        toolResults
      });
      
      toolCallCount++;
    }
    
    if (toolCallCount >= maxToolCalls) {
      this.logger.warn(`Reached maximum tool call limit (${maxToolCalls})`);
    }
    
    return llmResponse;
  }

  /**
   * ツール呼び出しを処理する
   * @param toolCall LLMからのツール呼び出し
   * @returns ツール呼び出しの結果
   */
  private async processToolCall(toolCall: { id: string; name: string; arguments: Record<string, any> }): Promise<any> {
    const { name, arguments: args } = toolCall;
    
    this.logger.debug(`Processing tool call for '${name}' with args: ${JSON.stringify(args)}`);
    
    // ツールが利用可能か確認
    const toolExists = this.availableTools.some(tool => tool.name === name);
    if (!toolExists) {
      throw new Error(`Tool '${name}' not found in available tools`);
    }
    
    // ツールを呼び出す
    const result = await this.client.callTool(name, args);
    this.logger.debug(`Tool '${name}' returned: ${JSON.stringify(result)}`);
    
    return result;
  }

  /**
   * LLMリクエストを準備する
   * @param request 元のリクエスト
   * @returns ツール情報を含むLLMリクエスト
   */
  private prepareLLMRequest(request: LLMChatRequest): LLMChatRequest {
    return {
      ...request,
      tools: this.availableTools
    };
  }
} 