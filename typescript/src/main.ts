#!/usr/bin/env node

import { config } from './config.js';
import { defaultLogger } from './utils/logger.js';
import { MCPServer } from './mcp/server.js';
import { BaseTool } from './tools/base-tool.js';
import { DiceTool } from './tools/dice.js';
import { CurrentTimeTool } from './tools/current-time.js';
import { StdioConnection } from './mcp/stdio-connection.js';
import { MCPHost } from './mcp/host.js';
import { LogLevel } from './interfaces/logger.js';
import { LLMProviderFactory } from './llm-provider/factory.js';
import { parseArgs } from 'node:util';
import { NaturalLanguageCLI } from './cli/natural-language-cli.js';

// プログラム名
const PROGRAM_NAME = 'mcp';

// プログラムの説明
const PROGRAM_DESCRIPTION = 'Model Context Protocol の実装';

// ヘルプテキスト
const HELP_TEXT = `
使い方: ${PROGRAM_NAME} [オプション]

オプション:
  --server               サーバーモードで起動します
  --client               クライアントモードで起動します (デフォルト)
  --chat                 自然言語対話モードで起動します
  --llm-provider <name>  LLMプロバイダーを指定します (デフォルト: ${config.preferredLlmProvider})
  --debug                デバッグモードで起動します
  --help                 このヘルプを表示します

例:
  サーバーモードで起動:
    ${PROGRAM_NAME} --server
  
  クライアントモードで起動:
    ${PROGRAM_NAME} --client
  
  自然言語対話モードで起動:
    ${PROGRAM_NAME} --chat
  
  特定のLLMプロバイダーを使用:
    ${PROGRAM_NAME} --client --llm-provider=openai
`;

// コマンドライン引数のパース
function parseArguments(): Record<string, any> {
  const options = {
    server: { type: 'boolean' as const },
    client: { type: 'boolean' as const },
    'llm-provider': { type: 'string' as const, default: config.preferredLlmProvider },
    debug: { type: 'boolean' as const },
    help: { type: 'boolean' as const },
    chat: { type: 'boolean' as const, default: false }
  };

  try {
    const { values } = parseArgs({ options });
    return values;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`引数解析エラー: ${errorMessage}`);
    console.error(HELP_TEXT);
    process.exit(1);
  }
}

/**
 * メイン関数
 */
async function main(): Promise<void> {
  // 引数の解析
  const args = parseArguments();
  
  // ヘルプの表示
  if (args.help) {
    console.log(HELP_TEXT);
    process.exit(0);
  }
  
  // デバッグモードの設定
  if (args.debug) {
    defaultLogger.setLevel('debug');
    defaultLogger.debug('デバッグモードで起動します');
  }
  
  // モードの決定
  const serverMode = args.server ?? false;
  const clientMode = args.client ?? (!serverMode && !args.chat);
  const chatMode = args.chat ?? false;
  
  // 各モードの実行
  if (serverMode) {
    await runServer();
  } else if (chatMode) {
    await runChat(args);
  } else if (clientMode) {
    await runClient(args);
  } else {
    console.error('サーバーモード、クライアントモード、または自然言語対話モードのいずれかを指定してください');
    console.error(HELP_TEXT);
    process.exit(1);
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
  
  // 標準入出力接続
  const connection = new StdioConnection();
  
  // サーバーを作成
  const server = new MCPServer(connection);
  
  // ツールを登録
  for (const tool of tools) {
    server.registerTool(tool);
  }
  
  // サーバーの開始
  const toolNames = tools.map(t => t.name).join(', ');
  defaultLogger.info(`利用可能なツール: ${toolNames}`);
  defaultLogger.info('サーバーを起動しました。Ctrl+Cで終了します。');
  
  // シグナルハンドラの登録
  process.on('SIGINT', () => {
    defaultLogger.info('サーバーを終了します...');
    process.exit(0);
  });
  
  // サーバーを実行
  await server.start();
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
  
  // 単一の標準入出力接続を作成（ホストとクライアントで共有）
  const connection = new StdioConnection();
  
  // 対話状態を管理
  let waitingForUserInput = false;
  let userInputResolve: ((value: string) => void) | null = null;
  
  // カスタムの標準入力ハンドラ
  const originalStdinListener = process.stdin.listeners('data')[0];
  if (originalStdinListener) {
    process.stdin.removeListener('data', originalStdinListener as (...args: any[]) => void);
  }
  
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk: Buffer) => {
    const input = chunk.toString().trim();
    
    if (waitingForUserInput && userInputResolve) {
      // ユーザーの入力を待っていた場合
      waitingForUserInput = false;
      userInputResolve(input);
      userInputResolve = null;
    } else {
      // それ以外の場合はデフォルト処理
      if (input.toLowerCase() === 'exit') {
        console.log('クライアントを終了します...');
        process.exit(0);
      }
    }
  });
  
  // ホストの作成
  const host = new MCPHost(connection, llmProvider);
  
  // ホストを初期化
  await host.initialize();
  
  // 対話モード
  console.log('\nMCPクライアントを起動しました。メッセージを入力してください（終了するには「exit」と入力）:');
  
  // メインループ
  while (true) {
    process.stdout.write('> ');
    
    // ユーザー入力を待機
    const userInput = await new Promise<string>((resolve) => {
      waitingForUserInput = true;
      userInputResolve = resolve;
    });
    
    if (userInput.toLowerCase() === 'exit') {
      console.log('クライアントを終了します...');
      break;
    }
    
    try {
      console.log('\n処理中...');
      const response = await host.chat(userInput);
      console.log(`\n${response}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`エラー: ${errorMessage}\n`);
    }
  }
  
  process.exit(0);
}

/**
 * 自然言語対話モードでの実行
 */
async function runChat(args: Record<string, any>): Promise<void> {
  defaultLogger.info('自然言語対話モードを起動します');
  
  // LLMプロバイダーの生成
  const llmProviderType = args['llm-provider'];
  defaultLogger.info(`LLMプロバイダー "${llmProviderType}" を使用します`);
  
  const llmProvider = LLMProviderFactory.create(llmProviderType);
  
  // ツールの準備
  const tools: BaseTool[] = [
    new DiceTool(),
    new CurrentTimeTool()
  ];
  
  // 自然言語CLIの作成（シンプルモード）
  const cli = new NaturalLanguageCLI(llmProvider, defaultLogger);
  
  // シグナルハンドラの登録
  process.on('SIGINT', async () => {
    defaultLogger.info('自然言語対話モードを終了します...');
    await cli.stop();
    process.exit(0);
  });
  
  // 注意メッセージ
  defaultLogger.info('注: --chat モードの現在のバージョンではツール連携は利用できません');
  console.log('\n注意: 現在のバージョンではツール連携機能は利用できません。');
  console.log('開発中のフェーズ6.75で実装される予定です。');
  console.log('シンプルな自然言語対話モードで実行します。\n');
  
  // CLIを実行
  await cli.start();
}

// プログラムの実行
main().catch(error => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`エラー: ${errorMessage}`);
  process.exit(1);
}); 