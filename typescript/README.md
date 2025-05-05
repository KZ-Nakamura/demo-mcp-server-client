# TypeScript MCP Implementation

TypeScript実装によるModel Context Protocol (MCP) のホスト/クライアント/サーバー

**注意：この実装は現在開発中です**

## 環境構築

1. 依存関係のインストール:

```bash
cd typescript
npm install
```

2. 環境変数の設定:

```bash
cp .env.example .env
```

次の環境変数を設定してください：
- `ANTHROPIC_API_KEY`: Anthropic APIキー
- `OPENAI_API_KEY`: OpenAI APIキー
- `LLM_PROVIDER`: デフォルトのLLMプロバイダー

## 開発

```bash
# 開発モードで実行
npm run dev

# ビルド
npm run build

# ビルドしたものを実行
npm start
```

## 実装予定の機能

- MCP Client/Server/Host
- マルチツールサポート
- 複数のLLMプロバイダー対応
- TypeScriptの型を活用した安全な実装
- 非同期処理の適切な扱い

## 貢献方法

このTypeScript実装は開発中です。貢献は大歓迎です。 