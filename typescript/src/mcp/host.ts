import { Connection } from '../interfaces/connection.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { LLMProvider } from '../interfaces/llm-provider.js';
import { MCPClient } from './client.js';
import { ToolInfo } from '../types/tools.js';
import { LLMChatRequest, LLMChatResponse, LLMMessage } from '../types/llm.js';

interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

interface LLMFunctionCallResponse {
  thoughts?: string;
  function_calls?: FunctionCall[];
}

/**
 * MCPホスト
 * LLMプロバイダとの通信を行い、ツールの実行を仲介する
 */
export class MCPHost {
  private client: MCPClient;
  private availableTools: ToolInfo[] = [];
  private ready = false;
  private conversationHistory: LLMMessage[] = [];
  private systemPrompt: string = `あなたは役立つAIアシスタントです。
必要に応じて利用可能なツールを使用して質問に答えることができます。
ツールの使用方法：
1. ユーザーの要求を理解する
2. 適切なツールを選択する
3. 以下の形式でツールを呼び出す:
{
  "thoughts": "ここにあなたの思考プロセスを書きます",
  "function_calls": [
    {
      "name": "ツール名",
      "arguments": {
        "param1": "値1",
        "param2": "値2"
      }
    }
  ]
}
4. ツールの結果を利用して最終的な回答を生成する

利用可能なツールは初期化時に提供されます。`;

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

    // システムプロンプトを会話履歴に追加
    this.conversationHistory.push({
      role: 'system',
      content: this.systemPrompt
    });
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
   * ユーザーのメッセージを処理し、LLMとツールを使って応答する
   * @param userMessage ユーザーからのメッセージ
   * @returns LLMからの応答
   */
  async chat(userMessage: string): Promise<string> {
    try {
      // ユーザーメッセージを履歴に追加
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      // LLMに会話を送信
      let llmResponse = await this.llmProvider.sendMessage(this.conversationHistory);
      
      // 関数呼び出しがあるか確認
      const functionCalls = this.extractFunctionCalls(llmResponse);
      
      if (functionCalls && functionCalls.length > 0) {
        defaultLogger.info('LLMが関数呼び出しを要求:', { functionCalls });
        
        // 関数呼び出しの結果を収集
        const results = await Promise.all(functionCalls.map(async call => {
          try {
            // ツールを呼び出す
            const result = await this.client.callTool(call.name, call.arguments);
            
            // 結果をLLMに送信するためのメッセージを作成
            return {
              name: call.name,
              result,
              success: true
            };
          } catch (error) {
            // エラーをキャプチャ
            const errorMessage = error instanceof Error ? error.message : String(error);
            defaultLogger.error(`ツール呼び出しエラー: ${errorMessage}`, { tool: call.name });
            
            // エラー情報を返す
            return {
              name: call.name,
              error: errorMessage,
              success: false
            };
          }
        }));
        
        // ツール実行結果をLLMに伝える
        this.conversationHistory.push({
          role: 'assistant',
          content: llmResponse
        });
        
        // ツール実行結果をシステムメッセージとして追加
        const toolResultMessage = `ツール実行結果:
${results.map(r => {
  if (r.success) {
    return `[${r.name}] 成功: ${JSON.stringify(r.result)}`;
  } else {
    return `[${r.name}] エラー: ${r.error}`;
  }
}).join('\n')}

上記のツール実行結果を元に、ユーザーの質問に対して最終的な回答を生成してください。`;

        this.conversationHistory.push({
          role: 'system',
          content: toolResultMessage
        });
        
        // 最終的な応答を取得
        llmResponse = await this.llmProvider.sendMessage(this.conversationHistory);
      }
      
      // アシスタントの応答を履歴に追加
      this.conversationHistory.push({
        role: 'assistant',
        content: llmResponse
      });
      
      return llmResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      defaultLogger.error(`チャットエラー: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * LLM応答から関数呼び出し情報を抽出
   * @param response LLMからの応答
   * @returns 関数呼び出し情報、なければnull
   */
  private extractFunctionCalls(response: string): FunctionCall[] | null {
    try {
      // JSONレスポンスかどうかを判定
      if (!response.trim().startsWith('{')) {
        return null;
      }
      
      const parsedResponse = JSON.parse(response) as LLMFunctionCallResponse;
      
      if (parsedResponse.function_calls && parsedResponse.function_calls.length > 0) {
        return parsedResponse.function_calls;
      }
      
      return null;
    } catch (error) {
      // JSON解析に失敗した場合は関数呼び出しなしと判断
      defaultLogger.debug('関数呼び出し解析エラー:', { error, response });
      return null;
    }
  }

  /**
   * LLMとの会話を処理する
   * @param request LLMチャットリクエスト
   * @returns LLMチャットレスポンス
   */
  async chatWithRequest(request: LLMChatRequest): Promise<LLMChatResponse> {
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