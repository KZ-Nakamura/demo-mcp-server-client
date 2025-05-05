// CommonJSスタイルでAjvモジュールをインポート
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
import { ToolInputValidationError } from '../types/tools.js';

// Ajvインスタンスの作成
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

/**
 * JSONスキーマを使用して入力データを検証する
 * @param schema 検証に使用するJSONスキーマ
 * @param data 検証する入力データ
 * @throws {ToolInputValidationError} 検証エラーが発生した場合
 */
export function validateSchema(schema: object, data: unknown): void {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    const errors = validate.errors || [];
    const errorMessages = errors.map((err: any) => 
      `${err.instancePath} ${err.message}`
    ).join('; ');
    
    throw new ToolInputValidationError(`入力検証エラー: ${errorMessages}`, errors);
  }
}

// 後方互換性のために残しておく
export async function validateInput(schema: Record<string, any>, input: any): Promise<void> {
  return validateSchema(schema, input);
} 