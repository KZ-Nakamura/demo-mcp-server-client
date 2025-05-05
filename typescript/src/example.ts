/**
 * MCP Server/Client/Host の使用例
 */

import { StdioConnection } from './mcp/stdio-connection.js';
import { MCPServer } from './mcp/server.js';
import { MCPClient } from './mcp/client.js';
import { Tool } from './types/tools.js';
import { defaultLogger } from './utils/logger.js';

/**
 * サーバー側のコード例
 */
async function runServer() {
  // 標準入出力を使用した接続を作成
  const connection = new StdioConnection(process.stdin, process.stdout);
  
  // サーバーを作成
  const server = new MCPServer(connection, defaultLogger);
  
  // サイコロツールを登録
  const diceTool: Tool = {
    name: 'roll_dice',
    description: '指定された面数のサイコロを振る',
    inputSchema: {
      type: 'object',
      properties: {
        sides: {
          type: 'number',
          description: 'サイコロの面数',
          default: 6
        }
      },
      required: []
    },
    handler: async (input) => {
      const sides = input.sides || 6;
      return {
        result: Math.floor(Math.random() * sides) + 1,
        sides
      };
    }
  };
  
  // 現在時刻ツールを登録
  const timeTool: Tool = {
    name: 'current_time',
    description: '現在の時刻を取得する',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: '時刻のフォーマット（iso, readable, unix）',
          default: 'iso'
        }
      },
      required: []
    },
    handler: async (input) => {
      const format = input.format || 'iso';
      const now = new Date();
      
      switch (format) {
        case 'iso':
          return { time: now.toISOString() };
        case 'readable':
          return { time: now.toString() };
        case 'unix':
          return { time: Math.floor(now.getTime() / 1000) };
        default:
          return { time: now.toISOString() };
      }
    }
  };
  
  // ツールを登録
  server.registerTool(diceTool);
  server.registerTool(timeTool);
  
  console.log('MCP Server starting...');
  
  // サーバーを開始
  await server.start();
}

/**
 * クライアント側のコード例
 */
async function runClient() {
  // 標準入出力を使用した接続を作成
  const connection = new StdioConnection(process.stdin, process.stdout);
  
  // クライアントを作成
  const client = new MCPClient(connection, defaultLogger);
  
  // クライアントを初期化
  await client.initialize();
  
  // 利用可能なツールを取得
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // サイコロツールを呼び出す
  const diceResult = await client.callTool('roll_dice', { sides: 20 });
  console.log('Dice roll result:', diceResult);
  
  // 現在時刻ツールを呼び出す
  const timeResult = await client.callTool('current_time', { format: 'readable' });
  console.log('Current time:', timeResult);
  
  // クライアントを終了
  await client.close();
}

// コマンドライン引数に基づいて実行するモードを決定
if (process.argv[2] === 'server') {
  runServer().catch(err => {
    console.error('Server error:', err);
    process.exit(1);
  });
} else if (process.argv[2] === 'client') {
  runClient().catch(err => {
    console.error('Client error:', err);
    process.exit(1);
  });
} else {
  console.log('Usage: node dist/example.js [server|client]');
} 