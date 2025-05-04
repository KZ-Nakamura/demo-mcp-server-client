require 'openai'
require 'securerandom'
require_relative 'base'

module MCP
  module LLMProvider
    class OpenAI < Base
      def initialize(options = {})
        super
        api_key = options[:api_key] || ENV.fetch('OPENAI_API_KEY', nil)
        @client = ::OpenAI::Client.new(access_token: api_key)
        @model = options[:model] || 'gpt-4o'
        @system = options[:system] || 'Respond only in Japanese.'
      end

      def generate_message(messages:, tools:, max_tokens: 1000)
        # OpenAI用にメッセージを加工
        processed_messages = messages.map do |msg|
          if msg['role'] == 'user' && msg['content'].is_a?(String)
            { role: 'user', content: msg['content'] }
          elsif msg['role'] == 'assistant' && msg['content'].is_a?(Array)
            process_assistant_message(msg)
          elsif msg['role'] == 'user' && msg['content'].is_a?(Array) && msg['content'][0]['type'] == 'tool_result'
            process_tool_result_message(msg)
          else
            # その他のケースはそのままマップ
            { role: msg['role'], content: msg['content'] }
          end
        end

        # systemメッセージを追加
        processed_messages.unshift({ role: 'system', content: @system }) unless processed_messages.any? { |m| m[:role] == 'system' }

        # ツールの定義を変換
        openai_tools = tools.map do |tool|
          {
            type: 'function',
            function: {
              name: tool[:name],
              description: tool[:description],
              parameters: tool[:input_schema]
            }
          }
        end

        # リクエストパラメータを作成
        params = {
          model: @model,
          messages: processed_messages,
          max_tokens: max_tokens
        }

        # ツールパラメータが存在する場合のみ追加
        unless openai_tools.empty?
          params[:tools] = openai_tools
          params[:tool_choice] = 'auto'
        end

        puts "OpenAI API Request: #{params.inspect}"

        # APIリクエスト
        @client.chat(parameters: params)
      end

      def extract_text(response)
        return '' unless response['choices'] && !response['choices'].empty?
        
        message = response['choices'][0]['message']
        return message['content'] if message['content']
        ''
      end

      def extract_tool_use(response)
        return nil unless response['choices'] && !response['choices'].empty?
        
        message = response['choices'][0]['message']
        return nil unless message['tool_calls'] && !message['tool_calls'].empty?
        
        tool_call = message['tool_calls'][0]
        
        {
          id: tool_call['id'],
          name: tool_call['function']['name'],
          args: JSON.parse(tool_call['function']['arguments'])
        }
      rescue JSON::ParserError
        nil
      end

      def create_tool_result_message(messages:, tool_use:, result:)
        # メッセージ配列をコピー
        new_messages = []
        
        # システムメッセージを追加
        new_messages << { 'role' => 'system', 'content' => @system }
        
        # ユーザーの元の質問を追加
        new_messages << { 'role' => 'user', 'content' => messages.first['content'] }
        
        # アシスタントのツール使用メッセージ
        new_messages << {
          'role' => 'assistant',
          'content' => nil,
          'tool_calls' => [
            {
              'id' => tool_use[:id],
              'type' => 'function',
              'function' => {
                'name' => tool_use[:name],
                'arguments' => tool_use[:args].is_a?(Hash) ? JSON.generate(tool_use[:args]) : tool_use[:args].to_s
              }
            }
          ]
        }

        # ツール結果メッセージ
        new_messages << {
          'role' => 'tool',
          'tool_call_id' => tool_use[:id],
          'content' => result.to_s
        }

        new_messages
      end

      private

      def process_assistant_message(msg)
        content = msg['content']
        tool_use = content.find { |c| c['type'] == 'tool_use' }
        
        if tool_use
          {
            role: 'assistant',
            content: nil,
            tool_calls: [
              {
                id: tool_use['id'],
                type: 'function',
                function: {
                  name: tool_use['name'],
                  arguments: tool_use['input'].is_a?(Hash) ? JSON.generate(tool_use['input']) : tool_use['input'].to_s
                }
              }
            ]
          }
        else
          text_content = content.select { |c| c['type'] == 'text' }.map { |c| c['text'] }.join("\n")
          { role: 'assistant', content: text_content }
        end
      end

      def process_tool_result_message(msg)
        tool_result = msg['content'][0]
        {
          role: 'tool',
          tool_call_id: tool_result['tool_use_id'],
          content: tool_result['content']
        }
      end
    end
  end
end 