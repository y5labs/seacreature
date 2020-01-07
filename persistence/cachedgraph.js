// A directed acylcic graph (DAG) that is cached

const Hub = require('../lib/hub')
const pathie = require('../lib/pathie')

module.exports = (db, prefix = 'graph') => {
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

  const _forward = {}
  const _backward = {}
  const _open = db.open().then(() => Promise.all([
    new Promise((resolve, reject) => db.createKeyStream({
        gt: `${prefix}/→/\x00`,
        lt: `${prefix}/→/\xff`
      })
      .on('data', (key) => {
        const { child, parent } = decode_forward(key)
        pathie.set(_forward, [child, parent], true)
      })
      .on('end', resolve)),
    new Promise((resolve, reject) => db.createKeyStream({
        gt: `${prefix}/←/\x00`,
        lt: `${prefix}/←/\xff`
      })
      .on('data', (key) => {
        const { parent, child } = decode_backward(key)
        pathie.set(_backward, [parent, child], true)
      })
      .on('end', resolve))
  ]))
  const api = {
    open: () => _open,
    close: () => db.close(),
    put: async (parent, child) => {
      await db.batch([
        { type: 'put', key: encode_forward(child, parent), value: true },
        { type: 'put', key: encode_backward(parent, child), value: true }
      ])
      pathie.set(_forward, [child, parent], true)
      pathie.set(_backward, [parent, child], true)
    },
    del: async (parent, child) => {
      await db.batch([
        { type: 'del', key: encode_forward(child, parent) },
        { type: 'del', key: encode_backward(parent, child) }
      ])
      pathie.del(_forward, [child, parent])
      pathie.del(_backward, [parent, child])
    },
    batch: (operations) => {
      const ops = []
      for (const op of operations) {
        ops.push({
          type: op.type, key: encode_forward(op.child, op.parent),
          value: op.type == 'put' || undefined })
        ops.push({
          type: 'put', key: encode_backward(op.parent, op.child),
          value: op.type == 'put' || undefined })
      }
      const result = Hub()
      result.operations = ops
      result.on('commit', () => {
        for (const op of operations) {
          if (op.type == 'put') {
            pathie.set(_forward, [op.child, op.parent], true)
            pathie.set(_backward, [op.parent, op.child], true)
          }
          else if (op.type == 'del') {
            pathie.del(_forward, [op.child, op.parent])
            pathie.del(_backward, [op.parent, op.child])
          }
        }
        return Promise.resolve()
      })
      return result
    },
    isOpen: () => db.isOpen(),
    isClosed: () => db.isClosed(),
    parents: (child) => {
      if (!_forward[child]) return []
      return Object.keys(_forward[child])
    },
    hasancestor: (child, ancestor) => {
      if (!_forward[child]) return false
      for (let p of Object.keys(_forward[child])) {
        if (p == ancestor) return true
        if (api.hasancestor(p, ancestor)) return true
      }
      return false
    },
    ancestors: (child) => {
      let current = []
      let processing = [child]
      let ancestors = []
      while (processing.length > 0) {
        ancestors = ancestors.concat(current)
        current = []
        for (let check of processing)
          current = current.concat(api.parents(check))
        processing = current
      }
      return ancestors
    },
    children: (parent) => {
      if (!_backward[parent]) return []
      return Object.keys(_backward[parent])
    },
    hasdescendant: (parent, descendant) => {
      if (!_backward[parent]) return false
      for (let c of Object.keys(_backward[parent])) {
        if (c == descendant) return true
        if (api.hasdescendant(c, descendant)) return true
      }
      return false
    },
    descendants: (parent) => {
      let current = []
      let processing = [parent]
      let descendants = []
      while (processing.length > 0) {
        descendants = descendants.concat(current)
        current = []
        for (let check of processing)
          current = current.concat(api.children(check))
        processing = current
      }
      return descendants
    }
  }
  return api
}
