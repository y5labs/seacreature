// Connections between two things, forward and back

const Hub = require('../lib/hub')

module.exports = (db, prefix = 'graph') => {
  const read = options =>
    new Promise((resolve, reject) => {
      const result = []
      db.createKeyStream(options || {
        gt: `${prefix}/\x00`,
        lt: `${prefix}/\xff`,
      })
        .on('data', key => { result.push(key) })
        .on('end', () => resolve(result))
    })

  const encode_forward = (child, parent) =>
    `${prefix}/→/${child}/${parent}`
  const encode_backward = (parent, child) =>
    `${prefix}/←/${parent}/${child}`
  const decode_forward = key => {
    const [prefix, literal, child, parent] = key.split('/')
    return { child, parent }
  }
  const decode_backward = key => {
    const [prefix, literal, parent, child] = key.split('/')
    return { parent, child }
  }

  const api = {
    open: () => db.open(),
    close: () => db.close(),
    put: (parent, child) => db.batch([
      { type: 'put', key: encode_forward(child, parent), value: true },
      { type: 'put', key: encode_backward(parent, child), value: true }
    ]),
    del: (parent, child) => db.batch([
      { type: 'del', key: encode_forward(child, parent) },
      { type: 'del', key: encode_backward(parent, child) }
    ]),
    batch: ({ put = [], del = [] }) => {
      const result = Hub()
      result.operations = []
      for (const o of put)
        result.operations.push(
          { type: 'put', key: encode_forward(o[0], o[1]), value: true},
          { type: 'put', key: encode_backward(o[1], o[0]), value: true })
      for (const o of del)
        result.operations.push(
          { type: 'del', key: encode_forward(o[0], o[1]), value: true },
          { type: 'del', key: encode_backward(o[1], o[0]), value: true })
      return result
    },
    parents: async child => (await read({
      gt: encode_forward(child, '\x00'),
      lt: encode_forward(child, '\xff')
    })).map(p => decode_forward(p).parent),
    children: async parent => (await read({
      gt: encode_backward(parent, '\x00'),
      lt: encode_backward(parent, '\xff')
    })).map(p => decode_backward(p).child)
  }
  return api
}
