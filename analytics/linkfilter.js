const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')
const config = require('./config')

module.exports = cube => {
  const hub = Hub()
  const bitindex = cube.filterbits.add()
  const filterindex = new SparseArray()

  const api = async ({ put = [], del = [] }) => {
    const diff = { put: new Set(), del: new Set() }
    for (const index of del) {
      const current = filterindex.get(index)
      if (current != 0) continue
      diff.del.add(index)
      filterindex.set(index, 1)
      await hub.emit('trace', {
        op: '- ref',
        target: cube.print(),
        index: cube.i2id(index),
        current: current + 1
      })
    }
    for (const index of put) {
      const current = filterindex.get(index)
      if (current != 1) continue
      diff.del.delete(index)
      diff.put.add(index)
      filterindex.set(index, 0)
      await hub.emit('trace', {
        op: '+ ref',
        target: cube.print(),
        index: cube.i2id(index),
        current: next
      })
    }
    await hub.emit('filter changed', {
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
      cube.filterbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.filterbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }
  return api
}