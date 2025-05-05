import { MultiToolsServer } from './multi-tools-server.js';

/**
 * メインエントリーポイント
 * サーバーを起動する
 */
async function main(): Promise<void> {
  const server = new MultiToolsServer();
  
  // プロセス終了時にサーバーを停止
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await server.stopServer();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    await server.stopServer();
    process.exit(0);
  });
  
  // サーバーを開始
  try {
    console.log('Starting MCP server with multiple tools...');
    await server.startServer();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にのみメイン関数を実行
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { MultiToolsServer }; 