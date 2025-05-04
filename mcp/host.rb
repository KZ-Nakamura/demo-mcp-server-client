require 'dotenv'
require 'json'
require_relative 'client'
require_relative 'llm_provider/factory'

Dotenv.load

module MCP
  class Host
    attr_reader :client, :llm_provider

    def initialize(provider_name = nil, options = {})
      @client = MCP::Client.new(server_file_path)
      @llm_provider = MCP::LLMProvider::Factory.create(provider_name, options)
    end

    def connect_to_server
      @client.initialize_connection
    end

    def chat_loop
      puts 'MCP Client Started!'
      puts "使用中のLLMプロバイダー: #{@llm_provider.class.name.split('::').last}"
      puts "クエリを入力してください。終了するには 'exit' と入力。"

      loop do
        print "> "
        input = $stdin.gets.chomp
        break if input.downcase == 'exit'

        puts process_query(input)
      end
    end

    private

    # TODO: とりあえずMCPサーバー1つだけしか指定できないようにする
    def server_file_path
      'mcp/dice/server.rb'
    end

    def process_query(query)
      messages = [
        {
          'role' => 'user',
          'content' => query
        }
      ]

      begin
        response = @client.list_tools
        available_tools = response[:tools].map do |tool|
          {
            name: tool[:name],
            description: tool[:description],
            input_schema: tool[:input_schema]
          }
        end

        # LLMにメッセージを送信
        response = @llm_provider.generate_message(
          messages: messages,
          tools: available_tools
        )

        final_text = []
        
        # テキスト応答の抽出
        text = @llm_provider.extract_text(response)
        final_text << text if text && !text.empty?

        # ツール使用の抽出
        tool_use = @llm_provider.extract_tool_use(response)
        if tool_use
          tool_name = tool_use[:name]
          tool_args = tool_use[:args]

          begin
            result = @client.call_tool(name: tool_name, args: tool_args)
            puts "ツール実行結果: #{result.inspect}"
            final_text << "[ツール実行: #{tool_name}, パラメータ: #{tool_args}]"
            final_text << "結果: #{result[:content]}"

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
              
              puts "メッセージ配列: #{tool_messages.inspect}"

              # 結果を元にLLMから再度応答を取得
              response = @llm_provider.generate_message(
                messages: tool_messages, 
                tools: []  # ツール使用後は通常の応答を期待
              )

              # 最終的なテキスト応答を追加
              result_text = @llm_provider.extract_text(response)
              final_text << result_text if result_text && !result_text.empty?
            rescue => e
              puts "2回目のAPI呼び出しでエラー: #{e.message}"
              puts e.backtrace.join("\n")
              # エラーが発生しても既に取得した結果を表示
              final_text << "サイコロの結果は #{result[:content]} です。"
            end
          rescue => e
            puts "ツール実行エラー: #{e.message}"
            puts e.backtrace.join("\n")
            final_text << "ツールの実行中にエラーが発生しました: #{e.message}"
          end
        end

        final_text.join("\n")
      rescue => e
        puts "全体処理エラー: #{e.message}"
        puts e.backtrace.join("\n")
        "エラーが発生しました: #{e.message}"
      end
    end
  end
end
