const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const _set = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.linkbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    console.log(
      '    link_single',
      put.length.toString().padStart(5, ' ') + ' ↑',
      del.length.toString().padStart(5, ' ') + ' ↓   ',
      map.toString()
    )
    const indexdiff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!_set.has(key)) continue
      for (const index of _set.get(key).keys()) {
        const current = filterindex.get(index)
        indexdiff.del.add(index)
        console.log(cube.print(), '-', key, '=>', cube.i2id(index))
        filterindex.set(index, current - 1)
      }
    }
    for (const key of put) {
      if (!_set.has(key)) continue
      for (const index of _set.get(key).keys()) {
        const current = filterindex.get(index)
        indexdiff.put.add(index)
        console.log(cube.print(), '+', key, '=>', cube.i2id(index))
        filterindex.set(index, current + 1)
      }
    }
    await hub.emit('link changed', {
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
    await hub.emit('link changed', {
      bitindex,
      del: [],
      put: Array.from(nulls.values())
    })
  }
  api.hidenulls = async () => {
    if (!shownulls) return
    shownulls = false
    await hub.emit('link changed', {
      bitindex,
      del: Array.from(nulls.values()),
      put: []
    })
  }
  api.bitindex = bitindex
  api.filterindex = filterindex
  api.map = map
  api.set = _set
  api.on = hub.on
  api.batch = (dataindicies, put, del) => {
    // console.log(
    //   '    link_single',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
    const diff = { put: [], del: [] }
    del.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.del[i]
      if (key == null || key == undefined) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
        return
      }
      _set.get(key).delete(index)
      diff.del.push(index)
      filterindex.set(index, null)
    })
    put.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.put[i]
      if (key == null || key == undefined) {
        nulls.add(index)
        if (shownulls) diff.put.push(index)
        return
      }
      if (!_set.has(key)) _set.set(key, new Set())
      _set.get(key).add(index)
      diff.put.push(index)
      filterindex.set(index, 0)
      console.log(cube.print(), '+', key, '=>', cube.i2id(index))
    })
    for (const i of diff.del)
      cube.linkbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.linkbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    // hub.emit('link changed', linkdiff)
    return diff
  }
  return api
}