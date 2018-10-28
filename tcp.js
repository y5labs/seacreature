const net = require('net')
const ndjson = require('ndjson')

module.exports = {
  client: (config) => {
    let port = 8125
    let address = null
    if (config != null) {
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
    }
    const tcpClient = net.connect(port, address)
    tcpClient.setEncoding('utf8')
    res = {
      emit: (e, cb) => {
        let data = JSON.stringify(e)
        data += '\n'
        tcpClient.write(data, (err) => {
          if (cb == null) return
          cb(err)
        })
      },
      copy: () => res,
      close: (cb) => tcpClient.close()
    }
    return res
  },
  server: (config, cb) => {
    const kids = []
    let port = 8125
    let address = null
    if (config != null) {
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
    }
    const tcpServer = net.createServer((socket) => {
      socket.setEncoding('utf8')
      socket = socket.pipe(ndjson.parse())
      socket.on('error', (err) => tcpServer.emit('error', err))
      socket.on('data', (e) => { for (let k of kids) k.emit(e) })
    })
    if (cb != null) tcpServer.on('error', cb)
    tcpServer.listen(port, address)
    res = (k) => {
      kids.push(k)
      return res
    }
    res.emit = (e) => { for (let k of kids) k.emit(e) }
    res.close = (cb) => tcpServer.close(cb)
    res.copy = () => res
    return res
  }
}
