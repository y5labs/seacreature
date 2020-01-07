// This datastructure pre-computes all parent, grandparent, nth ancestor and descendants. Modifications are processed as a diff so they can be used to update other datasets.

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

const get = (object, path) =>
  visit(object, path, (object, key) =>
    Object.keys(object[key] || {}))

const test = (object, path) =>
  visit(object, path, (object, key) =>
    object[key])

const add = (object, path, value) =>
  visit(object, path, (object, key) =>
    object[key] = value)

const remove = (object, path) =>
  visit(object, path, (object, key) => {
    if (object[key] === undefined) return null
    const res = object[key]
    delete object[key]
    return res
  })

const clean = object => {
  for (const key of Object.keys(object)) {
    if (typeof object[key] !== 'object') continue
    clean(object[key])
    if (Object.keys(object[key]).length == 0)
      delete object[key]
  }
}

// Pass through an array of from -> to for pre-populating the structure rather than iterating on each addition.
module.exports = (dataset = []) => {
  const _forward = {}
  const _backward = {}

  for (const d of dataset) {
    add(_forward, [0, d[0], d[1]], true)
    add(_backward, [0, d[1], d[0]], true)
  }

  for (let depth = 0; depth == 0 || _forward[depth - 1]; depth++)
    for (const p of get(_forward, [depth]))
      for (const from of get(_backward, [0, p]))
        for (const to of get(_forward, [depth, p])) {
          add(_forward, [depth + 1, from, to], true)
          add(_backward, [depth + 1, to, from], true)
        }

  return {
    _forward,
    _backward,
    // Apply a collection of additions and deletions to the dataset
    apply: ({ put = [], del = [] }) => {
      for (const o of put) {
        add(_forward, [o[0], o[1], o[2]], true)
        add(_backward, [o[0], o[2], o[1]], true)
      }
      for (const o of del) {
        remove(_forward, [o[0], o[1], o[2]], true)
        remove(_backward, [o[0], o[2], o[1]], true)
      }
      clean(_forward)
      clean(_backward)
    },
    // generate an array of removals based on removing a single relationship
    del: (from, to) => {
      if (!test(_forward, [0, from, to])) return []
      const ancestors = [[0, to]].concat(
        Object.keys(_forward).map(Number)
        .map(depth => get(_forward, [depth, to])
          .map(d => [depth + 1, d])).flat())
      const descendants = [[0, from]].concat(
        Object.keys(_backward).map(Number)
        .map(depth => get(_backward, [depth, from])
          .map(d => [depth + 1, d])).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    // generate an array of additions based on adding a single relationship
    put: (from, to) => {
      if (test(_forward, [0, from, to])) return []
      const ancestors = [[0, to]].concat(
        Object.keys(_forward).map(Number)
        .map(depth => get(_forward, [depth, to])
          .map(d => [depth + 1, d])).flat())
      const descendants = [[0, from]].concat(
        Object.keys(_backward).map(Number)
        .map(depth => get(_backward, [depth, from])
          .map(d => [depth + 1, d])).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    ancestors: (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = Object.keys(_forward)
      for (const depth of depths)
        for (const n of nodes)
          for (const d of get(_forward, [depth, n]))
            result[d] = true
      return Object.keys(result)
    },
    descendants: (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = Object.keys(_forward)
      for (const depth of depths)
        for (const n of nodes)
          for (const d of get(_backward, [depth, n]))
            result[d] = true
      return Object.keys(result)
    }
  }
}
