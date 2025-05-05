import { parseArguments } from '../../../src/utils/cli.js';

describe('Command Parser', () => {
  describe('parseArguments', () => {
    it('should parse arguments with flags correctly', () => {
      const args = ['--host', 'localhost', '--port', '8080', '--debug'];
      const result = parseArguments(args);
      
      expect(result).toEqual({
        host: 'localhost',
        port: '8080',
        debug: true
      });
    });
    
    it('should handle shorthand flags', () => {
      const args = ['-h', 'localhost', '-p', '8080', '-d'];
      const result = parseArguments(args, {
        shorthand: {
          h: 'host',
          p: 'port',
          d: 'debug'
        }
      });
      
      expect(result).toEqual({
        host: 'localhost',
        port: '8080',
        debug: true
      });
    });
    
    it('should use default values when not provided', () => {
      const args: string[] = [];
      const result = parseArguments(args, {
        defaults: {
          host: 'localhost',
          port: '3000',
          debug: false
        }
      });
      
      expect(result).toEqual({
        host: 'localhost',
        port: '3000',
        debug: false
      });
    });
    
    it('should override defaults with provided values', () => {
      const args = ['--port', '8080'];
      const result = parseArguments(args, {
        defaults: {
          host: 'localhost',
          port: '3000',
          debug: false
        }
      });
      
      expect(result).toEqual({
        host: 'localhost',
        port: '8080',
        debug: false
      });
    });
    
    it('should handle boolean flags without values', () => {
      const args = ['--verbose', '--quiet'];
      const result = parseArguments(args);
      
      expect(result).toEqual({
        verbose: true,
        quiet: true
      });
    });
    
    it('should handle negative boolean flags', () => {
      const args = ['--no-color', '--no-progress'];
      const result = parseArguments(args);
      
      expect(result).toEqual({
        color: false,
        progress: false
      });
    });
    
    it('should handle combined shorthand flags', () => {
      const args = ['-abc'];
      const result = parseArguments(args, {
        shorthand: {
          a: 'alpha',
          b: 'beta',
          c: 'charlie'
        }
      });
      
      expect(result).toEqual({
        alpha: true,
        beta: true,
        charlie: true
      });
    });
    
    it('should ignore unknown flags when specified', () => {
      const args = ['--known', 'value', '--unknown', 'value'];
      const result = parseArguments(args, {
        ignoreUnknown: true,
        allowedFlags: ['known']
      });
      
      expect(result).toEqual({
        known: 'value'
      });
    });
    
    it('should throw error for unknown flags when not ignored', () => {
      const args = ['--known', 'value', '--unknown', 'value'];
      
      expect(() => {
        parseArguments(args, {
          ignoreUnknown: false,
          allowedFlags: ['known']
        });
      }).toThrow(/unknown flag/i);
    });
    
    it('should handle positional arguments', () => {
      const args = ['command', 'subcommand', '--flag', 'value'];
      const result = parseArguments(args, { collectPositional: true });
      
      expect(result).toEqual({
        flag: 'value',
        _: ['command', 'subcommand']
      });
    });
    
    it('should stop parsing after double dash', () => {
      const args = ['--option', 'value', '--', '--not-an-option'];
      const result = parseArguments(args, { collectPositional: true });
      
      expect(result).toEqual({
        option: 'value',
        _: ['--not-an-option']
      });
    });
  });
}); 