const Hub = require('../lib/hub')
const { BitArray } = require('./bitarray')
const RangeSingle = require('./range_single')

module.exports = cube => {
  const hub = Hub()
  const bitindex = cube.filterbits.add()
  const filterbits = new BitArray()
  const dimensions = []
  const onfiltered = async ({ bitindex, put, del }) => {
    if (put.length == 0 && del.length == 0) return

    const diff = { put: [], del: [] }

    for (const i of del) {
      filterbits[bitindex.offset][i] |= bitindex.one
      if (filterbits.all(i)) diff.del.push(i)
    }
    for (const i of put) {
      if (filterbits.all(i)) diff.put.push(i)
      filterbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('filter changed', { bitindex, ...diff })
  }
  const api = {
    bitindex,
    on: hub.on,
    filterbits,
    i2d: cube.i2d,
    batch: (dataindicies, put, del) => {
      filterbits.lengthen(cube.index.length())
      for (const i of dataindicies.put) filterbits.clear(i)
      const diff = { put: new Set(), del: new Set() }
      for (const d of dimensions) {
        const c = d.batch(dataindicies, put, del)
        for (const i of c.del)
          if (!diff.put.has(i))
            diff.del.add(i)
        for (const i of c.put) {
          if (diff.del.has(i))
            diff.del.delete(i)
          diff.put.add(i)
        }
      }
      for (const i of diff.del)
        cube.filterbits[bitindex.offset][i] |= bitindex.one
      for (const i of diff.put)
        cube.filterbits[bitindex.offset][i] &= ~bitindex.one
      hub.emit('batch', { put, del, diff })
      return diff
    },
    range_single: map => {
      const dimension = RangeSingle(api, map)
      dimensions.push(dimension)
      dimension.on('filter changed', p => onfiltered(p))
      // dimension.on('trace', p => hub.emit('trace', p))
      return dimension
    }
  }
  return api
}