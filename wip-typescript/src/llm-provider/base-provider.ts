import { LLMProvider } from '../interfaces/llm-provider.js';
import { LLMMessage, LLMOptions } from '../types/llm.js';

/**
 * LLMプロバイダーの基底クラス
 * すべてのLLMプロバイダーはこのクラスを継承して実装する
 */
export abstract class BaseLLMProvider implements LLMProvider {
  /**
   * プロバイダー名
   */
  abstract readonly name: string;

  /**
   * メッセージを送信してLLMから応答を得る
   * サブクラスでオーバーライドする
   * @param messages 送信するメッセージの配列
   * @param options LLM呼び出しオプション
   * @returns LLMからの応答テキスト
   */
  abstract sendMessage(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
} 