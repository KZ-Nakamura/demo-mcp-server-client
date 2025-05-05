import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ToolInputValidationError } from '../types/tools.js';

// Ajvインスタンスを作成し、フォーマットを追加
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * 入力値をJSONスキーマに対して検証する
 * @param schema JSONスキーマ
 * @param input 検証する入力値
 * @throws {ToolInputValidationError} 検証に失敗した場合
 */
export async function validateInput(schema: Record<string, any>, input: any): Promise<void> {
  try {
    const validate = ajv.compile(schema);
    const valid = validate(input);
    
    if (!valid) {
      const errors = validate.errors || [];
      throw new ToolInputValidationError(
        'Input validation failed',
        errors
      );
    }
  } catch (error) {
    if (error instanceof ToolInputValidationError) {
      throw error;
    }
    
    throw new ToolInputValidationError(
      `Schema validation error: ${error instanceof Error ? error.message : String(error)}`,
      []
    );
  }
} 