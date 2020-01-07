const Stream = require('stream')

module.exports = (stream, transform) => {
  const result = new Stream
  result.readable = true
  result.destroy = () => stream.destroy()
  result.close = () => stream.close()
  result.end = () => stream.end()
  stream
    .on('data', (data) => result.emit('data', transform(data)))
    .on('error', (err) => result.emit('error', err))
    .on('close', () => result.emit('close'))
    .on('end', () => result.emit('end'))
  return result
}
