const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const forward = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.filterbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    const diff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!forward.has(key)) continue
      const indicies = forward.get(key)
      for (const index of indicies.keys()) {
        const current = filterindex.get(index)
        if (current.count === 1) {
          diff.del.add(index)
        }
        current.count--
      }
    }
    for (const key of put) {
      if (!forward.has(key)) continue
      const indicies = forward.get(key)
      for (const index of indicies.keys()) {
        const current = filterindex.get(index)
        if (current.count === 0) {
          diff.del.delete(index)
          diff.put.add(index)
        }
        current.count++
      }
    }
    return {
      put: Array.from(diff.put),
      del: Array.from(diff.del)
    }
  }
  api.reset = () => {
    const result = new Set()
    for (const [key, indicies] of forward.entries()) {
      for (const index of indicies.keys()) {
        const current = filterindex.get(index)
        result.add(index)
        current.count = current.total
      }
    }
    return Array.from(result)
  }
  api.lookup = key =>
    !forward.has(key) ? []
    : Array.from(
      forward.get(key).keys(),
      i => cube.index.get(i))
  api.shownulls = async () => {
    if (shownulls) return
    shownulls = true
    await hub.emit('filter changed', {
      bitindex,
      del: [],
      put: Array.from(nulls.values())
    })
  }
  api.hidenulls = async () => {
    if (!shownulls) return
    shownulls = false
    await hub.emit('filter changed', {
      bitindex,
      del: Array.from(nulls.values()),
      put: []
    })
  }
  api.shownulls = () => shownulls
  api.bitindex = bitindex
  api.filterindex = filterindex
  api.map = map
  api.forward = forward
  api.on = hub.on
  api.cube = cube
  api.nulls = nulls
  api.batch = (dataindicies, put, del) => {
    filterindex.length(Math.max(...dataindicies.put) + 1)
    const diff = { put: [], del: [] }
    del.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.del[i]
      if (keys.length == 0) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
        return
      }
      let count = 0
      for (const key of keys) {
        const indicies = forward.get(key)
        indicies.delete(index)
      }
      if (count > 0) diff.del.push(index)
      filterindex.remove(index)
    })
    put.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.put[i]
      if (keys.length == 0) {
        nulls.add(index)
        if (shownulls) diff.put.push(index)
        return
      }
      let count = 0
      for (const key of keys) {
        if (!forward.has(key)) forward.set(key, new Set())
        const indicies = forward.get(key)
        indicies.add(index)
        count++
      }
      const node = filterindex.get(index) || {
        count: 0,
        total: 0
      }
      node.count += count
      node.total += count
      filterindex.set(index, node)
    })
    for (const i of diff.del)
      cube.filterbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.filterbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }
  return api
}