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
      @anthropic_client = Anthropic::Client.new(
        access_token: ENV.fetch('ANTHROPIC_API_KEY', nil),
        log_errors: true
      )
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
      response = generate_initial_messages(query)
      if response['content'].empty?
        puts 'No response from the server'
        return
      end

      puts response['content'][0]['text']
    end

    def generate_initial_messages(query)
      initial_messages = [
        {
          'role': 'user',
          'content': query
        }
      ]
      response = @client.list_tools
      available_tools = response[:tools].map do |tool|
        {
          name: tool[:name],
          description: tool[:description],
          input_schema: tool[:input_schema]
        }
      end

      @anthropic_client.messages(
        parameters: {
          model: 'claude-3-7-sonnet-20250219',
          system: 'Respond only in Japanese.',
          messages: initial_messages,
          max_tokens: 1000,
          tools: available_tools
        }
      )
    end
  end
end
