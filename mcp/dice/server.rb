require 'json'
require_relative '../stdio_connection'
require_relative '../logger'

module MCP
  module Dice
    class Server
      def initialize
        @connection = StdioConnection.new
        @logger = Logger.new('tmp/mcp.log')
      end

      def run
        loop do
          next_message = @connection.read_next_message
          if next_message.nil?
            puts 'Connection closed'
            break
          end

          response = process_message(next_message)
          next if response.nil?

          @connection.send_message(JSON.generate(response))
        end
      end

      private

      def process_message(message)
        request = JSON.parse(message)
        case request['method']
        when 'initialize'
          @logger.info('RPC: initialize')
          {
            jsonrpc: '2.0',
            id: 1,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                logging: {},
                prompts: {
                  listChanged: true
                },
                resources: {
                  subscribe: true,
                  listChanged: true
                },
                tools: {
                  listChanged: true
                }
              },
              serverInfo: {
                name: 'MCP Client',
                version: '1.0.0'
              },
              instructions: 'Optional instructions for the client'
            }
          }
        when 'notifications/initialized'
          @logger.info('RPC: notifications/initialized')
          nil
        end
      end
    end
  end
end

MCP::Dice::Server.new.run
