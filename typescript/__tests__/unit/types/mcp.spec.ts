import { 
  JSONRPCRequest, 
  JSONRPCSuccessResponse, 
  JSONRPCErrorResponse, 
  MCPErrorCode
} from '../../../src/types/mcp.js';

describe('MCP Protocol Types', () => {
  describe('JSONRPCRequest', () => {
    it('should correctly type a JSONRPC request', () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '0.3',
          client: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      expect(request.jsonrpc).toBe('2.0');
      expect(request.id).toBe(1);
      expect(request.method).toBe('initialize');
      expect(request.params).toBeDefined();
      expect(request.params.protocolVersion).toBe('0.3');
    });

    it('should allow null id', () => {
      const request: JSONRPCRequest = {
        jsonrpc: '2.0',
        id: null,
        method: 'notify'
      };

      expect(request.id).toBeNull();
    });
  });

  describe('JSONRPCSuccessResponse', () => {
    it('should correctly type a success response', () => {
      const response: JSONRPCSuccessResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '0.3',
          server: {
            name: 'test-server',
            version: '1.0.0'
          }
        }
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.error).toBeUndefined();
    });
  });

  describe('JSONRPCErrorResponse', () => {
    it('should correctly type an error response', () => {
      const response: JSONRPCErrorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.MethodNotFound,
          message: 'Method not found'
        }
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(MCPErrorCode.MethodNotFound);
      expect(response.error.message).toBe('Method not found');
      expect(response.result).toBeUndefined();
    });

    it('should allow additional error data', () => {
      const response: JSONRPCErrorResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.InvalidToolInput,
          message: 'Invalid tool input',
          data: {
            validationErrors: ['field required']
          }
        }
      };

      expect(response.error.data).toBeDefined();
      expect(response.error.data.validationErrors).toContain('field required');
    });
  });

  describe('MCPErrorCode', () => {
    it('should define standard error codes', () => {
      expect(MCPErrorCode.ParseError).toBe(-32700);
      expect(MCPErrorCode.InvalidRequest).toBe(-32600);
      expect(MCPErrorCode.MethodNotFound).toBe(-32601);
      expect(MCPErrorCode.InvalidParams).toBe(-32602);
      expect(MCPErrorCode.InternalError).toBe(-32603);
    });

    it('should define MCP-specific error codes', () => {
      expect(MCPErrorCode.ToolNotFound).toBe(-32000);
      expect(MCPErrorCode.ToolExecutionError).toBe(-32001);
      expect(MCPErrorCode.InvalidToolInput).toBe(-32002);
    });
  });
}); 