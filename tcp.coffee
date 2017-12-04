net = require 'net'

module.exports =

  client: (config) ->
    port = config?.port ? 8125
    address = config?.address ? undefined

    tcpClient = net.connect port, address
    tcpClient.setEncoding 'utf8'

    send: (message, cb) ->
      tcpClient.write JSON.stringify message
    close: (cb) ->
      tcpClient.close()

  server: (config, cb) ->
    port = config?.port ? 8125
    address = config?.address ? undefined

    tcpServer = net.createServer (socket) ->
      socket.setEncoding 'utf8'
      socket.on 'error', (err) ->
        tcpServer.emit 'error', err
      socket.on 'data', (data) ->
        cb null, JSON.parse data

    tcpServer.on 'error', (err) -> cb err
    tcpServer.listen port, address
    close: (cb) -> tcpServer.close()
