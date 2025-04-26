require 'json'
require 'open3'

module MCP
  class Client
    attr_reader :stdin, :stdout, :stderr, :wait_thr

    def initialize(server_file_path)
      # TODO: とりあえずrubyのMCPサーバーのみ対応
      @stdin, @stdout, @stderr, @wait_thr = Open3.popen3("ruby #{server_file_path}")
    end

    def send_request(request)
      @stdin.puts(JSON.generate(request))
      response = @stdout.gets
      raise 'No response from server' unless response

      result = JSON.parse(response, symbolize_names: true)
      raise "Server error: #{result[:error][:message]} (#{result[:error][:code]})" if result[:error]

      result[:result]
    rescue JSON::ParserError => e
      raise "Invalid JSON response: #{e.message}"
    end

    # Initialize connection
    # https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle
    def initialize_connection
      # Initialize request/initialize response
      response = send_request({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            roots: {
              listChanged: true
            },
            sampling: {}
          },
          clientInfo: {
            name: 'MCP Client',
            version: '1.0.0'
          }
        },
        id: 1
      })

      # initialized notification
      send_request({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })

      response
    end
  end
end
