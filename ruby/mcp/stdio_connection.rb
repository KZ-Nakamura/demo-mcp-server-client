module MCP
  class StdioConnection
    def initialize
      $stdout.sync = true
    end

    def read_next_message
      $stdin.gets&.chomp
    end

    def send_message(message)
      $stdout.puts(message)
    end
  end
end
