import winston from 'winston';
import { Logger, LoggerOptions, LogLevel } from '../interfaces/logger.js';

/**
 * Winstonを使用したロガー実装
 */
export class WinstonLogger implements Logger {
  private logger: winston.Logger;

  /**
   * コンストラクタ
   * @param options ロガーオプション
   */
  constructor(options: LoggerOptions = {}) {
    const {
      level = LogLevel.Info,
      filePath,
      format = 'simple',
      timestamp = true,
      colorize = true
    } = options;

    // トランスポート設定
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: level,
        format: this.getConsoleFormat(format, timestamp, colorize)
      })
    ];

    // ファイル出力が指定されている場合は追加
    if (filePath) {
      transports.push(
        new winston.transports.File({
          filename: filePath,
          level: level,
          format: this.getFileFormat(format, timestamp)
        })
      );
    }

    // ロガー作成
    this.logger = winston.createLogger({
      level: level,
      transports,
      exitOnError: false
    });
  }

  /**
   * デバッグレベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }

  /**
   * 情報レベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  /**
   * 警告レベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  /**
   * エラーレベルのログを出力
   * @param message メッセージ
   * @param meta 追加情報
   */
  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  /**
   * コンソール出力用のフォーマットを取得
   * @param format フォーマット
   * @param timestamp タイムスタンプ表示
   * @param colorize カラー表示
   * @returns フォーマッター
   */
  private getConsoleFormat(
    format: string,
    timestamp: boolean,
    colorize: boolean
  ): winston.Logform.Format {
    const formats: winston.Logform.Format[] = [];

    if (colorize) {
      formats.push(winston.format.colorize());
    }

    if (timestamp) {
      formats.push(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }));
    }

    switch (format) {
      case 'json':
        formats.push(winston.format.json());
        break;
      case 'detailed':
        formats.push(
          winston.format.printf((info) => {
            const { timestamp, level, message, ...rest } = info;
            const timestampStr = timestamp ? `${timestamp} ` : '';
            const metaStr = Object.keys(rest).length
              ? `\n${JSON.stringify(rest, null, 2)}`
              : '';
            return `${timestampStr}[${level}]: ${message}${metaStr}`;
          })
        );
        break;
      case 'simple':
      default:
        formats.push(
          winston.format.printf((info) => {
            const { timestamp, level, message } = info;
            const timestampStr = timestamp ? `${timestamp} ` : '';
            return `${timestampStr}[${level}]: ${message}`;
          })
        );
        break;
    }

    return winston.format.combine(...formats);
  }

  /**
   * ファイル出力用のフォーマットを取得
   * @param format フォーマット
   * @param timestamp タイムスタンプ表示
   * @returns フォーマッター
   */
  private getFileFormat(
    format: string,
    timestamp: boolean
  ): winston.Logform.Format {
    const formats: winston.Logform.Format[] = [];

    if (timestamp) {
      formats.push(winston.format.timestamp());
    }

    switch (format) {
      case 'simple':
        formats.push(
          winston.format.printf((info) => {
            const { timestamp, level, message } = info;
            const timestampStr = timestamp ? `${timestamp} ` : '';
            return `${timestampStr}[${level}]: ${message}`;
          })
        );
        break;
      case 'detailed':
        formats.push(
          winston.format.printf((info) => {
            const { timestamp, level, message, ...rest } = info;
            const timestampStr = timestamp ? `${timestamp} ` : '';
            const metaStr = Object.keys(rest).length
              ? `\n${JSON.stringify(rest, null, 2)}`
              : '';
            return `${timestampStr}[${level}]: ${message}${metaStr}`;
          })
        );
        break;
      case 'json':
      default:
        formats.push(winston.format.json());
        break;
    }

    return winston.format.combine(...formats);
  }
}

/**
 * ロガーのファクトリー関数
 * @param options ロガーオプション
 * @returns ロガーインスタンス
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new WinstonLogger(options);
}

/**
 * デフォルトのロガーインスタンス
 */
export const defaultLogger = createLogger(); 