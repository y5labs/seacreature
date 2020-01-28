const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const _set = new Map()
  const filter = new Map()
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
    const indexdiff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!_set.has(key)) continue
      filter.set(key, filter.get(key) - 1)
      if (filter.get(key) != -1) continue
      for (const index of _set.get(key).keys())
        indexdiff.del.add(index)
    }
    for (const key of put) {
      if (!_set.has(key)) continue
      filter.set(key, Math.min(filter.get(key) + 1, 0))
      if (filter.get(key) != 0) continue
      for (const index of _set.get(key).keys())
        indexdiff.put.add(index)
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
  api.map = map
  api.on = hub.on
  api.filter = filter
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
      if (filter.get(key) >= 0) diff.del.push(index)
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
      if (!filter.has(key)) filter.set(key, 0)
      if (filter.get(key) >= 0) diff.put.push(index)
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