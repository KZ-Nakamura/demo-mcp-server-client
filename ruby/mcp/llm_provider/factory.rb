require_relative 'anthropic'
require_relative 'openai'

module MCP
  module LLMProvider
    class Factory
      # 指定されたプロバイダー名に基づいてLLMプロバイダーのインスタンスを作成
      # @param provider_name [String] プロバイダー名 ('anthropic' または 'openai')
      # @param options [Hash] プロバイダーに渡すオプション
      # @return [MCP::LLMProvider::Base] LLMプロバイダーのインスタンス
      def self.create(provider_name = nil, options = {})
        provider_name ||= ENV.fetch('LLM_PROVIDER', 'anthropic')
        
        case provider_name.to_s.downcase
        when 'anthropic'
          MCP::LLMProvider::Anthropic.new(options)
        when 'openai'
          MCP::LLMProvider::OpenAI.new(options)
        else
          raise ArgumentError, "Unknown LLM provider: #{provider_name}"
        end
      end
    end
  end
end 