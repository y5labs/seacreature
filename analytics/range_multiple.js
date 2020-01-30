const RangeIndex = require('./range_index')
const SparseArray = require('./sparsearray')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  let _range = []
  let shownulls = true
  const nulls = new Set()
  const filterindex = new SparseArray()

  const hub = Hub()
  const filter = [null, null]
  const indicies = [0, _range.length - 1]
  const bitindex = cube.filterbits.add()

  const api = async (lo, hi) => {
    if (hi === undefined) hi = lo
    // console.log(
    //   ' range_multiple',
    //   (lo ? lo.toString() : 'null').padStart(5, ' ') + ' →',
    //   (hi ? hi.toString() : 'null').padStart(5, ' ') + ' ←   ',
    //   map.toString()
    // )
    const indicies_new = RangeIndex.update(
      _range, filter, indicies, lo, hi)
    const diff = RangeIndex.indicies_diff(
      indicies, indicies_new)
    filter[0] = lo
    filter[1] = hi
    indicies[0] = indicies_new[0]
    indicies[1] = indicies_new[1]
    const indexdiff = { put: new Set(), del: new Set() }
    for (const i of diff.del) {
      const index = _range[i][1]
      const current = filterindex.get(index)
      if (current === 1) indexdiff.del.add(index)
      filterindex.set(index, current - 1)
    }
    for (const i of diff.put) {
      const index = _range[i][1]
      const current = filterindex.get(index)
      if (current === 0) {
        if (indexdiff.del.has(index))
          indexdiff.del.delete(index)
        else indexdiff.put.add(index)
      }
      filterindex.set(index, current + 1)
    }
    await hub.emit('filter changed', {
      bitindex,
      put: Array.from(indexdiff.put),
      del: Array.from(indexdiff.del)
    })
  }
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
  const iterate = (startfn, endfn, fn) => function*(n) {
    start = startfn()
    end = endfn()
    if (n === 0) return
    if (n > 0) {
      let i = start
      while (n > 0 && i <= end) {
        if (fn(_range[i][1])) {
          yield [_range[i][0], cube.i2d(_range[i][1])]
          n--
        }
        i++
      }
    }
    else {
      let i = end
      while (n < 0 && i >= start) {
        if (fn(_range[i][1])) {
          yield [_range[i][0], cube.i2d(_range[i][1])]
          n++
        }
        i--
      }
    }
    const iterator = nulls[Symbol.iterator]()
    while (n > 0) {
      const item = iterator.next()
      if (item.done) break
      if (fn(item.value)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.highlighted = iterate(
    () => indicies[0],
    () => indicies[1],
    i => cube.filterbits.zero(i) && cube.linkbits.zero(i))
  api.filtered = iterate(
    () => indicies[0],
    () => indicies[1],
    i => cube.filterbits.zero(i))
  api.context = iterate(
    () => 0,
    () => _range.length - 1,
    i => cube.filterbits.zeroExcept(i, bitindex.offset, ~bitindex.one))
  api.unfiltered = iterate(
    () => 0,
    () => _range.length - 1,
    i => true)
  api.batch = (dataindicies, put, del) => {
    // console.log(
    //   ' range_multiple',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
    filterindex.length(Math.max(...dataindicies.put) + 1)
    const diff = { put: [], del: [] }
    const apply = { put: [], del: [] }
    del.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.del[i]
      if (keys.length == 0) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
      }
      else {
        let count = 0
        for (const key of keys) {
          if ((filter[0] === null || key >= filter[0])
            && (filter[1] === null || key <= filter[1]))
            count++
          apply.del.push([key, index])
        }
        if (count > 0) diff.del.push(index)
        filterindex.set(index, null)
      }
    })
    put.forEach((d, i) => {
      const keys = map(d) || []
      const index = dataindicies.put[i]
      if (keys.length == 0) {
        nulls.add(index)
        if (shownulls) diff.put.push(index)
      }
      else {
        let count = 0
        for (const key of keys) {
          if ((filter[0] === null || key >= filter[0])
            && (filter[1] === null || key <= filter[1]))
            count++
          apply.put.push([key, index])
        }
        if (count > 0) diff.put.push(index)
        filterindex.set(index, count)
      }
    })
    _range = RangeIndex.batch2(_range, apply)
    const update = RangeIndex.update(
      _range,
      [null, null],
      [0, _range.length - 1],
      filter[0], filter[1])
    indicies[0] = update[0]
    indicies[1] = update[1]
    for (const i of diff.del)
      cube.filterbits[bitindex.offset][i] |= bitindex.one
    for (const i of diff.put)
      cube.filterbits[bitindex.offset][i] &= ~bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }
  return api
}