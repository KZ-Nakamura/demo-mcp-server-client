require 'json'

print JSON.generate({
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
})
