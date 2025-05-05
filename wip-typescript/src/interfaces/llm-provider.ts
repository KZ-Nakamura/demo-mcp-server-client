import { LLMMessage, LLMOptions } from '../types/llm.js';

/**
 * LLMプロバイダーインターフェース
 */
export interface LLMProvider {
  /**
   * プロバイダー名
   */
  readonly name: string;

  /**
   * メッセージを送信してLLMから応答を得る
   * @param messages 送信するメッセージの配列
   * @param options LLM呼び出しオプション
   * @returns LLMからの応答テキスト
   */
  sendMessage(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
}

/**
 * LLMプロバイダーの初期化オプション
 */
export interface LLMProviderOptions {
  /**
   * APIキー
   */
  apiKey?: string;

  /**
   * API基本URL（カスタムエンドポイントを使用する場合）
   */
  baseUrl?: string;

  /**
   * 組織ID（OpenAI等で使用）
   */
  organizationId?: string;

  /**
   * APIタイムアウト（ミリ秒）
   */
  timeout?: number;

  /**
   * デフォルトのモデル名
   */
  defaultModel?: string;

  /**
   * その他の追加オプション
   */
  [key: string]: any;
} 