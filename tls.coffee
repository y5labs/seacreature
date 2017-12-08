fs = require 'fs'
net = require 'net'
tls = require 'tls'
ndjson = require 'ndjson'

getcert = (pathname) ->
  if pathname instanceof Array
    getcert path for path in pathname
  else if fs.existsSync pathname
    fs.readFileSync pathname, 'utf8'

module.exports =

  client: (config) ->
    certificates = {}
    certificates.ca = [getcert config.ca] if config.ca?
    certificates

    port = config?.port ? 8126
    address = config?.address ? undefined

    tlsClient = tls.connect port, address, certificates
    tlsClient.setEncoding 'utf8'

    res =
      emit: (e, cb) ->
        data = JSON.stringify e
        data += '\n'
        tlsClient.write data, (err) ->
          return if !cb?
          cb err
      copy: -> res
      close: (cb) -> tcpClient.close()
    res

  server: (config, cb) ->
    kids = []

    certificates =
      key: getcert config.key
      cert: getcert config.cert
      rejectUnauthorized: yes
    certificates.ca = [getcert config.ca] if config.ca?
    certificates

    port = config?.port ? 8126
    address = config?.address ? undefined

    tlsServer = tls.createServer certificates, (socket) ->
      socket.setEncoding 'utf8'
      socket = socket.pipe ndjson.parse()
      socket.on 'error', (err) ->
        tlsServer.emit 'error', err
      socket.on 'data', (e) ->
        k.emit e for k in kids

    if cb?
      tlsServer.on 'error', (err) -> cb err
    tlsServer.listen port, address

    res = (k) ->
      kids.push k
      res
    res.emit = (e) -> k.emit e for k in kids
    res.close = (cb) -> tlsServer.close cb
    res.copy = -> res
    res
