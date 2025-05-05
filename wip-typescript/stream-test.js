#!/usr/bin/env node

/**
 * JSON-RPCサーバーとの通信をテストするスクリプト
 * 子プロセスでサーバーを起動し、JSON-RPCリクエストを送信します
 * 
 * 使い方: node stream-test.js
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ESMでの__dirnameの取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 色付きログ出力のためのユーティリティ
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(label, message, color = colors.reset) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`${color}[${timestamp}] [${label}]${colors.reset} ${message}`);
}

// プロセス終了時の処理
let serverProcess;
process.on('exit', () => {
  if (serverProcess) {
    log('CLEANUP', '子プロセスを終了します', colors.yellow);
    serverProcess.kill();
  }
});

process.on('SIGINT', () => {
  log('INTERRUPT', 'Ctrl+Cが押されました。終了します', colors.red);
  process.exit(0);
});

// サーバープロセスを起動
log('SETUP', 'サーバープロセスを起動します...', colors.blue);
serverProcess = spawn('node', ['dist/main.js', '--server'], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
});

// サーバーの標準出力を処理
serverProcess.stdout.on('data', (data) => {
  const lines = data.toString().split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      try {
        // JSON形式かチェック
        if (line.trim().startsWith('{')) {
          const json = JSON.parse(line);
          log('SERVER-JSON', JSON.stringify(json, null, 2), colors.green);
        } else {
          log('SERVER-OUT', line, colors.cyan);
        }
      } catch {
        log('SERVER-OUT', line, colors.cyan);
      }
    }
  });
});

// サーバーのエラー出力を処理
serverProcess.stderr.on('data', (data) => {
  log('SERVER-ERR', data.toString(), colors.red);
});

// サーバープロセスが終了した場合
serverProcess.on('close', (code) => {
  log('SERVER-END', `サーバープロセスが終了しました (コード: ${code})`, colors.yellow);
  process.exit(code);
});

// JSON-RPCリクエスト送信関数
function sendRequest(method, params, id) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };
  
  const requestStr = JSON.stringify(request);
  log('CLIENT-REQ', `リクエスト #${id} 送信: ${requestStr}`, colors.magenta);
  serverProcess.stdin.write(requestStr + '\n');
  
  return new Promise(resolve => {
    setTimeout(resolve, 500); // 応答を待つための小さな遅延
  });
}

// テストシナリオを実行
async function runTests() {
  try {
    // サーバー起動を少し待つ
    log('TEST', 'サーバー起動を待機しています...', colors.yellow);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 初期化リクエスト
    log('TEST', '初期化リクエストを送信します', colors.yellow);
    await sendRequest('initialize', {
      protocolVersion: '2025-03-26',
      client: {
        name: 'Stream Test Client',
        version: '1.0.0'
      }
    }, 1);
    
    // 初期化通知
    log('TEST', '初期化通知を送信します', colors.yellow);
    serverProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ツール一覧取得
    log('TEST', 'ツール一覧取得リクエストを送信します', colors.yellow);
    await sendRequest('tools/list', {}, 2);
    
    // サイコロツール呼び出し
    log('TEST', 'サイコロツール呼び出しリクエストを送信します', colors.yellow);
    await sendRequest('tools/call', { name: 'dice', args: { sides: 20 } }, 3);
    
    // 現在時刻ツール呼び出し
    log('TEST', '現在時刻ツール呼び出しリクエストを送信します', colors.yellow);
    await sendRequest('tools/call', { name: 'current_time', args: { format: 'readable' } }, 4);
    
    // ping
    log('TEST', 'pingリクエストを送信します', colors.yellow);
    await sendRequest('ping', {}, 5);
    
    // テスト完了
    log('TEST', 'テスト完了、5秒後に終了します', colors.green);
    setTimeout(() => {
      // サーバー停止リクエスト
      log('TEST', 'サーバー停止リクエストを送信します', colors.yellow);
      sendRequest('shutdown', {}, 6);
      
      setTimeout(() => {
        log('TEST', 'テストを終了します', colors.green);
        process.exit(0);
      }, 1000);
    }, 5000);
    
  } catch (error) {
    log('ERROR', `テスト実行中にエラーが発生しました: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// テスト実行
runTests(); 