net = require 'net'
ndjson = require 'ndjson'

module.exports =

  client: (config) ->
    port = config?.port ? 8125
    address = config?.address ? undefined

    tcpClient = net.connect port, address
    tcpClient.setEncoding 'utf8'

    res =
      emit: (e, cb) ->
        data = JSON.stringify e
        data += '\n'
        tcpClient.write data, (err) ->
          return if !cb?
          cb err
      copy: -> res
      close: (cb) -> tcpClient.close()
    res

  server: (config, cb) ->
    kids = []

    port = config?.port ? 8125
    address = config?.address ? undefined

    tcpServer = net.createServer (socket) ->
      socket.setEncoding 'utf8'
      socket = socket.pipe ndjson.parse()
      socket.on 'error', (err) ->
        tcpServer.emit 'error', err
      socket.on 'data', (e) ->
        k.emit e for k in kids

    if cb?
      tcpServer.on 'error', (err) -> cb err
    tcpServer.listen port, address

    res = (k) ->
      kids.push k
      res
    res.emit = (e) -> k.emit e for k in kids
    res.close = (cb) -> tcpServer.close cb
    res.copy = -> res
    res
