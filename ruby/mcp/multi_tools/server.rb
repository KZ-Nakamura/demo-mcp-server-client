require_relative '../server'

@server = MCP::Server.new

# サイコロツール
@server.register_tool(
  name: 'dice',
  description: 'サイコロを振る',
  input_schema: {
    type: 'object',
    properties: {
      sides: {
        type: 'integer',
        description: 'サイコロの面の数'
      }
    },
    required: ['sides']
  },
  handler: proc do |args|
    rand(1..args['sides'])
  end
)

# 時刻ツール
@server.register_tool(
  name: 'current_time',
  description: '現在の時刻を取得する',
  input_schema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        description: '時刻のフォーマット（iso, readable, unix）',
        enum: ['iso', 'readable', 'unix']
      }
    }
  },
  handler: proc do |args|
    format = args['format'] || 'readable'
    
    case format
    when 'iso'
      Time.now.iso8601
    when 'unix'
      Time.now.to_i
    else # readable
      Time.now.strftime('%Y年%m月%d日 %H時%M分%S秒')
    end
  end
)

# 天気ツール（ダミー）
@server.register_tool(
  name: 'weather',
  description: '指定した都市の天気を取得する（デモ用）',
  input_schema: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: '都市名'
      }
    },
    required: ['city']
  },
  handler: proc do |args|
    # 実際のAPIは使わずダミーデータを返す
    cities = {
      '東京' => '晴れ',
      '大阪' => '曇り',
      '福岡' => '雨',
      '札幌' => '雪'
    }
    
    cities[args['city']] || '天気情報がありません'
  end
)

@server.run

puts "※デバッグログは logs/mcp_YYYYMMDD_HHMMSS.log に保存されています" 