/**
 * LLMプロバイダー関連の型定義
 */

/**
 * LLMの応答フォーマット
 */
export type LLMResponseFormat = 'text' | 'json';

/**
 * LLMメッセージの役割
 */
export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'function';

/**
 * LLMメッセージ
 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
  name?: string; // 関数呼び出し時のみ使用
}

/**
 * メッセージの役割
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * メッセージの基本構造
 */
export interface Message {
  role: MessageRole;
  content: string;
}

/**
 * システムメッセージ
 */
export interface SystemMessage extends Message {
  role: 'system';
}

/**
 * ユーザーメッセージ
 */
export interface UserMessage extends Message {
  role: 'user';
}

/**
 * アシスタントメッセージ
 */
export interface AssistantMessage extends Message {
  role: 'assistant';
}

/**
 * ツールメッセージ
 */
export interface ToolMessage extends Message {
  role: 'tool';
  toolName: string;
  toolCallId?: string;
}

/**
 * ツール呼び出し情報
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * ツール呼び出しの結果
 */
export interface ToolResult {
  toolCallId: string;
  result?: any;
  error?: string;
}

/**
 * ツール呼び出しを含むアシスタントメッセージ
 */
export interface AssistantToolCallMessage extends Omit<AssistantMessage, 'content'> {
  content: string | null;
  toolCalls: ToolCall[];
}

/**
 * LLMリクエストのオプション
 */
export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: any[];
  toolChoice?: 'auto' | 'required' | { type: 'function', function: { name: string } };
  [key: string]: any;
}

/**
 * LLMレスポンス
 */
export interface LLMResponse {
  message: AssistantMessage | AssistantToolCallMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLMストリームチャンクレスポンス
 */
export interface LLMStreamChunk {
  message: Partial<AssistantMessage | AssistantToolCallMessage>;
  isComplete: boolean;
}

/**
 * LLMチャットリクエスト
 */
export interface LLMChatRequest {
  messages: Message[];
  tools?: any[];
  toolResults?: ToolResult[];
  options?: LLMRequestOptions;
}

/**
 * LLMチャットレスポンス
 */
export interface LLMChatResponse {
  message: string;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * LLM呼び出しオプション
 */
export interface LLMOptions {
  /**
   * 温度パラメータ (0.0-1.0)
   * 高いほど多様な応答、低いほど確定的な応答
   * @default 0.7
   */
  temperature?: number;
  
  /**
   * 応答フォーマット
   * @default 'text'
   */
  responseFormat?: LLMResponseFormat;
  
  /**
   * 最大トークン数
   * @default プロバイダーに依存
   */
  maxTokens?: number;
} 