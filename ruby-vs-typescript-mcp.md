# RubyとTypeScriptのMCP実装比較

## 実装の複雑さの比較

### 1. 構造的な違い

| 項目 | Ruby実装 | TypeScript実装 |
|------|----------|---------------|
| 全体構造 | シンプルで直接的 | 型定義が多く、よりモジュール化されている |
| ファイル数 | 少ない | 多い（型定義、インターフェース等が分離） |
| パターン | 手続き型に近い | オブジェクト指向とプロトコル志向 |

### 2. 主な違い

1. **プロセス起動方法の違い**：
   - Ruby: `Open3.popen3`でサーバープロセスを直接起動
   - TypeScript: 別プロセスを前提とした設計（`StdioConnection`だけを使用）

2. **通信プロトコル**：
   - Ruby: JSON-RPCを使用（`jsonrpc: 2.0`）
   - TypeScript: 独自のMCPメッセージフォーマットを使用

3. **エラーハンドリング**：
   - Ruby: 単純な例外処理
   - TypeScript: より構造化されたエラーハンドリング

4. **型システム**：
   - Ruby: 動的型付け
   - TypeScript: 静的型付けで多くの型定義とインターフェースが必要

### 3. コード量の比較

| コンポーネント | Ruby (行数) | TypeScript (行数) |
|--------------|------------|-------------------|
| Client | 約110行 | 約170行 |
| Server | 約110行 | より多い |
| Connection | 約15行 | 約140行 |
| Host | 約195行 | 約300行 |

## コード例の比較

### Client 実装比較

#### Ruby版 Client（シンプル）

```ruby
def send_request(request)
  @stdin.puts(JSON.generate(request))
  response = @stdout.gets
  raise 'No response from server' unless response

  result = JSON.parse(response, symbolize_names: true)
  raise "Server error: #{result[:error][:message]} (#{result[:error][:code]})" if result[:error]

  result[:result]
rescue JSON::ParserError => e
  raise "Invalid JSON response: #{e.message}"
end
```

#### TypeScript版 Client（複雑）

```typescript
private async sendRequest<T extends MCPResponse>(request: MCPRequest): Promise<T> {
  const requestStr = JSON.stringify(request);
  
  this.logger.debug(`Sending request: ${requestStr}`);
  await this.connection.send(requestStr);

  const responseStr = await this.connection.receive();
  this.logger.debug(`Received response: ${responseStr}`);
  
  const response = this.parseResponse<T>(responseStr);
  
  if (response.error) {
    throw new Error(`Server error: ${response.error}`);
  }
  
  return response;
}

private parseResponse<T extends MCPResponse>(responseStr: string): T {
  try {
    // JSONオブジェクトかどうかを確認
    const trimmed = responseStr.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      // JSONでない場合はプレーンテキストとして扱い、適切なレスポンス形式にラップ
      this.logger.info('非JSONレスポンスを処理します:', { responseStr });
      
      // リクエストに対応するレスポンス型を推測
      const isToolCallResponse = 'output' in ({} as T);
      
      if (isToolCallResponse) {
        // ツール呼び出しの場合
        return {
          id: `resp_${Date.now()}`,
          success: true,
          output: responseStr
        } as unknown as T;
      } else {
        // その他の場合（デフォルト）
        return {
          id: `resp_${Date.now()}`,
          success: true,
          message: responseStr
        } as unknown as T;
      }
    }
    
    // 通常のJSONパース
    const response = JSON.parse(responseStr) as T;
    
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format');
    }
    
    return response;
  } catch (error) {
    this.logger.error(`Failed to parse response: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to parse response: ${responseStr}`);
  }
}
```

### Connection 実装比較

#### Ruby版 Connection（超シンプル）

```ruby
module MCP
  class StdioConnection
    def initialize
      $stdout.sync = true
    end

    def read_next_message
      $stdin.gets&.chomp
    end

    def send_message(message)
      $stdout.puts(message)
    end
  end
end
```

#### TypeScript版 Connection（複雑）

```typescript
export class StdioConnection implements Connection {
  private readline: Interface;
  private isOpen: boolean = false;
  private queue: string[] = [];
  private resolveMap: Map<string, (message: string) => void> = new Map();

  constructor(
    private readonly input = process.stdin,
    private readonly output = process.stdout
  ) {
    this.readline = createInterface({
      input: this.input,
      output: this.output,
      terminal: false
    });

    this.isOpen = true;

    // 標準入力からのメッセージを処理
    this.readline.on('line', (line: string) => {
      this.handleInput(line);
    });

    // 終了時の処理
    process.on('exit', () => {
      this.close();
    });
  }

  // 他にも多くのメソッドがある...
}
```

## TypeScript実装の複雑さの理由

TypeScript実装が複雑になった主な理由：

1. **型システム**：
   - 静的型付け言語のため、すべての型定義が必要
   - インターフェースと実装の分離
   - ジェネリック型の使用

2. **モジュール設計**：
   - より柔軟性の高いモジュール分割
   - 責務の明確な分離（単一責任の原則の適用）
   - 依存性注入パターンの採用

3. **拡張性の考慮**：
   - 将来的な拡張を見越した設計
   - より多くの抽象化レイヤー
   - インターフェースベースの設計

4. **テスト容易性**：
   - モック化しやすい設計
   - 依存関係の分離

5. **非同期処理**：
   - 非同期処理（Promise, async/await）の使用
   - コールバックとイベント駆動の設計

## どっちが良いか？

どちらが良いかは用途によります：

**Ruby実装の利点**：
- シンプルで理解しやすい
- コード量が少なく、メンテナンスが容易
- 動的型付けにより柔軟性が高い
- プロセス管理が組み込まれている（サーバーを自動起動）
- プロトタイピングや小規模なアプリケーションに最適

**TypeScript実装の利点**：
- 型安全性が高い
- コンポーネントの責務が明確に分離されている
- モジュール性が高く、拡張しやすい
- エラーをコンパイル時に検出できる
- 大規模チームや複雑なアプリケーションに最適
- IDEのサポートが充実（コード補完、リファクタリング）

## 改善案

TypeScript実装をもう少しシンプルにするには：

1. **自動プロセス管理の追加**：
   - Rubyのように、サーバーを自動的に起動する機能を実装
   - サーバー・クライアント間の連携を簡単にする統合ファサードの提供

2. **JSON-RPC互換の改善**：
   - 標準のJSON-RPCに準拠するようにプロトコルを変更
   - 独自メッセージフォーマットの複雑さを減らす

3. **連携部分の簡素化**：
   - プレーンテキスト応答も処理できるよう柔軟性を向上
   - エラー処理をシンプル化

4. **インターフェースの整理**：
   - 不要な型定義や細かい分割を整理する
   - 共通の基底クラスを活用して重複を減らす

## 結論

TypeScriptはその性質上、Ruby実装よりも複雑になりがちです。しかし、型安全性やモジュール性といった利点もあります。両者の良いところを組み合わせると、より使いやすく堅牢な実装が可能になるでしょう。

特にTypeScript実装では、コード量が増えても以下を意識することでバランスを取ることができます：

1. **適切な抽象化レベル**の選択
2. **ユーティリティ関数**を活用した共通処理の簡略化
3. **デフォルト値や設定**の活用によるボイラープレートの削減
4. **型推論**をうまく活用したコード量の削減

実装言語の選択は、プロジェクトの要件や開発チームの好みに応じて行うべきですが、どの言語を選んでも、シンプルさと堅牢性のバランスを常に意識することが重要です。 