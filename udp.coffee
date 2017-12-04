dgram = require 'dgram'

module.exports =

  client: (config) ->
    version = if config?.ipv6 then 'udp6' else 'udp4'
    port = config?.port ? 8125
    address = config?.address ? undefined

    udpClient = dgram.createSocket version
    send: (message, cb) ->
      data = JSON.stringify message
      udpClient.send data, port, address, (err) -> cb
    close: (cb) -> udpClient.close cb

  server: (config, cb) ->
    version = if config?.ipv6 then 'udp6' else 'udp4'
    port = config?.port ? 8125
    address = config?.address ? undefined

    udpServer = dgram.createSocket version
    udpServer.on 'message', (data, info) ->
      message = JSON.parse data.toString()
      cb null, message, info
    udpServer.on 'error', (err) -> cb err
    udpServer.bind port, address
    close: (cb) -> udpServer.close cb
