#!/usr/bin/env node

import { parseArguments, showHelp, exitWithError } from './utils/cli.js';
import { StdioConnection } from './mcp/stdio-connection.js';
import { MCPClient } from './mcp/client.js';
import { LLMProviderFactory } from './llm-provider/factory.js';
import { MCPHost } from './mcp/host.js';
import { MultiToolsServer } from './servers/multi-tools-server.js';
import { BaseTool } from './tools/base-tool.js';
import { DiceTool } from './tools/dice.js';
import { CurrentTimeTool } from './tools/current-time.js';
import { config } from './config.js';
import { defaultLogger } from './utils/logger.js';

// プログラム名
const PROGRAM_NAME = 'mcp-client';

// プログラムの説明
const DESCRIPTION = 'MCP (Machine-Readable Communication Protocol) Client';

// コマンドラインオプション
const OPTIONS = [
  { name: '--help, -h', description: 'ヘルプを表示する' },
  { name: '--debug, -d', description: 'デバッグモードを有効にする' },
  { name: '--server, -s', description: 'サーバーモードで実行する' },
  { name: '--llm-provider', description: 'LLMプロバイダーを指定する', default: config.preferredLlmProvider },
  { name: '--log-level', description: 'ログレベルを指定する', default: config.logLevel }
];

// 使用例
const EXAMPLES = [
  `${PROGRAM_NAME} --help`,
  `${PROGRAM_NAME} --debug`,
  `${PROGRAM_NAME} --server`,
  `${PROGRAM_NAME} --llm-provider openai`
];

/**
 * メイン関数
 */
async function main(): Promise<void> {
  // 引数のパース
  const args = parseArguments(process.argv.slice(2), {
    shorthand: {
      h: 'help',
      d: 'debug',
      s: 'server'
    },
    defaults: {
      'llm-provider': config.preferredLlmProvider,
      'log-level': config.logLevel
    },
    collectPositional: true
  });
  
  // ヘルプ表示
  if (args.help) {
    showHelp(PROGRAM_NAME, DESCRIPTION, OPTIONS, EXAMPLES);
    process.exit(0);
  }
  
  // ログレベルの設定
  defaultLogger.setLevel(args['log-level'] || 'info');
  
  // デバッグモード
  if (args.debug) {
    defaultLogger.setLevel('debug');
    defaultLogger.debug('デバッグモードが有効になりました');
  }
  
  try {
    // サーバーモード
    if (args.server) {
      await runServer();
    } else {
      // クライアントモード（デフォルト）
      await runClient(args);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    defaultLogger.error(`実行エラー: ${errorMessage}`);
    exitWithError(errorMessage);
  }
}

/**
 * サーバーモードでの実行
 */
async function runServer(): Promise<void> {
  defaultLogger.info('サーバーモードで起動します');
  
  // ツールの登録
  const tools: BaseTool[] = [
    new DiceTool(),
    new CurrentTimeTool()
  ];
  
  // マルチツールサーバーの作成
  const server = new MultiToolsServer(tools);
  
  // 標準入出力接続
  const connection = new StdioConnection();
  
  // サーバーの開始
  defaultLogger.info('利用可能なツール:', { tools: tools.map(t => t.name) });
  defaultLogger.info('サーバーを起動しました。Ctrl+Cで終了します。');
  
  // シグナルハンドラの登録
  process.on('SIGINT', () => {
    defaultLogger.info('サーバーを終了します...');
    process.exit(0);
  });
  
  // サーバーを実行
  await server.run(connection);
}

/**
 * クライアントモードでの実行
 */
async function runClient(args: Record<string, any>): Promise<void> {
  defaultLogger.info('クライアントモードで起動します');
  
  // LLMプロバイダーの生成
  const llmProviderType = args['llm-provider'];
  defaultLogger.info(`LLMプロバイダー "${llmProviderType}" を使用します`);
  
  const llmProvider = LLMProviderFactory.create(llmProviderType);
  
  // 標準入出力接続
  const connection = new StdioConnection();
  
  // クライアントの作成
  const client = new MCPClient(connection);
  
  // ホストの作成
  const host = new MCPHost(client, llmProvider);
  
  // クライアントを初期化
  await client.initialize();
  
  defaultLogger.info('クライアントを初期化しました');
  
  // 利用可能なツールの取得
  const { tools } = await client.listTools();
  defaultLogger.info('利用可能なツール:', { tools });
  
  // 対話モード
  console.log('\nMCPクライアントを起動しました。メッセージを入力してください（終了するには「exit」と入力）:');
  
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (data: Buffer) => {
    const input = data.toString().trim();
    
    if (input.toLowerCase() === 'exit') {
      console.log('クライアントを終了します...');
      process.exit(0);
    }
    
    try {
      console.log('\n処理中...');
      const response = await host.chat(input);
      console.log(`\n${response}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`エラー: ${errorMessage}\n`);
    }
    
    // プロンプト表示
    process.stdout.write('> ');
  });
  
  // 初期プロンプト
  process.stdout.write('> ');
}

// メイン関数の実行
main().catch(error => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`致命的なエラー: ${errorMessage}`);
  process.exit(1);
}); 