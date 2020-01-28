const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const _set = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.filterbits.add()

  const api = async ({ put = [], del = [] }) => {
    console.log(
      '    link_single',
      put.length.toString().padStart(5, ' ') + ' ↑',
      del.length.toString().padStart(5, ' ') + ' ↓   ',
      map.toString()
    )
    const linkdiff = { put: [], del: [] }
    for (const key of del) {
      if (!_set.has(key)) continue
      for (const index of _set.get(key).keys()) {
        linkdiff.del.push(index)
        console.log(cube.print(), '-', key, '=>', cube.i2id(index))
      }
    }
    for (const key of put) {
      for (const index of _set.get(key).keys()) {
        linkdiff.put.push(index)
        console.log(cube.print(), '+', key, '=>', cube.i2id(index))
      }
    }
    await hub.emit('link changed', linkdiff)
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
  api.map = map
  api.on = hub.on
  api.batch = (dataindicies, put, del) => {
    // console.log(
    //   '    link_single',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
    const diff = { put: [], del: [] }
    const linkdiff = { put: [], del: [] }
    del.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.del[i]
      if (key == null || key == undefined) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
        return
      }
      diff.del.push(index)
      _set.get(key).delete(index)
      linkdiff.del.push(index)
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
      linkdiff.put.push(index)
      console.log(cube.print(), '+', key, '=>', cube.i2id(index))
    })
    for (const i of diff.del)
      cube.filterbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.filterbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    hub.emit('link changed', linkdiff)
    return diff
  }
  return api
}