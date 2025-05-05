require 'dotenv'
require 'json'
require 'logger'
require 'fileutils'
require_relative 'client'
require_relative 'llm_provider/factory'

Dotenv.load

module MCP
  class Host
    attr_reader :client, :llm_provider, :logger

    def initialize(provider_name = nil, options = {})
      @client = MCP::Client.new(server_file_path)
      @llm_provider = MCP::LLMProvider::Factory.create(provider_name, options)
      setup_logger
    end

    def connect_to_server
      @client.initialize_connection
    end

    def chat_loop
      @logger.info('MCP Client Started!')
      @logger.info("使用中のLLMプロバイダー: #{@llm_provider.class.name.split('::').last}")
      puts 'MCP Client Started!'
      puts "使用中のLLMプロバイダー: #{@llm_provider.class.name.split('::').last}"
      puts "クエリを入力してください。終了するには 'exit' と入力。"
      puts "※デバッグログは #{@log_file_path} に保存されています"

      loop do
        print "> "
        input = $stdin.gets.chomp
        break if input.downcase == 'exit'

        @logger.info("User query: #{input}")
        response = process_query(input)
        puts response
      end
    end

    private

    def setup_logger
      # logsディレクトリがなければ作成
      FileUtils.mkdir_p('logs') unless Dir.exist?('logs')
      
      # 日時を含むログファイル名を生成
      timestamp = Time.now.strftime('%Y%m%d_%H%M%S')
      @log_file_path = "logs/mcp_#{timestamp}.log"
      
      # ロガーを設定
      @logger = Logger.new(@log_file_path)
      @logger.level = Logger::DEBUG
      @logger.formatter = proc do |severity, datetime, progname, msg|
        "[#{datetime.strftime('%Y-%m-%d %H:%M:%S')}] #{severity}: #{msg}\n"
      end
    end

    # TODO: とりあえずMCPサーバー1つだけしか指定できないようにする
    def server_file_path
      'mcp/multi_tools/server.rb'
    end

    def process_query(query)
      messages = [
        {
          'role' => 'user',
          'content' => query
        }
      ]

      begin
        # ログ用の情報を格納する配列（ユーザーには表示しない）
        debug_info = []
        
        # ユーザーに表示する最終的な情報
        user_response = nil

        response = @client.list_tools
        @logger.debug("Available tools: #{response[:tools].map{|t| t[:name]}.join(', ')}")
        
        available_tools = response[:tools].map do |tool|
          {
            name: tool[:name],
            description: tool[:description],
            input_schema: tool[:input_schema]
          }
        end

        # LLMにメッセージを送信
        @logger.info("Sending query to LLM: #{query}")
        response = @llm_provider.generate_message(
          messages: messages,
          tools: available_tools
        )
        @logger.debug("LLM raw response: #{response.inspect}")

        # テキスト応答の抽出
        text = @llm_provider.extract_text(response)
        @logger.debug("Extracted text: #{text}")
        debug_info << text if text && !text.empty?

        # ツール使用の抽出
        tool_use = @llm_provider.extract_tool_use(response)
        if tool_use
          tool_name = tool_use[:name]
          tool_args = tool_use[:args]
          @logger.info("Tool selected: #{tool_name}, args: #{tool_args.inspect}")
          debug_info << "[ツール実行: #{tool_name}, パラメータ: #{tool_args}]"

          begin
            result = @client.call_tool(name: tool_name, args: tool_args)
            @logger.info("Tool execution result: #{result.inspect}")
            debug_info << "ツール実行結果: #{result[:content]}"

            begin
              # ツール結果をLLMに送信するためのメッセージを作成
              tool_messages = [
                { role: 'user', content: messages.first['content'] },
                {
                  role: 'assistant',
                  content: '',
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
                {
                  role: 'tool',
                  tool_call_id: tool_use[:id],
                  content: result[:content].to_s
                }
              ]
              
              # システムメッセージを先頭に追加
              tool_messages.unshift({ role: 'system', content: 'Respond only in Japanese.' })
              
              @logger.debug("Second LLM call messages: #{tool_messages.inspect}")

              # 結果を元にLLMから再度応答を取得
              @logger.info("Sending tool results to LLM for final response")
              response = @llm_provider.generate_message(
                messages: tool_messages, 
                tools: []  # ツール使用後は通常の応答を期待
              )
              @logger.debug("Second LLM raw response: #{response.inspect}")

              # 最終的なテキスト応答を追加
              result_text = @llm_provider.extract_text(response)
              @logger.debug("Final response text: #{result_text}")
              
              # ユーザーに表示する最終応答を設定
              user_response = result_text if result_text && !result_text.empty?
            rescue => e
              @logger.error("Error in second LLM call: #{e.message}")
              @logger.error(e.backtrace.join("\n"))
              user_response = "APIエラー: #{e.message.split("\n").first}"
            end
          rescue => e
            @logger.error("Tool execution error: #{e.message}")
            @logger.error(e.backtrace.join("\n"))
            user_response = "ツール実行エラー: #{e.message.split("\n").first}"
          end
        else
          # ツールが使用されなかった場合は、最初のLLM応答をそのまま表示
          @logger.info("No tool was used for this query")
          user_response = text if text && !text.empty?
        end

        # デバッグ情報をログに記録
        @logger.debug("Debug info: #{debug_info.join("\n")}")
        
        # 最終応答をログに記録
        @logger.info("Final response to user: #{user_response}")
        
        # ユーザーに表示する応答（LLMからの最終テキストまたはエラーメッセージ）
        user_response || "応答がありません"
      rescue => e
        @logger.error("Overall processing error: #{e.message}")
        @logger.error(e.backtrace.join("\n"))
        "エラー: #{e.message.split("\n").first}"
      end
    end
  end
end
