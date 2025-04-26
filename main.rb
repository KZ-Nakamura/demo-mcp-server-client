require_relative 'mcp/host'

def main
  host = MCP::Host.new
  host.connect_to_server
  host.chat_loop
end

main
