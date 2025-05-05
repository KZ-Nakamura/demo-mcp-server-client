#!/usr/bin/env node

/**
 * JSON-RPCリクエストを送信するテストスクリプト
 * サーバーを起動した状態で実行してください
 * 
 * 使い方: node test-jsonrpc.js
 */

// 標準入出力を使用してサーバーと通信します
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

// JSONリクエストの送信関数
function sendJsonRpc(method, params, id) {
  const request = {
    jsonrpc: '2.0',
    method,
    params,
    id
  };
  
  console.log('送信リクエスト:', JSON.stringify(request, null, 2));
  process.stdout.write(JSON.stringify(request) + '\n');
}

// レスポンスの受信処理
let dataBuffer = '';
process.stdin.on('data', (chunk) => {
  dataBuffer += chunk;
  
  // 完全なJSON文字列を探す
  const lines = dataBuffer.split('\n');
  if (lines.length > 1) {
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response = JSON.parse(line);
          console.log('受信レスポンス:', JSON.stringify(response, null, 2));
          
          // 初期化後にツールの一覧を取得
          if (response.result && response.result.serverInfo) {
            console.log('サーバー初期化完了、ツール一覧を取得します...');
            sendJsonRpc('tools/list', {}, 2);
          }
          
          // ツール一覧を取得した後、サイコロツールを実行
          if (response.id === 2 && response.result && response.result.tools) {
            const tools = response.result.tools;
            console.log(`利用可能なツール: ${tools.map(t => t.name).join(', ')}`);
            
            const diceTool = tools.find(t => t.name === 'dice');
            if (diceTool) {
              console.log('サイコロツールを実行します...');
              sendJsonRpc('tools/call', { name: 'dice', args: { sides: 12 } }, 3);
            }
          }
          
          // 最後のツール実行後、終了
          if (response.id === 3) {
            console.log('テスト完了、終了します');
            process.exit(0);
          }
        } catch (error) {
          console.error('JSONパースエラー:', error.message);
          console.error('受信データ:', line);
        }
      }
    }
    
    // 最後の行（不完全かもしれない）だけ残す
    dataBuffer = lines[lines.length - 1];
  }
});

// エラーハンドリング
process.stdin.on('error', (error) => {
  console.error('入力エラー:', error);
  process.exit(1);
});

process.stdout.on('error', (error) => {
  console.error('出力エラー:', error);
  process.exit(1);
});

// 初期化リクエストの送信
console.log('サーバーに初期化リクエストを送信します...');
sendJsonRpc('initialize', {
  protocolVersion: '2025-03-26',
  client: {
    name: 'JSON-RPC Test Client',
    version: '1.0.0'
  }
}, 1);

// 初期化通知の送信
setTimeout(() => {
  console.log('初期化通知を送信します...');
  const notification = {
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  };
  process.stdout.write(JSON.stringify(notification) + '\n');
}, 500);

// タイムアウト設定（30秒後に終了）
setTimeout(() => {
  console.error('タイムアウトにより終了します');
  process.exit(1);
}, 30000); 