import { MCPClient } from './client.js';
import { LLMProvider } from '../interfaces/llm-provider.js';
import { Logger } from '../interfaces/logger.js';
import { Message, ToolCall } from '../types/llm.js';
import { MCPToolInfo } from '../types/mcp.js';

/**
 * MCPホスト設定オプション
 */
export interface MCPHostOptions {
  serverCommand?: string;
  protocolVersion?: string;
  hostName?: string;
  hostVersion?: string;
}

/**
 * MCPホストクラス
 */
export class MCPHost {
  private tools: MCPToolInfo[] = [];
  private initialized = false;

  /**
   * コンストラクタ
   * @param client MCPクライアント
   * @param llmProvider LLMプロバイダー
   * @param logger ロガー
   * @param options ホスト設定オプション
   */
  constructor(
    private readonly client: MCPClient,
    private readonly llmProvider: LLMProvider,
    private readonly logger: Logger,
    private readonly options: MCPHostOptions = {}
  ) {}

  /**
   * ホストを初期化する
   */
  async initialize(): Promise<void> {
    // 実装をここに記述
    throw new Error('Not implemented');
  }

  /**
   * 利用可能なツール情報を取得する
   * @returns ツール情報の配列
   */
  async getTools(): Promise<MCPToolInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.tools;
  }

  /**
   * メッセージを処理する
   * @param messages これまでの会話メッセージ
   * @returns LLMからの応答メッセージ
   */
  async processMessage(messages: Message[]): Promise<Message> {
    // 実装をここに記述
    throw new Error('Not implemented');
  }

  /**
   * ツール呼び出しを処理する
   * @param toolCalls LLMから返されたツール呼び出し情報
   * @returns ツール応答メッセージの配列
   */
  private async processToolCalls(toolCalls: ToolCall[]): Promise<Message[]> {
    // 実装をここに記述
    throw new Error('Not implemented');
  }

  /**
   * ホストの接続を閉じる
   */
  async close(): Promise<void> {
    await this.client.close();
  }
} 