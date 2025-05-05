import path from 'path';
import fs from 'fs';

/**
 * サーバーの種類
 */
export type ServerType = 'multi-tools' | 'dice' | 'current-time';

/**
 * サーバーファイルパスを取得
 * @param serverType サーバーの種類
 * @returns サーバーファイルの絶対パス
 */
export function getServerFilePath(serverType: ServerType = 'multi-tools'): string {
  // プロジェクトのルートディレクトリを取得
  const rootDir = path.resolve(__dirname, '../../..');
  let serverPath: string;
  
  switch (serverType) {
    case 'multi-tools':
      serverPath = path.join(rootDir, 'dist/servers/index.js');
      break;
    case 'dice':
      // 将来的な実装用
      serverPath = path.join(rootDir, 'dist/servers/dice-server.js');
      break;
    case 'current-time':
      // 将来的な実装用
      serverPath = path.join(rootDir, 'dist/servers/time-server.js');
      break;
    default:
      serverPath = path.join(rootDir, 'dist/servers/index.js');
      break;
  }
  
  // ファイルが存在するか確認
  if (!fs.existsSync(serverPath)) {
    throw new Error(`Server file not found: ${serverPath}`);
  }
  
  return serverPath;
}

/**
 * 利用可能なサーバーの種類を取得
 * @returns 利用可能なサーバーの種類の配列
 */
export function getAvailableServerTypes(): ServerType[] {
  return ['multi-tools', 'dice', 'current-time'];
} 