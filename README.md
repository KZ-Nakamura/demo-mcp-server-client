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
  - Currently, **the dice server(`mcp/dice/server.rb`) is fixed as the MCP server.**

# Supported LLM Providers

- Anthropic (Claude)
- OpenAI (GPT)

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
