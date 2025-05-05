import { LLMRequestOptions, LLMResponse, LLMStreamChunk, Message } from '../types/llm.js';

/**
 * LLMプロバイダーインターフェース
 */
export interface LLMProvider {
  /**
   * プロバイダー名を取得
   */
  readonly name: string;

  /**
   * LLMにメッセージを送信し、応答を取得する
   * @param messages これまでの会話の履歴
   * @param options リクエストオプション
   * @returns LLMからの応答
   */
  sendMessage(messages: Message[], options?: LLMRequestOptions): Promise<LLMResponse>;

  /**
   * LLMにメッセージを送信し、ストリーミングで応答を取得する
   * @param messages これまでの会話の履歴
   * @param options リクエストオプション（streamはtrueになる）
   * @param onChunk ストリーミングチャンクを受信するたびに呼び出されるコールバック
   */
  sendMessageStream(
    messages: Message[],
    options: LLMRequestOptions,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<void>;
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