def process_query(query)
  puts "process #{query}"
end

def chat_loop
  puts 'MCP Client Started!'
  puts "Type your queries 'exit' to exit."

  loop do
    input = $stdin.gets.chomp
    break if input.downcase == 'exit'

    process_query(input)
  end
end

file_path = ARGV[0]

if file_path.nil?
  puts 'Please provide a server file path'
  exit
end

chat_loop
