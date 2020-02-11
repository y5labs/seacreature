const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const forward = new Map()
  const backward = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.filterbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    const diff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!forward.has(key)) continue
      const node = forward.get(key)
      // TODO remove
      node.count--
      for (const index of node.indicies.keys()) {
        const current = filterindex.get(index)
        if (current.count === 1) {
          diff.del.add(index)
        }
        current.count--
      }
    }
    for (const key of put) {
      if (!forward.has(key)) continue
      const node = forward.get(key)
      // TODO remove
      node.count++
      for (const index of node.indicies.keys()) {
        const current = filterindex.get(index)
        if (current.count === 0) {
          diff.del.delete(index)
          diff.put.add(index)
        }
        current.count++
      }
    }
    // console.log('link', cube.print(), api.source.print(), { put: put.map(i => api.source.id2d(i)), del: del.map(i => api.source.id2d(i)) }, {
    //   put: Array.from(diff.put),
    //   del: Array.from(diff.del)
    // })
    return {
      put: Array.from(diff.put),
      del: Array.from(diff.del)
    }
  }
  api.lookup = key =>
    !forward.has(key) ? []
    : Array.from(
      forward.get(key).indicies.keys(),
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
  api.bitindex = bitindex
  api.filterindex = filterindex
  api.map = map
  api.forward = forward
  api.backward = backward
  api.on = hub.on
  api.cube = cube
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
        const forwardnode = forward.get(key)
        forwardnode.delete(index)
      }
      if (count > 0) diff.del.push(index)
      filterindex.set(index, null)
    })
    put.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.put[i]
      if (!backward.has(index))
        backward.set(index, new Set())
      const backwardnode = backward.get(index)
      if (keys.length == 0) {
        nulls.add(index)
        if (shownulls) diff.put.push(index)
        return
      }
      let count = 0
      for (const key of keys) {
        backwardnode.add(key)
        if (!forward.has(key)) forward.set(key, {
          count: 0,
          indicies: new Set()
        })
        const forwardnode = forward.get(key)
        forwardnode.indicies.add(index)
        count++
      }
      // TODO Is this correct!?
      // if (count > 0) diff.put.push(index)
      filterindex.set(index, {
        count: 0,
        total: count
      })
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