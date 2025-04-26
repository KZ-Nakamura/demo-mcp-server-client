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
  },
  handler: proc do |args|
    rand(1..args['sides'])
  end
)
@server.run
