require 'socket' # Provides TCPServer and TCPSocket classes

# Initialize a TCPServer object that will listen
server = TCPServer.new 9000

while (client = server.accept)
  request = client.gets
  #p request
  response = ""
  if request.nil?
    client.print "HTTP/1.1 200 OK\r\n" +
               "Content-Type: application/octet-stream\r\n" +
               "Content-Length: #{response.bytesize}\r\n" +
               "Connection: keep-alive\r\n\r\n" + response
    client.close
    next
  end
  # valid http request
  method, full_path = request.split(' ')
  path, query = full_path.split('?')

  headers = {}
  request = client.gets
  while request != "\r\n" and line = request.split(':') # Collect HTTP headers
    #p request
    headers[line[0].strip] = line[1].strip
    request = client.gets
  end

  rid = headers["X-Fc-Request-Id"]
  p "FC Invoke Start RequestId: " + rid
  # p request # "\r\n"
  data = "" # read body
  cnt = 0
  if headers["Transfer-Encoding"] == "chunked"
    while request = client.gets
      if cnt % 2 == 1
        data += request.chop!
      end
      if request == "0\r\n"
        #p request
        #p client.gets   # end with 0\r\n   \r\n
        client.gets
        break
      end
      cnt = cnt + 1
    end
  else
    data = client.read(headers["Content-Length"].to_i) 
  end
  
  # p headers
  p data

  # do your things here
  # ...

  response = data

  p "FC Invoke End RequestId: " + rid

  client.print "HTTP/1.1 200 OK\r\n" +
               "Content-Type: application/octet-stream\r\n" +
               "Content-Length: #{response.bytesize}\r\n" +
               "Connection: keep-alive\r\n\r\n" + response
  client.close
end