fs = require 'fs'
net = require 'net'
tls = require 'tls'

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

    send: (message, cb) ->
      tlsClient.write JSON.stringify message
    close: (cb) ->
      tlsClient.close()

  server: (config, cb) ->
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
      socket.on 'error', (err) ->
        tlsServer.emit 'error', err
      socket.on 'data', (data) ->
        cb null, JSON.parse data

    tlsServer.on 'error', (err) -> cb err
    tlsServer.listen port, address
    close: (cb) -> tlsServer.close()
