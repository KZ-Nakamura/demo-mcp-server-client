/**
 * MCPプロトコルの基本的な型定義
 */

/**
 * JSONRPCのリクエスト・レスポンスの共通部分
 */
export interface JSONRPCBase {
  jsonrpc: '2.0';
  id: string | number | null;
}

/**
 * JSONRPCリクエスト
 */
export interface JSONRPCRequest extends JSONRPCBase {
  method: string;
  params?: any;
}

/**
 * JSONRPCレスポンス（成功）
 */
export interface JSONRPCSuccessResponse extends JSONRPCBase {
  result: any;
  error?: never;
}

/**
 * JSONRPCエラーオブジェクト
 */
export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

/**
 * JSONRPCレスポンス（エラー）
 */
export interface JSONRPCErrorResponse extends JSONRPCBase {
  result?: never;
  error: JSONRPCError;
}

/**
 * JSONRPCレスポンス（成功またはエラー）
 */
export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;

/**
 * MCPの初期化パラメータ
 */
export interface MCPInitializeParams {
  protocolVersion: string;
  client: {
    name: string;
    version: string;
  };
}

/**
 * MCPの初期化結果
 */
export interface MCPInitializeResult {
  protocolVersion: string;
  server: {
    name: string;
    version: string;
  };
}

/**
 * MCPのツール情報
 */
export interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

/**
 * MCPのツール一覧取得結果
 */
export interface MCPListToolsResult {
  tools: MCPToolInfo[];
}

/**
 * MCPのツール呼び出しパラメータ
 */
export interface MCPCallToolParams {
  name: string;
  input: Record<string, any>;
}

/**
 * MCPのツール呼び出し結果
 */
export interface MCPCallToolResult {
  output: any;
  content: any;
}

/**
 * MCP標準エラーコード
 */
export enum MCPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ToolNotFound = -32000,
  ToolExecutionError = -32001,
  InvalidToolInput = -32002,
}

/**
 * MCP統合プロトコル用の型定義
 */

/**
 * MCPメッセージのベース
 */
export interface MCPMessageBase {
  id: string;
}

/**
 * MCPリクエスト共通部分
 */
export interface MCPRequestBase extends MCPMessageBase {
  action: string;
}

/**
 * ツール一覧取得リクエスト
 */
export interface MCPListToolsRequest extends MCPRequestBase {
  action: 'list_tools';
}

/**
 * ツール呼び出しリクエスト
 */
export interface MCPCallToolRequest extends MCPRequestBase {
  action: 'call_tool';
  tool_name: string;
  inputs: Record<string, any>;
}

/**
 * MCPリクエスト型
 */
export type MCPRequest = MCPListToolsRequest | MCPCallToolRequest;

/**
 * MCPレスポンス共通部分
 */
export interface MCPResponseBase extends MCPMessageBase {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * ツール一覧取得レスポンス
 */
export interface MCPListToolsResponse extends MCPResponseBase {
  tools: ToolInfo[];
}

/**
 * ツール呼び出しレスポンス
 */
export interface MCPCallToolResponse extends MCPResponseBase {
  output: any;
}

/**
 * MCPレスポンス型
 */
export type MCPResponse = MCPListToolsResponse | MCPCallToolResponse;

/**
 * MCPメッセージ型（リクエストまたはレスポンス）
 */
export type MCPMessage = MCPRequest | MCPResponse;

/**
 * ツール情報の型
 */
export interface ToolInfo {
  name: string;
  description: string;
  input_schema: Record<string, any>;
} 