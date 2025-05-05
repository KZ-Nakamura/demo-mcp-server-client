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
   */
  constructor(
    private readonly llmProvider: LLMProvider,
    private readonly logger: Logger = defaultLogger
  ) {
    // 標準入出力用のインターフェース
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // システムメッセージを履歴に追加
    this.history.push({
      role: 'system',
      content: 'あなたは役立つAIアシスタントです。ユーザーの質問や指示に丁寧に答えてください。'
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
      
      // LLMに送信
      const llmMessages = this.convertToLLMMessages(this.history);
      const response = await this.llmProvider.sendMessage(llmMessages);
      
      // 応答を表示
      console.log(`\n${response}\n`);
      
      // 履歴に追加
      this.history.push({ role: 'assistant', content: response });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\nエラーが発生しました: ${errorMessage}\n`);
      this.logger.error(`対話処理エラー: ${errorMessage}`);
    } finally {
      this.isProcessing = false;
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