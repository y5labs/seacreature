const pump = require('../lib/pump')
const Hub = require('../lib/hub')

// Prefix database with combined batch format
module.exports = (db, prefix = 'prefix') => {
  const encode_key = (key) => `${prefix}/${key}`
  const decode_key = key => key.split('/')[1]
  const encode_value = value => JSON.stringify(value)
  const decode_value = value => JSON.parse(value)
  const encode_options = options => ({
    ...options,
    ...{
      gt: options && options.gt
        ? encode_key(options.gt)
        : encode_key('\x00'),
      lt: options && options.lt
        ? encode_key(options.lt)
        : encode_key('\xff'),
    }
  })
  return {
    open: () => db.open(),
    close: () => db.close(),
    put: (key, value) => db.put(encode_key(key), encode_value(value)),
    get: (key) => db.get(encode_key(key)).then(decode_value),
    del: (key) => db.del(encode_key(key)),
    batch: ops => {
      const result = Hub()
      result.operations = ops.map(o => ({
        type: o.type,
        key: encode_key(o.key),
        value: o.value ? encode_value(o.value) : undefined
      }))
      return result
    },
    isOpen: () => db.isOpen(),
    isClosed: () => db.isClosed(),
    createReadStream: options =>
      pump(db.createReadStream(encode_options(options)),
        (kv) => ({
          key: decode_key(kv.key),
          value: decode_value(kv.value)})),
    createKeyStream: options =>
      pump(db.createKeyStream(encode_options(options)),
        (key) => decode_key(key)),
    createValueStream: options =>
      pump(db.createValueStream(encode_options(options)),
        (value) => decode_value(value))
  }
}