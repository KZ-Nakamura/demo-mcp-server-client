# Scratch MCP

Almost scratch MCP Host/Client/Server in Ruby

- [MCP Specification](https://modelcontextprotocol.io/specification/2025-03-26)
- [MCP Client](https://modelcontextprotocol.io/quickstart/client)
- [MCP Server](https://modelcontextprotocol.io/quickstart/server)
- [MCP Schema](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/3ba3181c7779da74b24f0c083eb7055b6fc9d928/schema/2025-03-26/schema.ts)

# Usage

0. Set up environment:

```bash
cp .env.example .env
```

1. 環境変数を設定:
   - `ANTHROPIC_API_KEY`: Anthropic APIキー
   - `OPENAI_API_KEY`: OpenAI APIキー
   - `LLM_PROVIDER`: デフォルトのLLMプロバイダー（`anthropic`または`openai`）

2. Install dependencies:

```bash
bundle install
```

3. Run:

```bash
# デフォルトプロバイダー（.envのLLM_PROVIDER）を使用
ruby main.rb

# Anthropicを使用
ruby main.rb --provider anthropic

# OpenAIを使用
ruby main.rb --provider openai

# モデルを指定
ruby main.rb --provider openai --model gpt-4
ruby main.rb --provider anthropic --model claude-3-5-sonnet-20240620
```

# Current implementation

- Transports
  - stdio only
- MCP Server
  - マルチツールサーバー（`mcp/multi_tools/server.rb`）を実装
  - 現在3つのツールを提供:
    - `dice`: サイコロを振る（1〜n面のダイス）
    - `current_time`: 現在の時刻を取得（ISO/読みやすい形式/UNIX時間）
    - `weather`: 指定した都市の天気情報を取得（デモ用、実際のAPI呼び出しなし）

# Supported LLM Providers

- OpenAI (GPT) - **テスト済み、動作確認済み**
- Anthropic (Claude) - 実装済みだが十分なテスト未実施

# ログ機能

システムは2種類のログファイルを生成します：

1. **MCPシステムログ**: `logs/mcp_YYYYMMDD_HHMMSS.log`
   - ユーザーのクエリ、ツールの選択と実行、応答など主要な操作ログ

2. **OpenAIプロバイダーログ**: `logs/openai_YYYYMMDD.log`
   - OpenAI APIとの通信関連のログ（リクエスト/レスポンス詳細など）

ログファイルは自動的に`logs/`ディレクトリに保存され、このディレクトリはGitの管理対象外です。

# Supported MCP Protocol
- Initialization
  - initialize request
  - initialize response
  - initialized notification
- Ping
- Operation
  - Tools
    - Protocol Messages
      - listing tools
      - calling tools
    - Tool Result
      - text content only
- Shutdown

# TODO
- To register multiple MCP servers
- Transports
  - Streamable HTTP
- Error Handling
- Timeouts
- Anthropicプロバイダーの十分なテスト
- より多くのツールの追加
- ツールの動的な登録/解除機能
