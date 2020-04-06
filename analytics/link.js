const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (source, target, map) => {
  const hub = Hub()

  const forward = new Map()
  const backward = new Map()

  let forward_shownulls = true
  const forward_nulls = new Set()
  const forward_bitindex = target.filterbits.add()
  const forward_filterindex = new SparseArray()

  const forward_api = async ({ put = [], del = [] }) => {
    // console.log(source.print(), target.print(), put, del)
    const diff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!forward.has(key)) continue
      const indicies = forward.get(key)
      for (const index of indicies.keys()) {
        const current = forward_filterindex.get(index)
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
        const current = forward_filterindex.get(index)
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
  forward_api.reset = () => {
    const result = new Set()
    for (const [key, indicies] of forward.entries()) {
      for (const index of indicies.keys()) {
        const current = forward_filterindex.get(index)
        result.add(index)
        current.count = current.total
      }
    }
    return Array.from(result)
  }
  forward_api.lookup = key =>
    !forward.has(key) ? []
    : Array.from(
      forward.get(key).keys(),
      i => target.index.get(i))
  forward_api.shownulls = async () => {
    if (forward_shownulls) return
    forward_shownulls = true
    await hub.emit('filter changed', {
      bitindex: forward_bitindex,
      del: [],
      put: Array.from(forward_nulls.values())
    })
  }
  forward_api.hidenulls = async () => {
    if (!forward_shownulls) return
    forward_shownulls = false
    await hub.emit('filter changed', {
      bitindex: forward_bitindex,
      del: Array.from(forward_nulls.values()),
      put: []
    })
  }
  forward_api.bitindex = forward_bitindex
  forward_api.filterindex = forward_filterindex
  forward_api.map = map
  forward_api.forward = forward
  forward_api.backward = backward
  forward_api.on = hub.on
  forward_api.cube = target
  forward_api.source = source
  forward_api.batch = (dataindicies, put, del) => {
    forward_filterindex.length(Math.max(...dataindicies.put) + 1)
    const diff = { put: [], del: [] }
    del.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.del[i]
      if (keys.length == 0) {
        forward_nulls.delete(index)
        if (forward_shownulls) diff.del.push(index)
        return
      }
      let count = 0
      for (const key of keys) {
        const indicies = forward.get(key)
        indicies.delete(index)
      }
      if (count > 0) diff.del.push(index)
      forward_filterindex.set(index, null)
    })
    put.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.put[i]
      if (!backward.has(index))
        backward.set(index, new Set())
      const backwardnode = backward.get(index)
      if (keys.length == 0) {
        forward_nulls.add(index)
        if (forward_shownulls) diff.put.push(index)
        return
      }
      let count = 0
      for (const key of keys) {
        backwardnode.add(key)
        if (!forward.has(key)) forward.set(key, new Set())
        const indicies = forward.get(key)
        indicies.add(index)
        count++
      }
      forward_filterindex.set(index, {
        count: 0,
        total: count
      })
    })
    for (const i of diff.del)
      target.filterbits[forward_bitindex.offset][i] |= forward_bitindex.one
    for (const i of diff.put)
      target.filterbits[forward_bitindex.offset][i] &= ~forward_bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }

  source.forward.set(target, forward_api)
  target.backward.set(source, forward_api)
  target.dimensions.push(forward_api)

  return forward_api
}