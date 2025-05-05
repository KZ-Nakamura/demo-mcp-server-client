module MCP
  module LLMProvider
    class Base
      def initialize(options = {})
        @options = options
      end

      # LLMにメッセージを送信して応答を取得する
      # @param messages [Array] 会話履歴
      # @param tools [Array] 利用可能なツール
      # @param max_tokens [Integer] 最大トークン数
      # @return [Hash] LLMからの応答
      def generate_message(messages:, tools:, max_tokens: 1000)
        raise NotImplementedError, "#{self.class}#generate_message must be implemented"
      end

      # レスポンスからテキスト部分を抽出する
      # @param response [Hash] LLMからの応答
      # @return [String] テキスト
      def extract_text(response)
        raise NotImplementedError, "#{self.class}#extract_text must be implemented"
      end

      # レスポンスからツール使用情報を抽出する
      # @param response [Hash] LLMからの応答
      # @return [Hash, nil] ツール使用情報またはnil
      def extract_tool_use(response)
        raise NotImplementedError, "#{self.class}#extract_tool_use must be implemented"
      end

      # ツール実行結果をLLMに送信するメッセージを作成する
      # @param messages [Array] 既存のメッセージ
      # @param tool_use [Hash] ツール使用情報
      # @param result [String] ツール実行結果
      # @return [Array] 更新されたメッセージ
      def create_tool_result_message(messages:, tool_use:, result:)
        raise NotImplementedError, "#{self.class}#create_tool_result_message must be implemented"
      end
    end
  end
end 