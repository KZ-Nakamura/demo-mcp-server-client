import { LLMProvider } from '../interfaces/llm-provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

/**
 * サポートするLLMプロバイダーの種類
 */
export type LLMProviderType = 'openai' | 'anthropic';

/**
 * LLMプロバイダーファクトリー
 * プロバイダータイプに基づいて適切なLLMプロバイダーのインスタンスを作成する
 */
export class LLMProviderFactory {
  /**
   * 指定されたタイプのLLMプロバイダーを作成する
   * @param type プロバイダータイプ
   * @returns LLMプロバイダーのインスタンス
   * @throws サポートしていないプロバイダータイプの場合はエラー
   */
  static create(type: LLMProviderType): LLMProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      default:
        throw new Error(`Unsupported LLM provider type: ${type}`);
    }
  }

  /**
   * 環境変数に基づいてデフォルトのLLMプロバイダーを作成する
   * PREFERRED_LLM_PROVIDER環境変数を確認し、設定されていない場合はOpenAIをデフォルトとする
   * @returns LLMプロバイダーのインスタンス
   */
  static createDefault(): LLMProvider {
    const preferredProvider = process.env.PREFERRED_LLM_PROVIDER as LLMProviderType | undefined;
    
    if (preferredProvider) {
      try {
        return this.create(preferredProvider);
      } catch (error) {
        console.warn(`Failed to create preferred LLM provider: ${error instanceof Error ? error.message : String(error)}`);
        console.warn('Falling back to OpenAI provider');
      }
    }
    
    // デフォルトはOpenAI
    try {
      return new OpenAIProvider();
    } catch (error) {
      // OpenAIが使えない場合はAnthropicを試す
      try {
        return new AnthropicProvider();
      } catch (innerError) {
        throw new Error('Failed to create any LLM provider. Check your API keys.');
      }
    }
  }
} 