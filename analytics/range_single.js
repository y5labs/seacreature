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
    if (hi === undefined) hi = lo
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
  api.filtered = function*(n) {
    if (n === 0) return
    if (n > 0) {
      let i = indicies[0]
      while (n > 0 && i <= indicies[1]) {
        if (cube.filterbits.zero(_range[i][1])) {
          yield [_range[i][0], cube.i2d(_range[i][1])]
          n--
        }
        i++
      }
    }
    else {
      let i = indicies[1]
      while (n < 0 && i >= indicies[0]) {
        if (cube.filterbits.zero(_range[i][1])) {
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
      if (cube.filterbits.zero(item.value)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.context = function*(n) {
    if (n === 0) return
    if (n > 0) {
      let i = 0
      while (n > 0 && i < _range.length) {
        if (cube.filterbits.zeroExcept(_range[i][1], bitindex.offset, ~bitindex.one)) {
          yield [_range[i][0], cube.i2d(_range[i][1])]
          n--
        }
        i++
      }
    }
    else {
      const result = []
      let i = _range.length - 1
      while (n < 0 && i >= 0) {
        if (cube.filterbits.zeroExcept(_range[i][1], bitindex.offset, ~bitindex.one)) {
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
      if (cube.filterbits.zeroExcept(item.value, bitindex.offset, ~bitindex.one)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.unfiltered = function*(n) {
    if (n === 0) return
    if (n > 0) {
      let i = 0
      while (n > 0 && i < _range.length) {
        yield [_range[i][0], cube.i2d(_range[i][1])]
        n--
        i++
      }
    }
    else {
      let i = _range.length - 1
      while (n < 0 && i >= 0) {
        yield [_range[i][0], cube.i2d(_range[i][1])]
        n++
        i--
      }
    }
    const iterator = nulls[Symbol.iterator]()
    while (n > 0) {
      const item = iterator.next()
      if (item.done) break
      yield [null, cube.i2d(item.value)]
      n--
    }
  }
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
    for (const i of diff.put)
      cube.filterbits[bitindex.offset][i] &= ~bitindex.one
    for (const i of diff.del)
      cube.filterbits[bitindex.offset][i] |= bitindex.one
    hub.emit('batch', { put, del, diff })
    return diff
  }
  return api
}