import { MultiToolsServer } from '../../../src/servers/multi-tools-server.js';
import { McpServer } from '../../../src/mcp/server.js';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { DiceTool } from '../../../src/tools/dice.js';
import { CurrentTimeTool } from '../../../src/tools/current-time.js';

// 手動モック
class MockConnection {
  sentData: any[] = [];
  
  send(data: any): void {
    this.sentData.push(data);
  }
  
  close(): void {
    // 何もしない
  }
}

describe('MultiToolsServer', () => {
  const diceTool = new DiceTool();
  const timeTool = new CurrentTimeTool();
  let server: MultiToolsServer;
  let connection: MockConnection;

  beforeEach(() => {
    server = new MultiToolsServer();
    connection = new MockConnection();
  });

  it('should register tools', () => {
    server.registerTool(diceTool);
    server.registerTool(timeTool);
    
    // 内部のツールリストに追加されているか確認
    expect((server as any).tools.has('dice')).toBe(true);
    expect((server as any).tools.has('current_time')).toBe(true);
  });

  it('should handle tool invocation', async () => {
    server.registerTool(diceTool);
    
    const message = {
      type: 'function_call',
      name: 'dice',
      arguments: JSON.stringify({ sides: 6 })
    };
    
    await server.handleMessage(message, connection);
    
    // 送信されたデータを確認
    expect(connection.sentData.length).toBe(1);
    const response = connection.sentData[0];
    expect(response.type).toBe('function_call_response');
    expect(response.name).toBe('dice');
    expect(response.content).toBeDefined();
    
    // 内容を解析してDiceToolからの結果を確認
    const content = JSON.parse(response.content);
    expect(content.result).toBeGreaterThanOrEqual(1);
    expect(content.result).toBeLessThanOrEqual(6);
    expect(content.sides).toBe(6);
  });

  it('should handle unknown tool gracefully', async () => {
    const message = {
      type: 'function_call',
      name: 'unknown_tool',
      arguments: '{}'
    };
    
    await server.handleMessage(message, connection);
    
    // エラーレスポンスが送信されていることを確認
    expect(connection.sentData.length).toBe(1);
    const response = connection.sentData[0];
    expect(response.type).toBe('function_call_response');
    expect(response.name).toBe('unknown_tool');
    expect(response.error).toBeDefined();
    expect(response.error).toContain('unknown tool');
  });

  it('should handle invalid arguments', async () => {
    server.registerTool(diceTool);
    
    const message = {
      type: 'function_call',
      name: 'dice',
      arguments: JSON.stringify({ sides: -5 }) // 無効な値
    };
    
    await server.handleMessage(message, connection);
    
    // バリデーションエラーが送信されていることを確認
    expect(connection.sentData.length).toBe(1);
    const response = connection.sentData[0];
    expect(response.type).toBe('function_call_response');
    expect(response.name).toBe('dice');
    expect(response.error).toBeDefined();
  });

  it('should ignore non-function call messages', async () => {
    const message = {
      type: 'some_other_type',
      content: 'Hello'
    };
    
    await server.handleMessage(message, connection);
    
    // 何も送信されていないことを確認
    expect(connection.sentData.length).toBe(0);
  });
}); 