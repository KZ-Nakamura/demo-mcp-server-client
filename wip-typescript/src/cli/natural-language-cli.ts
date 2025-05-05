/**
 * 自然言語対話を処理するCLIクラス
 * LLMプロバイダーを使用してユーザーとの対話を管理します
 */

import * as readline from 'readline';
import { LLMProvider } from '../interfaces/llm-provider.js';
import { Logger } from '../interfaces/logger.js';
import { defaultLogger } from '../utils/logger.js';
import { LLMMessage } from '../types/llm.js';
import { NaturalLanguageCLIInterface } from '../interfaces/cli/cli-interface.js';
import { MCPHost } from '../mcp/host.js';
import { ToolInfo } from '../types/tools.js';

/**
 * チャット履歴のメッセージ型
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 自然言語対話CLIクラス
 */
export class NaturalLanguageCLI implements NaturalLanguageCLIInterface {
  private history: ChatMessage[] = [];
  private rl: readline.Interface;
  private isProcessing = false;
  private isRunning = false;

  /**
   * コンストラクタ
   * @param llmProvider LLMプロバイダー
   * @param logger ロガー
   * @param host MCPホスト（ツール連携用、指定がなければLLM直接呼び出し）
   */
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly logger: Logger = defaultLogger,
    private readonly host?: MCPHost
  ) {
    // 標準入出力用のインターフェース
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // システムメッセージを履歴に追加
    this.history.push({
      role: 'system',
      content: 'あなたは役立つAIアシスタントです。ユーザーの質問や指示に丁寧に答えてください。必要に応じて利用可能なツールを活用してください。ツールを使う際は、適切な形式で関数呼び出しをJSONとして記述してください。'
    });
  }

  /**
   * CLIを開始する
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // ホストがある場合は初期化
    if (this.host) {
      try {
        // ホストが既に初期化されていることを前提とする
        this.logger.info('ホストが既に初期化されています');
      } catch (error) {
        this.logger.error(`ホスト初期化エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    await this.startInteractiveSession();
  }

  /**
   * CLIを停止する
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    this.rl.close();
    this.logger.info('自然言語対話CLIを停止しました');
  }

  /**
   * 対話セッションを開始
   */
  async startInteractiveSession(): Promise<void> {
    this.logger.info('自然言語対話モードを開始します');
    
    console.log('\n===== 自然言語対話モード =====');
    console.log('質問や指示を入力してください。終了するには「exit」と入力してください。');
    console.log('------------------------------\n');
    
    // ホスト情報の表示
    if (this.host) {
      try {
        // ホストがすでに初期化されていることを前提とする
        console.log('MCPツール連携モードで実行中です。自然言語での指示でツールを呼び出せます。');
        this.logger.info('MCPツール連携モードで起動しました');
      } catch (error) {
        console.log('MCPツール連携モードで実行中ですが、ツール情報の取得に失敗しました。');
        this.logger.error(`ツール情報取得エラー: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.log('単純対話モードで実行中です。ツール連携は利用できません。');
    }
    console.log('');
    
    this.showHelp();
    
    // メインの対話ループ
    await this.chatLoop();
    
    // 終了処理
    await this.stop();
  }

  /**
   * ヘルプを表示
   */
  showHelp(): void {
    console.log('コマンド:');
    console.log('  exit      - 対話を終了します');
    console.log('  clear     - チャット履歴をクリアします');
    console.log('  help      - このヘルプを表示します');
    if (this.host) {
      console.log('  tools     - 利用可能なツール一覧を表示します');
    }
    console.log('');
  }

  /**
   * ユーザー入力を処理
   * @param input ユーザー入力
   */
  async processInput(input: string): Promise<void> {
    const trimmedInput = input.trim();
    
    // 特殊コマンド処理
    if (trimmedInput.toLowerCase() === 'exit') {
      console.log('\nセッションを終了します。');
      await this.stop();
      return;
    }
    
    if (trimmedInput.toLowerCase() === 'clear') {
      this.clearHistory();
      console.log('\nチャット履歴をクリアしました。\n');
      return;
    }
    
    if (trimmedInput.toLowerCase() === 'help') {
      this.showHelp();
      return;
    }
    
    if (trimmedInput.toLowerCase() === 'tools' && this.host) {
      await this.showTools();
      return;
    }
    
    if (trimmedInput === '') {
      return;
    }
    
    // 通常の入力処理
    // 履歴に追加
    this.history.push({ role: 'user', content: trimmedInput });
    
    try {
      // 処理中フラグをセット
      this.isProcessing = true;
      console.log('\n処理中...');
      
      // ホストがあればホスト経由で処理（ツール使用可能）
      if (this.host) {
        let response = await this.host.chat(trimmedInput);
        
        // JSON形式の応答かどうかを判定
        const isJsonResponse = this.isJsonResponse(response);
        
        if (isJsonResponse) {
          // ツール呼び出しが含まれている可能性があるJSONレスポンス
          console.log('\nツールを実行中...');
          
          try {
            const result = await this.processToolResponse(response);
            console.log(`\n${result}\n`);
            this.history.push({ role: 'assistant', content: result });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`\nツール実行エラー: ${errorMessage}\n`);
            this.logger.error(`ツール実行エラー: ${errorMessage}`);
            
            // エラー情報をLLMに戻してもらう
            const errorContext = `前回の応答でエラーが発生しました: ${errorMessage}\nもう一度、別の方法で回答してください。`;
            this.history.push({ role: 'system', content: errorContext });
            
            // 再度LLMに問い合わせ
            response = await this.llmProvider.sendMessage(this.convertToLLMMessages(this.history));
            console.log(`\n${response}\n`);
            this.history.push({ role: 'assistant', content: response });
          }
        } else {
          // 通常のテキスト応答
          console.log(`\n${response}\n`);
          this.history.push({ role: 'assistant', content: response });
        }
      } else {
        // ホストがなければLLM直接呼び出し
        const llmMessages = this.convertToLLMMessages(this.history);
        const response = await this.llmProvider.sendMessage(llmMessages);
        console.log(`\n${response}\n`);
        this.history.push({ role: 'assistant', content: response });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\nエラーが発生しました: ${errorMessage}\n`);
      this.logger.error(`対話処理エラー: ${errorMessage}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 応答がJSON形式かどうかを判定
   */
  private isJsonResponse(response: string): boolean {
    try {
      // JSONとして解析可能で、function_callsプロパティを持つかどうか
      const parsed = JSON.parse(response.trim());
      return !!parsed.function_calls && Array.isArray(parsed.function_calls);
    } catch (error) {
      return false;
    }
  }

  /**
   * ツール呼び出しを含むレスポンスを処理
   */
  private async processToolResponse(response: string): Promise<string> {
    if (!this.host) {
      throw new Error('ホストが利用できません');
    }

    try {
      const parsed = JSON.parse(response.trim());
      
      if (!parsed.function_calls || !Array.isArray(parsed.function_calls) || parsed.function_calls.length === 0) {
        return response; // ツール呼び出しなし
      }
      
      // ツール呼び出しを処理
      const functionCalls = parsed.function_calls;
      
      // ツール呼び出しの結果を収集
      const results = await Promise.all(functionCalls.map(async (call: { name: string; arguments: Record<string, unknown> }) => {
        try {
          this.logger.info(`ツール実行: ${call.name}`, { args: call.arguments });
          console.log(`\nツール「${call.name}」を実行中...`);
          
          // ツールを呼び出し
          const result = await this.host!.chat(
            JSON.stringify({
              thoughts: `ツール「${call.name}」を呼び出します`,
              function_calls: [call]
            })
          );
          
          return {
            name: call.name,
            result,
            success: true
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`ツール呼び出しエラー: ${errorMessage}`, { tool: call.name });
          
          return {
            name: call.name,
            error: errorMessage,
            success: false
          };
        }
      }));
      
      // 結果を表示
      results.forEach(r => {
        if (r.success) {
          console.log(`\nツール「${r.name}」の結果: ${r.result}`);
        } else {
          console.error(`\nツール「${r.name}」のエラー: ${r.error}`);
        }
      });
      
      // ツール実行結果をLLMに渡して最終回答を生成
      const toolResultMessage = `ツール実行結果:
${results.map(r => {
  if (r.success) {
    return `[${r.name}] 成功: ${r.result}`;
  } else {
    return `[${r.name}] エラー: ${r.error}`;
  }
}).join('\n')}

上記のツール実行結果を元に、ユーザーの質問に対して最終的な回答を生成してください。`;

      this.history.push({ role: 'system', content: toolResultMessage });
      
      // 最終的な応答を取得
      return await this.llmProvider.sendMessage(this.convertToLLMMessages(this.history));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`ツール処理エラー: ${errorMessage}`);
      throw new Error(`ツール処理に失敗しました: ${errorMessage}`);
    }
  }

  /**
   * 利用可能なツール一覧を表示
   */
  private async showTools(): Promise<void> {
    if (!this.host) {
      console.log('\nツール連携モードではありません。ツールは利用できません。\n');
      return;
    }
    
    try {
      // MCPHostからツール情報を取得する方法として、chat経由でツール一覧を要求
      const response = await this.host.chat('利用可能なツールを一覧表示してください');
      console.log('\n利用可能なツール:');
      console.log(response);
      console.log('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\nツール一覧取得エラー: ${errorMessage}\n`);
    }
  }

  /**
   * メインの対話ループ
   */
  private async chatLoop(): Promise<void> {
    while (this.isRunning) {
      const userInput = await this.promptUser();
      await this.processInput(userInput);
    }
  }

  /**
   * ChatMessageをLLMMessageに変換
   */
  private convertToLLMMessages(messages: ChatMessage[]): LLMMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * ユーザー入力を取得
   * @returns ユーザー入力
   */
  private promptUser(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question('> ', (input) => {
        resolve(input);
      });
    });
  }

  /**
   * チャット履歴をクリア
   */
  clearHistory(): void {
    // システムメッセージは残す
    const systemMessage = this.history.find(msg => msg.role === 'system');
    this.history = systemMessage ? [systemMessage] : [];
    this.logger.debug('チャット履歴をクリアしました');
  }

  /**
   * チャット履歴を取得
   */
  getHistory(): ChatMessage[] {
    return [...this.history];
  }
} 