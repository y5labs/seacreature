const RangeIndex = require('./range_index')
const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  let _range = []
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const filter = [null, null]
  const indicies = [0, _range.length - 1]
  const bitindex = cube.filterbits.add()

  const api = async (lo, hi) => {
    if (lo == -0) lo = 0
    if (hi === undefined) hi = lo
    if (lo == filter[0] && hi == filter[1]) return
    // console.log(
    //   '   range_single',
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
    await hub.emit('filter changed', {
      bitindex,
      put: diff.put.map(i => _range[i][1]),
      del: diff.del.map(i => _range[i][1])
    })
  }
  api.bitindex = bitindex
  api.on = hub.on
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
  api.filter = filter
  const iterate = (startfn, endfn, fn, map = cube.i2d) => function*(n) {
    start = startfn()
    end = endfn()
    if (n === 0) return
    if (n > 0) {
      let i = start
      while (n > 0 && i <= end) {
        if (fn(_range[i][1])) {
          yield [_range[i][0], map(_range[i][1])]
          n--
        }
        i++
      }
      const iterator = nulls[Symbol.iterator]()
      while (n > 0) {
        const item = iterator.next()
        if (item.done) break
        if (fn(item.value)) {
          yield [null, map(item.value)]
          n--
        }
      }
    }
    else {
      let i = end
      while (n < 0 && i >= start) {
        if (fn(_range[i][1])) {
          yield [_range[i][0], map(_range[i][1])]
          n++
        }
        i--
      }
      const iterator = nulls[Symbol.iterator]()
      while (n < 0) {
        const item = iterator.next()
        if (item.done) break
        if (fn(item.value)) {
          yield [null, map(item.value)]
          n++
        }
      }
    }
  }
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
  api.all = iterate(
    () => 0,
    () => _range.length - 1,
    i => true,
    i => ({
      d: cube.i2d(i),
      isfiltered: cube.filterbits.zero(i),
      iscontext: cube.filterbits.zeroExcept(i, bitindex.offset, ~bitindex.one)
    }))
  api.batch = (dataindicies, put, del) => {
    // console.log(
    //   '   range_single',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   map.toString()
    // )
    const diff = { put: [], del: [] }
    const apply = { put: [], del: [] }
    del.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.del[i]
      if (key == null || key == undefined) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
      }
      else {
        apply.del.push([key, index])
        if ((filter[0] === null || key >= filter[0])
          && (filter[1] === null || key <= filter[1]))
          diff.del.push(index)
      }
    })
    put.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.put[i]
      if (key == null || key == undefined) {
        nulls.add(index)
        if (shownulls) diff.put.push(index)
      }
      else {
        apply.put.push([key, index])
        if ((filter[0] === null || key >= filter[0])
          && (filter[1] === null || key <= filter[1]))
          diff.put.push(index)
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