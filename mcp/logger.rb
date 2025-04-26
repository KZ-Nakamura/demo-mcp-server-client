module MCP
  class Logger
    def initialize(file_path)
      @file_path = file_path
      @f = File.open(@file_path, 'a')
    end

    def info(message)
      @f.puts(message)
    end
  end
end
