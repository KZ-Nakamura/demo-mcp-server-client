require 'openai'
require 'securerandom'
require_relative 'base'
require 'logger'
require 'fileutils'

module MCP
  module LLMProvider
    class OpenAI < Base
      def initialize(options = {})
        super
        api_key = options[:api_key] || ENV.fetch('OPENAI_API_KEY', nil)
        @client = ::OpenAI::Client.new(access_token: api_key)
        @model = options[:model] || 'gpt-4o'
        @system = options[:system] || 'Respond only in Japanese.'
        setup_logger
      end

      def generate_message(messages:, tools:, max_tokens: 1000)
        @logger.debug("元のメッセージ: #{messages.inspect}")
        # OpenAI用にメッセージを加工
        processed_messages = messages.map do |msg|
          if msg[:role] && msg[:content]
            # すでにシンボルキーの場合はそのまま
            msg
          elsif msg['role'] == 'user' && msg['content'].is_a?(String)
            { role: 'user', content: msg['content'] }
          elsif msg['role'] == 'assistant' && msg['content'].is_a?(Array)
            process_assistant_message(msg)
          elsif msg['role'] == 'user' && msg['content'].is_a?(Array) && msg['content'][0]['type'] == 'tool_result'
            process_tool_result_message(msg)
          elsif msg['role'] && msg['content']
            # 文字列キーをシンボルキーに変換
            { role: msg['role'], content: msg['content'] }
          else
            @logger.warn("警告: 不明なメッセージ形式: #{msg.inspect}")
            # その他のケースはそのまま（警告を出す）
            msg
          end
        end

        @logger.debug("処理後のメッセージ: #{processed_messages.inspect}")

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

        @logger.debug("OpenAI API Request: #{params.inspect}")

        begin
          # APIリクエスト
          @client.chat(parameters: params)
        rescue Faraday::Error => e
          if e.response
            @logger.error("OpenAI API Error Response: #{e.response[:body]}")
          end
          raise e
        end
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
        # 直接APIに送信するメッセージシーケンスを作成
        [
          # ユーザーからの質問（必須）
          { role: 'user', content: messages.first['content'] },
          
          # アシスタントのツール呼び出し応答（必須）
          {
            role: 'assistant',
            content: '',  # 空の文字列（必須）
            tool_calls: [
              {
                id: tool_use[:id],
                type: 'function',
                function: {
                  name: tool_use[:name],
                  arguments: tool_use[:args].is_a?(Hash) ? JSON.generate(tool_use[:args]) : tool_use[:args].to_s
                }
              }
            ]
          },
          
          # ツール実行結果（必須）
          {
            role: 'tool',
            tool_call_id: tool_use[:id],
            content: result.to_s
          }
        ]
      end

      private

      def setup_logger
        @logger = Logger.new(get_log_file_path)
        @logger.level = Logger::DEBUG
        @logger.formatter = proc do |severity, datetime, progname, msg|
          "[#{datetime.strftime('%Y-%m-%d %H:%M:%S')}] #{severity}: #{msg}\n"
        end
      end

      def get_log_file_path
        # logsディレクトリがなければ作成
        log_dir = File.expand_path('../../../../logs', __FILE__)
        FileUtils.mkdir_p(log_dir) unless Dir.exist?(log_dir)
        
        # OpenAI用のログファイル名
        "#{log_dir}/openai_#{Time.now.strftime('%Y%m%d')}.log"
      end

      def process_assistant_message(msg)
        content = msg['content']
        tool_use = content.find { |c| c['type'] == 'tool_use' }
        
        if tool_use
          {
            role: 'assistant',
            content: '',
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