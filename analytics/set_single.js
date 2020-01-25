const Hub = require('../lib/hub')

module.exports = (cube, map) => {
  const _set = new Map()
  let autoexpand = true
  const filter = new Set()
  let shownulls = true
  const nulls = new Set()

  const hub = Hub()
  const bitindex = cube.filterbits.add()

  const api = async ({ put = [], del = [] }) => {
    console.log(
      '     set_single',
      put.length.toString().padStart(5, ' ') + ' ↑',
      del.length.toString().padStart(5, ' ') + ' ↓   ',
      map.toString()
    )
    const indexdiff = { put: new Set(), del: new Set() }
    for (const key of del) {
      if (!_set.has(key) || !filter.has(key)) continue
      filter.delete(key)
      for (const index of _set.get(key).keys())
        indexdiff.del.add(index)
    }
    for (const key of put) {
      if (!_set.has(key) || filter.has(key)) continue
      filter.add(key)
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
  api.on = hub.on
  api.filter = filter
  api.selectall = async () => {
    autoexpand = true
    const put = []
    for (const key of _set.keys()) {
      if (filter.has(key)) continue
      filter.add(key)
      for (const index of _set.get(key).keys())
        put.push(index)
    }
    await hub.emit('filter changed', { bitindex, put, del: [] })
  }
  api.selectnone = async () => {
    autoexpand = false
    const del = []
    for (const key of _set.keys()) {
      if (!filter.has(key)) continue
      for (const index of _set.get(key).keys())
        del.push(index)
    }
    filter.clear()
    await hub.emit('filter changed', { bitindex, put: [], del })
  }
  api.filtered = function*(n) {
    if (n === 0) return
    const keys = n > 0 ? filter : Array.from(filter).reverse()
    const keyiterator = keys[Symbol.iterator]()
    while (n > 0) {
      const key = keyiterator.next()
      if (key.done) break
      const indexiterator = _set.get(key.value)[Symbol.iterator]()
      while (n > 0) {
        const index = indexiterator.next()
        if (index.done) break
        if (cube.filterbits.zero(index.value)) {
          yield [key.value, cube.i2d(index.value)]
          n--
        }
      }
    }
    const nulliterator = nulls[Symbol.iterator]()
    while (n > 0) {
      const item = nulliterator.next()
      if (item.done) break
      if (cube.filterbits.zero(item.value)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.context = function*(n) {
    if (n === 0) return
    const source = _set.keys()
    const keys = n > 0 ? source : Array.from(source).reverse()
    const keyiterator = keys[Symbol.iterator]()
    while (n > 0) {
      const key = keyiterator.next()
      if (key.done) break
      const indexiterator = _set.get(key.value)[Symbol.iterator]()
      while (n > 0) {
        const index = indexiterator.next()
        if (index.done) break
        if (cube.filterbits.zeroExcept(index.value, bitindex.offset, ~bitindex.one)) {
          yield [key.value, cube.i2d(index.value)]
          n--
        }
      }
    }
    const nulliterator = nulls[Symbol.iterator]()
    while (n > 0) {
      const item = nulliterator.next()
      if (item.done) break
      if (cube.filterbits.zero(item.value)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.unfiltered = function*(n) {
    if (n === 0) return
    const source = _set.keys()
    const keys = n > 0 ? source : Array.from(source).reverse()
    const keyiterator = keys[Symbol.iterator]()
    while (n > 0) {
      const key = keyiterator.next()
      if (key.done) break
      const indexiterator = _set.get(key.value)[Symbol.iterator]()
      while (n > 0) {
        const index = indexiterator.next()
        if (index.done) break
        yield [key.value, cube.i2d(index.value)]
        n--
      }
    }
    const nulliterator = nulls[Symbol.iterator]()
    while (n > 0) {
      const item = nulliterator.next()
      if (item.done) break
      if (cube.filterbits.zero(item.value)) {
        yield [null, cube.i2d(item.value)]
        n--
      }
    }
  }
  api.batch = (dataindicies, put, del) => {
    console.log(
      '     set_single',
      put.length.toString().padStart(5, ' ') + ' ↑',
      del.length.toString().padStart(5, ' ') + ' ↓   ',
      map.toString()
    )
    const diff = { put: [], del: [] }
    del.forEach((d, i) => {
      const key = map(d)
      const index = dataindicies.del[i]
      if (key == null || key == undefined) {
        nulls.delete(index)
        if (shownulls) diff.del.push(index)
      }
      else {
        _set.get(key).delete(index)
        if (filter.has(key)) diff.del.push(index)
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
        if (!_set.has(key)) _set.set(key, new Set())
        _set.get(key).add(index)
        if (autoexpand) {
          filter.add(key)
          diff.put.push(index)
        }
        else if (filter.has(key))
          diff.put.push(index)
      }
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