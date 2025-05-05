#!/usr/bin/env node

/**
 * 対話型JSON-RPCクライアント
 * サーバーと対話的に通信するためのCLIツールです。
 * サーバーを起動した状態で実行してください。
 * 
 * 使い方: node cli-jsonrpc.js
 */

import readline from 'readline';

// 標準入出力を使用してサーバーと通信します
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

// 標準出力バッファ（Node.jsのバグ回避用）
let outputBuffer = [];
const originalStdoutWrite = process.stdout.write;
process.stdout.write = function (chunk, encoding, callback) {
  return originalStdoutWrite.apply(this, arguments);
};

// ユーザー入力用のreadlineインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// JSONリクエストの送信関数
let requestCounter = 0;
function sendJsonRpc(method, params) {
  const id = ++requestCounter;
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };
  
  console.log(`\n[CLIENT] 送信 #${id}:`, JSON.stringify(request, null, 2));
  originalStdoutWrite.call(process.stdout, JSON.stringify(request) + '\n');
  return id;
}

// 初期化済みフラグ
let initialized = false;

// レスポンス処理用のcallback保存
const responseCallbacks = new Map();

// サーバーからのレスポンス処理
process.stdin.on('data', (chunk) => {
  const rawData = chunk.toString();
  const lines = rawData.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    try {
      const response = JSON.parse(line);
      console.log(`\n[SERVER] 応答:`, JSON.stringify(response, null, 2));
      
      // プロンプトを再表示
      rl.prompt();
      
      // IDに対応するコールバックがあれば実行
      if (response.id && responseCallbacks.has(response.id)) {
        const callback = responseCallbacks.get(response.id);
        responseCallbacks.delete(response.id);
        callback(response);
      }
    } catch (error) {
      console.error('\n[ERROR] JSONパースエラー:', error.message);
      console.error('受信データ:', line);
      rl.prompt();
    }
  });
});

// 使い方の表示
function showHelp() {
  console.log(`
使用可能なコマンド:
  init                  - サーバーの初期化
  tools                 - ツール一覧の取得
  call <name> [args]    - ツールの呼び出し (例: call dice {"sides": 6})
  ping                  - サーバーの疎通確認
  shutdown              - サーバーの停止
  exit, quit            - クライアントの終了
  help                  - このヘルプの表示
`);
  rl.prompt();
}

// サーバーの初期化
function initializeServer() {
  const id = sendJsonRpc('initialize', {
    protocolVersion: '2025-03-26',
    client: {
      name: 'Interactive JSON-RPC Client',
      version: '1.0.0'
    }
  });
  
  responseCallbacks.set(id, (response) => {
    if (response.result) {
      console.log('\n[INFO] サーバー初期化成功');
      console.log('[INFO] 初期化通知を送信します...');
      
      // 初期化通知の送信
      const notification = {
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      };
      originalStdoutWrite.call(process.stdout, JSON.stringify(notification) + '\n');
      initialized = true;
    } else {
      console.error('\n[ERROR] サーバー初期化失敗');
    }
  });
}

// ツール一覧の取得
function listTools() {
  if (!initialized) {
    console.error('\n[ERROR] サーバーが初期化されていません。まず "init" を実行してください。');
    rl.prompt();
    return;
  }
  
  sendJsonRpc('tools/list', {});
}

// ツールの呼び出し
function callTool(name, argsStr) {
  if (!initialized) {
    console.error('\n[ERROR] サーバーが初期化されていません。まず "init" を実行してください。');
    rl.prompt();
    return;
  }
  
  let args = {};
  if (argsStr) {
    try {
      args = JSON.parse(argsStr);
    } catch (error) {
      console.error('\n[ERROR] 引数のJSONパースエラー:', error.message);
      rl.prompt();
      return;
    }
  }
  
  sendJsonRpc('tools/call', { name, args });
}

// コマンド処理
rl.on('line', (line) => {
  const trimmedLine = line.trim();
  if (!trimmedLine) {
    rl.prompt();
    return;
  }
  
  // コマンドの解析
  const parts = trimmedLine.split(' ');
  const command = parts[0].toLowerCase();
  
  switch (command) {
    case 'exit':
    case 'quit':
      console.log('\n[INFO] クライアントを終了します');
      process.exit(0);
      break;
      
    case 'help':
      showHelp();
      break;
      
    case 'init':
      initializeServer();
      break;
      
    case 'tools':
      listTools();
      break;
      
    case 'call':
      if (parts.length < 2) {
        console.error('\n[ERROR] ツール名を指定してください (例: call dice {"sides": 6})');
      } else {
        const toolName = parts[1];
        const argsStr = parts.slice(2).join(' ');
        callTool(toolName, argsStr);
      }
      break;
      
    case 'ping':
      sendJsonRpc('ping', {});
      break;
      
    case 'shutdown':
      sendJsonRpc('shutdown', {});
      break;
      
    default:
      console.error('\n[ERROR] 不明なコマンド:', command);
      console.log('利用可能なコマンドを確認するには "help" を入力してください');
      break;
  }
  
  rl.prompt();
});

// 開始時の挨拶
console.log(`
===== 対話型JSON-RPCクライアント =====
サーバーを起動した状態で以下のコマンドを入力してください。
まず "init" でサーバー初期化、次に "tools" でツール一覧取得、
その後 "call dice {"sides": 12}" のようにツールを呼び出せます。
`);
showHelp();

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('\n[ERROR] 未処理のエラー:', error);
  rl.prompt();
});

// Ctrl+Cで終了
rl.on('SIGINT', () => {
  console.log('\n\n[INFO] クライアントを終了します');
  process.exit(0);
}); 