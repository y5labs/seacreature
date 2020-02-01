const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')
const config = require('./config')

module.exports = (cube, map) => {
  const _set = new Map()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.linkbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    const indexdiff = { put: new Set(), del: new Set() }
    const linkdiff = { put: [], del: [] }
    for (const key of del) {
      if (!_set.has(key)) continue
      const node = _set.get(key)
      node.count--
      for (const index of node.indicies.keys()) {
        const current = filterindex.get(index)
        if (node.count <= 0) {
          filterindex.set(index, current - 1)
          if (current === 1) indexdiff.del.add(index)
          if ((config.continuousdecrement && current <= 1)
            || (!config.continuousdecrement && current === 1))
            linkdiff.del.push(cube.i2id(index))
        }
        await hub.emit('trace', {
          op: '- link',
          source: api.source.print(),
          target: cube.print(),
          key,
          index: cube.i2id(index),
          current
        })
      }
    }
    for (const key of put) {
      if (!_set.has(key)) continue
      const node = _set.get(key)
      node.count++
      for (const index of node.indicies.keys()) {
        const current = filterindex.get(index)
        if (node.count <= 1) {
          if (current === 0) {
            indexdiff.del.delete(index)
            indexdiff.put.add(index)
          }
          filterindex.set(index, current + 1)
          if ((config.continuousdecrement && current <= 0)
            || (!config.continuousdecrement && current === 0))
            linkdiff.put.push(cube.i2id(index))
        }
        await hub.emit('trace', {
          op: '+ link',
          source: api.source.print(),
          target: cube.print(),
          key,
          index: cube.i2id(index),
          current
        })
      }
    }
    if (config.publishfromlinkfilter)
      await hub.emit('link changed', {
        bitindex,
        put: Array.from(indexdiff.put),
        del: Array.from(indexdiff.del)
      })
    return {
      indexdiff,
      linkdiff
    }
  }
  api.lookup = key =>
    !_set.has(key) ? []
    : Array.from(
      _set.get(key).indicies.keys(),
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
        const node = _set.get(key)
        node.delete(index)
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
        if (!_set.has(key)) _set.set(key, {
          count: 0,
          indicies: new Set()
        })
        const node = _set.get(key)
        node.indicies.add(index)
        count++
      }
      if (count > 0) diff.put.push(index)
      // filterindex.set(index, count)
      filterindex.set(index, 0)
    })
    for (const i of diff.del)
      cube.linkbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.linkbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }
  return api
}