require 'anthropic'
require_relative 'base'

module MCP
  module LLMProvider
    class Anthropic < Base
      def initialize(options = {})
        super
        api_key = options[:api_key] || ENV.fetch('ANTHROPIC_API_KEY', nil)
        @client = ::Anthropic::Client.new(
          access_token: api_key,
          log_errors: true
        )
        @model = options[:model] || 'claude-3-7-sonnet-20250219'
        @system = options[:system] || 'Respond only in Japanese.'
      end

      def generate_message(messages:, tools:, max_tokens: 1000)
        @client.messages(
          parameters: {
            model: @model,
            system: @system,
            messages: messages,
            max_tokens: max_tokens,
            tools: tools
          }
        )
      end

      def extract_text(response)
        return '' if response['content'].empty?

        text_content = response['content'].select { |content| content['type'] == 'text' }
        text_content.map { |content| content['text'] }.join("\n")
      end

      def extract_tool_use(response)
        return nil if response['content'].empty?

        tool_use = response['content'].find { |content| content['type'] == 'tool_use' }
        return nil unless tool_use

        {
          id: tool_use['id'],
          name: tool_use['name'],
          args: tool_use['input']
        }
      end

      def create_tool_result_message(messages:, tool_use:, result:)
        # まず最新のassistantメッセージを抽出
        assistant_message_content = []
        response_content = messages.last[:content] if messages.last[:role] == 'assistant'
        
        if response_content
          # 既存のassistantメッセージを更新
          assistant_message_content = response_content
        else
          # 新規assistantメッセージを作成してメッセージ配列に追加
          assistant_message_content = [{ 'type' => 'tool_use', 'id' => tool_use[:id], 'name' => tool_use[:name], 'input' => tool_use[:args] }]
          messages << { 'role' => 'assistant', 'content' => assistant_message_content }
        end

        # ツール結果メッセージを追加
        messages << {
          'role' => 'user',
          'content' => [
            {
              'type' => 'tool_result',
              'tool_use_id' => tool_use[:id],
              'content' => result.to_s
            }
          ]
        }

        messages
      end
    end
  end
end 