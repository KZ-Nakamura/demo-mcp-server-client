import * as dotenv from 'dotenv';
import { LLMProviderType } from './llm-provider/factory.js';

// 環境変数を読み込む
dotenv.config();

/**
 * アプリケーション設定
 */
interface Config {
  /**
   * 優先的に使用するLLMプロバイダー
   */
  preferredLlmProvider: LLMProviderType;
  
  /**
   * OpenAI API Key
   */
  openaiApiKey?: string;
  
  /**
   * Anthropic API Key
   */
  anthropicApiKey?: string;
  
  /**
   * ログレベル
   */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  /**
   * ログファイルのパス
   */
  logFilePath?: string;
}

/**
 * 環境変数から設定を読み込む
 * @returns アプリケーション設定
 */
export function loadConfig(): Config {
  return {
    preferredLlmProvider: (process.env.PREFERRED_LLM_PROVIDER as LLMProviderType) || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    logFilePath: process.env.LOG_FILE_PATH
  };
}

// グローバル設定のシングルトンインスタンス
export const config = loadConfig(); 