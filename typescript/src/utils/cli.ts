/**
 * コマンドライン引数のパース時のオプション
 */
export interface ParseArgumentsOptions {
  /**
   * 短縮オプションと完全なオプション名のマッピング
   */
  shorthand?: Record<string, string>;
  
  /**
   * デフォルト値
   */
  defaults?: Record<string, any>;
  
  /**
   * 未知のフラグを無視するかどうか
   */
  ignoreUnknown?: boolean;
  
  /**
   * 許可されたフラグのリスト
   */
  allowedFlags?: string[];
  
  /**
   * 位置引数を収集するかどうか
   */
  collectPositional?: boolean;
}

/**
 * パースされたコマンドライン引数
 */
export interface ParsedArguments {
  /**
   * キーと値のペア
   */
  [key: string]: any;
  
  /**
   * 位置引数の配列 (collectPositional=trueの場合のみ)
   */
  _?: string[];
}

/**
 * コマンドライン引数をパースする
 * @param args パースする引数の配列
 * @param options パースオプション
 * @returns パースされた引数
 */
export function parseArguments(
  args: string[],
  options: ParseArgumentsOptions = {}
): ParsedArguments {
  const result: ParsedArguments = { ...(options.defaults || {}) };
  
  if (options.collectPositional) {
    result._ = [];
  }
  
  let i = 0;
  
  while (i < args.length) {
    const arg = args[i];
    
    // 二重ダッシュ (--) 以降は全て位置引数
    if (arg === '--' && options.collectPositional) {
      i++;
      while (i < args.length) {
        // 位置引数の配列は確実に初期化されている
        (result._ as string[]).push(args[i]);
        i++;
      }
      break;
    }
    
    // フラグパターンにマッチするか
    const longFlagMatch = arg.match(/^--([^=]+)(?:=(.*))?$/);
    const shortFlagMatch = arg.match(/^-([^-]*)$/);
    
    if (longFlagMatch) {
      // 長いフラグ (--flag または --flag=value)
      const flag = longFlagMatch[1];
      const value = longFlagMatch[2];
      
      // 否定フラグ (--no-flag)
      const negativeMatch = flag.match(/^no-(.+)$/);
      if (negativeMatch) {
        const actualFlag = negativeMatch[1];
        result[actualFlag] = false;
        i++;
        continue;
      }
      
      // 許可フラグのチェック
      if (options.allowedFlags && !options.allowedFlags.includes(flag) && !options.ignoreUnknown) {
        throw new Error(`Unknown flag: ${flag}`);
      }
      
      if (options.allowedFlags && !options.allowedFlags.includes(flag) && options.ignoreUnknown) {
        i += value !== undefined ? 1 : 2;
        continue;
      }
      
      if (value !== undefined) {
        // --flag=value 形式
        result[flag] = value;
        i++;
      } else if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        // --flag value 形式
        result[flag] = args[i + 1];
        i += 2;
      } else {
        // --flag 単独 (ブール値)
        result[flag] = true;
        i++;
      }
    } else if (shortFlagMatch) {
      // 短いフラグ (-f または -abc など複合)
      const flags = shortFlagMatch[1].split('');
      
      for (let j = 0; j < flags.length; j++) {
        const shortFlag = flags[j];
        const longFlag = options.shorthand?.[shortFlag];
        
        if (!longFlag) {
          // 未知の短縮フラグ
          if (!options.ignoreUnknown) {
            throw new Error(`Unknown short flag: -${shortFlag}`);
          }
          continue;
        }
        
        // 最後の短縮フラグで、次の引数が値である場合
        if (j === flags.length - 1 && i + 1 < args.length && !args[i + 1].startsWith('-')) {
          result[longFlag] = args[i + 1];
          i++;
        } else {
          // ブール値として扱う
          result[longFlag] = true;
        }
      }
      
      i++;
    } else if (options.collectPositional) {
      // 位置引数
      (result._ as string[]).push(arg);
      i++;
    } else {
      // 位置引数の収集がオフの場合はスキップ
      i++;
    }
  }
  
  return result;
}

/**
 * ヘルプテキストを表示する
 * @param programName プログラム名
 * @param description プログラムの説明
 * @param options コマンドラインオプションの説明
 * @param examples 使用例
 */
export function showHelp(
  programName: string,
  description: string,
  options: { name: string; description: string; default?: string }[],
  examples: string[] = []
): void {
  console.log(`\n${programName}\n`);
  console.log(`${description}\n`);
  
  console.log('Options:');
  const maxNameLength = Math.max(...options.map(o => o.name.length));
  
  options.forEach(option => {
    const paddedName = option.name.padEnd(maxNameLength + 2);
    const defaultValue = option.default ? ` (default: ${option.default})` : '';
    console.log(`  ${paddedName}${option.description}${defaultValue}`);
  });
  
  if (examples.length > 0) {
    console.log('\nExamples:');
    examples.forEach(example => {
      console.log(`  ${example}`);
    });
  }
  
  console.log('');
}

/**
 * エラーメッセージを表示して終了する
 * @param message エラーメッセージ
 * @param exitCode 終了コード (デフォルト: 1)
 */
export function exitWithError(message: string, exitCode: number = 1): never {
  console.error(`Error: ${message}`);
  process.exit(exitCode);
} 