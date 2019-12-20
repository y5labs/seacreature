const dgram = require('dgram')
const ndjson = require('../lib/ndjson')
const stream = require('stream')

module.exports = {
  client: (config) => {
    let port = 8125
    let address = null
    let version = 'udp4'
    if (config != null) {
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
      if (config.ipv6) version = 'udp6'
    }
    const udpClient = dgram.createSocket(version)
    const res = {
      emit: (message, cb) => {
        let data = JSON.stringify(message)
        data += '\n'
        udpClient.send(data, port, address, (err) => {
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
    let port = 8125
    let address = null
    let version = 'udp4'
    if (config != null) {
      if (config.port != null) port = config.port
      if (config.address != null) address = config.address
      if (config.ipv6) version = 'udp6'
    }
    const udpServer = dgram.createSocket(version)
    let socket = new stream.PassThrough()
    udpServer.on('message', (data, info) => {
      socket.write(data.toString('utf-8'))
    })
    socket = ndjson(socket)
    socket.on('error', (err) => { tcpServer.emit('error', err) })
    socket.on('data', (e) => { for (let k of kids) k.emit(e) })
    if (cb != null) {
      udpServer.on('error', (err) => {
        cb(err)
      })
    }
    udpServer.bind(port, address)
    const res = (k) => {
      kids.push(k)
      return res
    }
    res.emit = (e) => {
      for (let k of kids) k.emit(e)
    }
    res.close = (cb) => {
      udpServer.close(cb)
    }
    res.copy = () => res
    return res
  }
}
