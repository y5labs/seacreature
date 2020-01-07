const Hub = require('../lib/hub')

const visit = (object, path, fn) => {
  const length = path.length
  const lastIndex = length - 1
  let index = -1

  while (object != null && ++index < length) {
    const key = path[index]
    if (index == lastIndex) return fn(object, key)
    if (object[key] === undefined) object[key] = {}
    object = object[key]
  }
}

const set = (object, path, value) =>
  visit(object, path, (object, key) =>
    object[key] = value)

const del = (object, path) =>
  visit(object, path, (object, key) => {
    if (object[key] === undefined) return null
    const res = object[key]
    delete object[key]
    return res
  })

const decode_forward = key => {
  const [prefix, literal, child, parent] = key.split('/')
  return { child, parent }
}
const decode_backward = key => {
  const [prefix, literal, parent, child] = key.split('/')
  return { parent, child }
}

const uuid_first = '\x00'.repeat(22)
const uuid_last = '\xff'.repeat(22)

// A directed acylcic graph (DAG)
module.exports = (db, prefix = 'graph') => {
  const encode_forward = (child, parent) => `${prefix}/forward/${child}/${parent}`
  const encode_backward = (parent, child) => `${prefix}/backward/${parent}/${child}`
  const forward_first = encode_forward(uuid_first, uuid_first)
  const forward_last = encode_forward(uuid_last, uuid_last)
  const backward_first = encode_backward(uuid_first, uuid_first)
  const backward_last = encode_backward(uuid_last, uuid_last)

  const _forward = {}
  const _backward = {}
  const _open = db.open().then(() => Promise.all([
    new Promise((resolve, reject) => db.createKeyStream({
        gt: forward_first,
        lt: forward_last
      })
      .on('data', (key) => {
        const { child, parent } = decode_forward(key)
        set(_forward, [child, parent], true)
      })
      .on('end', resolve)),
    new Promise((resolve, reject) => db.createKeyStream({
        gt: backward_first,
        lt: backward_last
      })
      .on('data', (key) => {
        const { parent, child } = decode_backward(key)
        set(_backward, [parent, child], true)
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
      set(_forward, [child, parent], true)
      set(_backward, [parent, child], true)
    },
    del: async (parent, child) => {
      await db.batch([
        { type: 'del', key: encode_forward(child, parent) },
        { type: 'del', key: encode_backward(parent, child) }
      ])
      del(_forward, [child, parent])
      del(_backward, [parent, child])
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
            set(_forward, [op.child, op.parent], true)
            set(_backward, [op.parent, op.child], true)
          }
          else if (op.type == 'del') {
            del(_forward, [op.child, op.parent])
            del(_backward, [op.parent, op.child])
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
