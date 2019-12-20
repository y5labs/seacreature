const readline = require('readline')
const EventEmitter = require('events')

module.exports = (_stream) => {
  const result = new EventEmitter()
  const stream = readline.createInterface({
    input: _stream,
    terminal: false
  })
  stream.on('line', line => {
    try { result.emit('data', JSON.parse(line)) }
    catch (e) { result.emit(e) }
  })
  stream.on('error', e => result.emit('error', e))
  stream.on('close', () => result.emit('close'))
  return result
}