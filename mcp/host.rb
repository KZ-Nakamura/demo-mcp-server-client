require 'dotenv'
require 'anthropic'
require 'json'
require_relative 'client'

Dotenv.load

module MCP
  class Host
    attr_reader :client

    def initialize
      @client = MCP::Client.new(server_file_path)
    end

    def connect_to_server
      @client.initialize_connection
    end

    def chat_loop
      puts 'MCP Client Started!'
      puts "Type your queries 'exit' to exit."

      loop do
        input = $stdin.gets.chomp
        break if input.downcase == 'exit'

        process_query(input)
      end
    end

    private

    # TODO: とりあえずMCPサーバー1つだけしか指定できないようにする
    def server_file_path
      'mcp/dice/server.rb'
    end

    def process_query(query)
      puts "process #{query}"
      client = Anthropic::Client.new(
        access_token: ENV.fetch('ANTHROPIC_API_KEY', nil),
        log_errors: true
      )

      response = client.messages(
        parameters: {
          model: 'claude-3-7-sonnet-20250219',
          system: 'Respond only in Japanese.',
          messages: [
            { 'role': 'user', 'content': query }
          ],
          max_tokens: 1000
        }
      )

      if response['content'].empty?
        puts 'No response from the server'
        return
      end

      puts response['content'][0]['text']
    end
  end
end
