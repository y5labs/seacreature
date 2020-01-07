// This datastructure pre-computes all parent, grandparent, nth ancestor and descendants. Modifications are processed as a diff so they can be used to update other datasets.

const pathie = require('../lib/pathie')

// Pass through an array of from -> to for pre-populating the structure rather than iterating on each addition.
module.exports = (dataset = []) => {
  const _forward = {}
  const _backward = {}

  for (const d of dataset) {
    pathie.set(_forward, [0, d[0], d[1]], true)
    pathie.set(_backward, [0, d[1], d[0]], true)
  }

  for (let depth = 0; depth == 0 || _forward[depth - 1]; depth++)
    for (const p of pathie.get(_forward, [depth]))
      for (const from of pathie.get(_backward, [0, p]))
        for (const to of pathie.get(_forward, [depth, p])) {
          pathie.set(_forward, [depth + 1, from, to], true)
          pathie.set(_backward, [depth + 1, to, from], true)
        }

  return {
    _forward,
    _backward,
    // Apply a collection of additions and deletions to the dataset
    apply: ({ put = [], del = [] }) => {
      for (const o of put) {
        pathie.set(_forward, [o[0], o[1], o[2]], true)
        pathie.set(_backward, [o[0], o[2], o[1]], true)
      }
      for (const o of del) {
        remove(_forward, [o[0], o[1], o[2]], true)
        remove(_backward, [o[0], o[2], o[1]], true)
      }
      pathie.clean(_forward)
      pathie.clean(_backward)
    },
    // generate an array of removals based on removing a single relationship
    del: (from, to) => {
      if (!pathie.test(_forward, [0, from, to])) return []
      const ancestors = [[0, to]].concat(
        Object.keys(_forward).map(Number)
        .map(depth => pathie.get(_forward, [depth, to])
          .map(d => [depth + 1, d])).flat())
      const descendants = [[0, from]].concat(
        Object.keys(_backward).map(Number)
        .map(depth => pathie.get(_backward, [depth, from])
          .map(d => [depth + 1, d])).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    // generate an array of additions based on adding a single relationship
    put: (from, to) => {
      if (pathie.test(_forward, [0, from, to])) return []
      const ancestors = [[0, to]].concat(
        Object.keys(_forward).map(Number)
        .map(depth => pathie.get(_forward, [depth, to])
          .map(d => [depth + 1, d])).flat())
      const descendants = [[0, from]].concat(
        Object.keys(_backward).map(Number)
        .map(depth => pathie.get(_backward, [depth, from])
          .map(d => [depth + 1, d])).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    ancestors: (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = Object.keys(_forward)
      for (const depth of depths)
        for (const n of nodes)
          for (const d of pathie.get(_forward, [depth, n]))
            result[d] = true
      return Object.keys(result)
    },
    descendants: (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = Object.keys(_forward)
      for (const depth of depths)
        for (const n of nodes)
          for (const d of pathie.get(_backward, [depth, n]))
            result[d] = true
      return Object.keys(result)
    }
  }
}
