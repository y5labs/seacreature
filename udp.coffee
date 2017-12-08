dgram = require 'dgram'
ndjson = require 'ndjson'
stream = require 'stream'

module.exports =

  client: (config) ->
    version = if config?.ipv6 then 'udp6' else 'udp4'
    port = config?.port ? 8125
    address = config?.address ? undefined

    udpClient = dgram.createSocket version

    res =
      emit: (message, cb) ->
        data = JSON.stringify message
        data += '\n'
        udpClient.send data, port, address, (err) ->
          return if !cb?
          cb err
      copy: -> res
      close: (cb) -> tcpClient.close()
    res

  server: (config, cb) ->
    kids = []

    version = if config?.ipv6 then 'udp6' else 'udp4'
    port = config?.port ? 8125
    address = config?.address ? undefined

    udpServer = dgram.createSocket version
    socket = new stream.PassThrough()
    udpServer.on 'message', (data, info) ->
      socket.write data.toString 'utf-8'
    socket = socket.pipe ndjson.parse()
    socket.on 'error', (err) ->
      tcpServer.emit 'error', err
    socket.on 'data', (e) ->
      k.emit e for k in kids

    if cb?
      udpServer.on 'error', (err) -> cb err
    udpServer.bind port, address

    res = (k) ->
      kids.push k
      res
    res.emit = (e) -> k.emit e for k in kids
    res.close = (cb) -> udpServer.close cb
    res.copy = -> res
    res
