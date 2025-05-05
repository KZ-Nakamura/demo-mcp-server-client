import { 
  ToolInputSchema,
  ToolDefinition,
  ToolHandler,
  Tool,
  ToolExecutionError,
  ToolInputValidationError
} from '../../../src/types/tools.js';

describe('Tool Types', () => {
  describe('ToolInputSchema', () => {
    it('should define a valid schema', () => {
      const schema: ToolInputSchema = {
        type: 'object',
        properties: {
          sides: {
            type: 'integer',
            minimum: 2,
            description: 'The number of sides on the dice'
          }
        },
        required: ['sides'],
        additionalProperties: false
      };

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties?.sides.type).toBe('integer');
      expect(schema.required).toContain('sides');
      expect(schema.additionalProperties).toBe(false);
    });
  });

  describe('ToolDefinition', () => {
    it('should define a tool definition', () => {
      const diceSchema: ToolInputSchema = {
        type: 'object',
        properties: {
          sides: {
            type: 'integer',
            minimum: 2,
            description: 'The number of sides on the dice'
          }
        },
        required: ['sides']
      };

      const toolDef: ToolDefinition = {
        name: 'roll_dice',
        description: 'Rolls a dice with the specified number of sides',
        inputSchema: diceSchema
      };

      expect(toolDef.name).toBe('roll_dice');
      expect(toolDef.description).toBe('Rolls a dice with the specified number of sides');
      expect(toolDef.inputSchema).toBe(diceSchema);
    });
  });

  describe('ToolHandler', () => {
    it('should handle synchronous execution', () => {
      const handler: ToolHandler = (input) => {
        return { result: input.sides * 2 };
      };

      const result = handler({ sides: 6 });
      expect(result).toEqual({ result: 12 });
    });

    it('should handle asynchronous execution', async () => {
      const handler: ToolHandler = async (input) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ result: input.sides * 2 });
          }, 10);
        });
      };

      const result = await handler({ sides: 6 });
      expect(result).toEqual({ result: 12 });
    });
  });

  describe('Tool', () => {
    it('should define a complete tool', () => {
      const diceSchema: ToolInputSchema = {
        type: 'object',
        properties: {
          sides: {
            type: 'integer',
            minimum: 2,
            description: 'The number of sides on the dice'
          }
        },
        required: ['sides']
      };

      const handler: ToolHandler = (input) => {
        return { result: Math.floor(Math.random() * input.sides) + 1 };
      };

      const tool: Tool = {
        name: 'roll_dice',
        description: 'Rolls a dice with the specified number of sides',
        inputSchema: diceSchema,
        handler
      };

      expect(tool.name).toBe('roll_dice');
      expect(tool.description).toBe('Rolls a dice with the specified number of sides');
      expect(tool.inputSchema).toBe(diceSchema);
      expect(tool.handler).toBe(handler);

      // Test handler execution
      const result = tool.handler({ sides: 6 });
      expect(result).toHaveProperty('result');
      expect((result as any).result).toBeGreaterThanOrEqual(1);
      expect((result as any).result).toBeLessThanOrEqual(6);
    });
  });

  describe('ToolExecutionError', () => {
    it('should create a tool execution error', () => {
      const error = new ToolExecutionError('Failed to roll dice');
      
      expect(error.name).toBe('ToolExecutionError');
      expect(error.message).toBe('Failed to roll dice');
      expect(error.data).toBeUndefined();
    });

    it('should include additional error data', () => {
      const error = new ToolExecutionError('Failed to roll dice', { reason: 'invalid sides' });
      
      expect(error.message).toBe('Failed to roll dice');
      expect(error.data).toEqual({ reason: 'invalid sides' });
    });
  });

  describe('ToolInputValidationError', () => {
    it('should create a tool input validation error', () => {
      const validationErrors = [
        { path: 'sides', message: 'must be an integer' }
      ];
      const error = new ToolInputValidationError('Invalid tool input', validationErrors);
      
      expect(error.name).toBe('ToolInputValidationError');
      expect(error.message).toBe('Invalid tool input');
      expect(error.validationErrors).toEqual(validationErrors);
    });
  });
}); 