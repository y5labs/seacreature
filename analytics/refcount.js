const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')
const config = require('./config')

module.exports = cube => {
  const hub = Hub()
  const bitindex = cube.linkbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    const diff = { put: new Set(), del: new Set() }
    for (const index of del) {
      const current = filterindex.get(index)
      if (current == 0) diff.del.add(index)
      filterindex.set(index, current - 1)
      hub.emit('trace', {
        op: '- ref',
        target: cube.print(),
        index: cube.i2id(index),
        current: current - 1
      })
    }
    for (const index of put) {
      const current = filterindex.get(index)
      if (current == -1) {
        diff.del.delete(index)
        diff.put.add(index)
      }
      const next = config.limittozero ? Math.min(current + 1, 0) : current + 1
      filterindex.set(index, next)
      hub.emit('trace', {
        op: '+ ref',
        target: cube.print(),
        index: cube.i2id(index),
        current: next
      })
    }
    await hub.emit('link changed', {
      bitindex,
      put: Array.from(diff.put),
      del: Array.from(diff.del)
    })
  }
  api.bitindex = bitindex
  api.filterindex = filterindex
  api.on = hub.on
  api.batch = (dataindicies, put, del) => {
    filterindex.length(Math.max(...dataindicies.put) + 1)
    const diff = { put: [], del: [] }
    del.forEach((d, i) => {
      const index = dataindicies.del[i]
      diff.del.push(index)
      filterindex.set(index, null)
    })
    put.forEach((d, i) => {
      const index = dataindicies.put[i]
      diff.put.push(index)
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