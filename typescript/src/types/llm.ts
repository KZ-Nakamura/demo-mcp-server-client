/**
 * LLMプロバイダー関連の型定義
 */

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