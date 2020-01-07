const pump = require('../lib/pump')
const Hub = require('../lib/hub')

const pad_timestamp = ts => ts.toString().padStart(13, '0')

// Timeseries database uses ts + id as keys
// const ts = (new Date()).valueOf()
// const id = require('uuid/v4')()
module.exports = (db, prefix = 'timeseries') => {
  const encode_key = (ts, id) => `${prefix}/${pad_timestamp(ts)}/${id}`
  const decode_key = key => {
    const [prefix, ts, id] = key.split('/')
    return { ts: parseInt(ts), id }
  }
  const encode_value = value => JSON.stringify(value)
  const decode_value = value => JSON.parse(value)
  const encode_options = options => ({
    ...options,
    ...{
      gt: options && options.gt ? encode_key(options.gt, '\x00') : `${prefix}/\x00`,
      lt: options && options.lt ? encode_key(options.lt, '\xff') : `${prefix}/\xff`,
    }
  })
  return {
    open: () => db.open(),
    close: () => db.close(),
    put: (ts, id, value) => db.put(encode_key(ts, id), encode_value(value)),
    get: (ts, id) => db.get(encode_key(ts, id)).then(decode_value),
    del: (ts, id) => db.del(encode_key(ts, id)),
    batch: ops => {
      const result = Hub()
      result.operations = ops.map(o => ({
        type: o.type,
        key: encode_key(o.ts, o.id),
        value: o.value ? encode_value(o.value) : undefined
      }))
      return result
    },
    isOpen: () => db.isOpen(),
    isClosed: () => db.isClosed(),
    createReadStream: options =>
      pump(db.createReadStream(encode_options(options)),
        (kv) => ({...decode_key(kv.key), value: decode_value(kv.value)})),
    createKeyStream: options =>
      pump(db.createKeyStream(encode_options(options)),
        (key) => decode_key(key)),
    createValueStream: options =>
      pump(db.createValueStream(encode_options(options)),
        (value) => decode_value(value))
  }
}
