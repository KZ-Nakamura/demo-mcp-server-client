require 'optparse'
require 'dotenv'
require_relative 'mcp/host'

# 環境変数をロード
Dotenv.load

def parse_options
  options = {}
  
  opt_parser = OptionParser.new do |opts|
    opts.banner = "使用法: ruby main.rb [options]"
    opts.separator ""
    opts.separator "オプション:"
    
    opts.on("-p", "--provider PROVIDER", "使用するLLMプロバイダー (anthropic または openai)") do |provider|
      options[:provider] = provider
    end
    
    opts.on("-m", "--model MODEL", "使用するモデル名") do |model|
      options[:model] = model
    end
    
    opts.on("-h", "--help", "ヘルプを表示") do
      puts opts
      exit
    end
  end
  
  opt_parser.parse!
  options
end

def main
  options = parse_options
  provider = options[:provider]
  model_options = {}
  model_options[:model] = options[:model] if options[:model]
  
  host = MCP::Host.new(provider, model_options)
  host.connect_to_server
  host.chat_loop
ensure
  host&.client&.close
end

main
