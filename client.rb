#! /usr/bin/env ruby

file_path = ARGV[0]

if file_path.nil?
  puts 'Please provide a server file path'
  exit
end

puts "executing #{file_path}"
