const fs = require('fs')
const net = require('net')
const tls = require('tls')
const ndjson = require('ndjson')

getcert = (pathname) => {
  if (pathname instanceof Array)
    return pathname.map((path) => getcert(path))
  else if (fs.existsSync(pathname))
    return fs.readFileSync(pathname, 'utf8')
  else
    return null
}

module.exports = {
  client: (config) => {
    const certificates = {}
    let port = 8125
    let address = null
    if (config != null) {
      if (config.ca != null) certificates.ca = [getcert(config.ca)]
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
    }
    const tlsClient = tls.connect(port, address, certificates)
    tlsClient.setEncoding('utf8')
    const res = {
      emit: (e, cb) => {
        let data = JSON.stringify(e)
        data += '\n'
        tlsClient.write(data, (err) => {
          if (cb == null) return
          cb(err)
        })
      },
      copy: () => res,
      close: (cb) => {
        tcpClient.close()
      }
    }
    return res
  },
  server: (config, cb) => {
    const kids = []
    const certificates = {
      rejectUnauthorized: true
    }
    let port = 8125
    let address = null
    if (config != null) {
      if (config.ca != null) certificates.ca = [getcert(config.ca)]
      if (config.key != null) certificates.key = getcert(config.key)
      if (config.cert != null) certificates.cert = getcert(config.cert)
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
    }
    const tlsServer = tls.createServer(certificates, (socket) => {
      socket.setEncoding('utf8')
      socket = socket.pipe(ndjson.parse())
      socket.on('error', (err) => {
        tlsServer.emit('error', err)
      })
      socket.on('data', (e) => {
        for (let k of kids) k.emit(e)
      })
    })
    if (cb != null) {
      tlsServer.on('error', (err) => {
        cb(err)
      })
    }
    tlsServer.listen(port, address)
    const res = (k) => {
      kids.push(k)
      return res
    }
    res.emit = (e) => {
      for (let k of kids) k.emit(e)
    }
    res.close = (cb) => {
      tlsServer.close(cb)
    }
    res.copy = () => res
    return res
  }
}
