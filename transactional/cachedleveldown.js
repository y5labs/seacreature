const Hub = require('../lib/hub')

module.exports = (db) => {
  const _cache = {}
  return {
    open: () => db.open()
      .then(() => new Promise((resolve, reject) =>
        db.createReadStream()
          .on('data', (kv) => _cache[kv.key] = kv.value)
          .on('end', () => resolve()))),
    close: () => db.close(),
    get: (key) => _cache[key],
    put: (key, value) => db.put(key, value).then(() => _cache[key] = value),
    del: (key) => db.del(key).then(() => delete _cache[key]),
    batch: (operations) => {
      const ops = db.batch(operations)
      const result = Hub()
      result.operations = ops.operations
      result.on('commit', () => {
        for (const op of operations) {
          if (op.type == 'put') _cache[op.key] = op.value
          else if (op.type == 'del') delete _cache[op.key]
        }
        return ops.emit('commit')
      })
      return result
    },
    isOpen: () => db.isOpen(),
    isClosed: () => db.isClosed(),
    createReadStream: options => db.createReadStream(options),
    createKeyStream: options => db.createKeyStream(options),
    createValueStream: options => db.createValueStream(options)
  }
}
