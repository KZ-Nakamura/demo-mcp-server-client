require_relative '../server'

@server = MCP::Server.new
@server.register_tool(
  name: 'dice',
  description: 'Roll a dice',
  input_schema: {
    type: 'object',
    properties: {
      sides: {
        type: 'integer',
        description: 'The number of sides on the dice'
      }
    },
    required: ['sides']
  }
)
@server.run
