const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const _set = new Map()
  const filter = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.filterbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    // console.log(
    //   '  link_multiple',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
    const indexdiff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!_set.has(key)) continue
      if (filter.has(key)) {
        filter.set(key, filter.get(key) + 1)
        continue
      }
      filter.set(key, 1)
      for (const index of _set.get(key).keys()) {
        const current = filterindex.get(index)
        if (current === 1) indexdiff.del.add(index)
        filterindex.set(index, current - 1)
      }
    }
    for (const key of put) {
      if (!_set.has(key) || !filter.has(key)) continue
      if (filter.get(key) > 1) {
        filter.set(key, filter.get(key) - 1)
        continue
      }
      filter.delete(key)
      for (const index of _set.get(key).keys()) {
        const current = filterindex.get(index)
        if (current === 0) {
          if (indexdiff.del.has(index))
            indexdiff.del.delete(index)
          else indexdiff.put.add(index)
        }
        filterindex.set(index, current + 1)
      }
    }
    await hub.emit('filter changed', {
      bitindex,
      put: Array.from(indexdiff.put),
      del: Array.from(indexdiff.del)
    })
  }
  api.lookup = key =>
    !_set.has(key) ? []
    : Array.from(
      _set.get(key).keys(),
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
  api.on = hub.on
  api.filter = filter
  api.batch = (dataindicies, put, del) => {
    // console.log(
    //   '  link_multiple',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
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
        if (!filter.has(key)) count++
        _set.get(key).delete(index)
      }
      if (count > 0) diff.del.push(index)
      filterindex.set(index, null)
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
        if (!filter.has(key)) count++
        if (!_set.has(key)) _set.set(key, new Set())
        _set.get(key).add(index)
      }
      if (count > 0) diff.put.push(index)
      filterindex.set(index, count)
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