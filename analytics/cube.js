const SparseArray = require('./sparsearray')
const { BitArray } = require('./bitarray')
const RangeSingle = require('./range_single')
const RangeMultiple = require('./range_multiple')
const SetSingle = require('./set_single')
const SetMultiple = require('./set_multiple')
const Link = require('./link')
const LinkFilter = require('./linkfilter')
const text = require('./text')
const Hub = require('../lib/hub')
const Mutex = require('../lib/mutex')
const config = require('./config')
const sleep = require('../lib/sleep')

module.exports = identity => {
  const hub = Hub()
  const data = new Map()
  const lookup = new Map()
  const index = new SparseArray()
  const filterbits = new BitArray()
  const dimensions = []

  const forward = new Map()
  const backward = new Map()

  const i2d = i => data.get(index.get(i))
  const i2id = i => index.get(i)
  const id2d = id => data.get(id)
  const id2i = id => lookup.get(id)

  const onfiltered = async ({ bitindex, put, del }) => {
    if (put.length == 0 && del.length == 0) return

    const diff = { put: [], del: [] }
    const candidates = []

    for (const i of del) {
      filterbits[bitindex.offset][i] |= bitindex.one
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        diff.del.push(i)
    }
    for (const i of put) {
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        diff.put.push(i)
      if (filterbits.onlyExcept(i, api.linkfilter.bitindex.offset, ~api.linkfilter.bitindex.one, bitindex.offset, bitindex.one))
        candidates.push(i)
      filterbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('filter changed', { bitindex, put, del })

    if (diff.put.length > 0 || diff.del.length > 0) {
      await hub.emit('selection changed', {
        put: diff.put.map(i2d),
        del: diff.del.map(i2d)
      })
      await hub.emit('propagate links', {
        put: diff.put.map(i2id),
        del: diff.del.map(i2id)
      })
    }
    if (candidates.length > 0)
      await hub.emit('garbage collection', candidates)
  }

  hub.on('propagate links', async payload => {
    // ref count ++
    for (const [target, dimension] of api.forward.entries()) {
      const diff = await dimension({ del: payload.del })
      if (diff.del.length == 0) continue
      await target.linkfilter(diff)
    }

    for (const [target, dimension] of api.forward.entries()) {
      const diff = await dimension({ put: payload.put })
      if (diff.put.length == 0) continue
      await target.linkfilter(diff)
    }
  })

  hub.on('garbage collection', async candidates => {
    await hub.emit('trace', { op: 'start gc' })
    const seen = new Map()
    const push = (cube, i) => {
      if (!seen.has(cube)) seen.set(cube, new Set())
      seen.get(cube).add(i)
    }
    const pop = (cube, i) => {
      seen.get(cube).delete(i)
    }
    const has = (cube, i) => {
      if (!seen.has(cube)) return false
      return seen.get(cube).has(i)
    }
    const cancollect = async (cube, i) => {
      await hub.emit('trace', {
        op: 'gc cube',
        target: cube.print(),
        id: cube.i2id(i),
        desc: 'test' })
      await sleep(200)
      push(cube, i)
      for (const [source, dimension] of cube.backward.entries()) {
        seenindicies = seen.get(source)
        // only follow refs
        if (dimension.filterindex.get(i) != 0) continue
        await hub.emit('trace', {
          op: 'gc dimension',
          source: cube.print(),
          target: source.print(),
          id: cube.i2id(i),
          desc: 'check' })
        for (const id of Array.from(dimension.backward.get(i).keys())
            .filter(id => dimension.forward.get(id).count == 0)) {
          const sourceindex = source.id2i(id)
          if (has(source, sourceindex)) continue
          const isroot = !source.filterbits.zeroExcept(sourceindex, source.linkfilter.bitindex.offset, ~source.linkfilter.bitindex.one)
          if (isroot) {
            await hub.emit('trace', {
              op: 'gc cube',
              target: source.print(),
              id: source.i2id(sourceindex),
              desc: 'is root' })
            return false
          }
          if (await cancollect(source, sourceindex)) {
            await hub.emit('trace', {
              op: 'gc cube',
              target: source.print(),
              id: source.i2id(sourceindex),
              desc: 'prop collect' })
            await source.linkfilter({ put: [sourceindex] })
          }
        }
      }
      pop(cube, i)
      return true
    }

    for (const i of candidates) {
      if (await cancollect(api, i)) {
        await hub.emit('trace', {
          op: 'gc cube',
          target: api.print(),
          id: api.i2id(i),
          desc: 'cube collect' })
        await api.linkfilter({ put: [i] })
      }
    }
    await hub.emit('trace', { op: 'finish gc' })
  })

  const api = {
    i2d,
    i2id,
    id2d,
    id2i,
    identity,
    print: () => api.identity.toString().split(' => ')[0],
    on: (...args) => hub.on(...args),
    length: () => index.length(),
    filterbits,
    index,
    forward,
    backward,
    dimensions,
    range_single: map => {
      const result = RangeSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    range_multiple: map => {
      const result = RangeMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    range_multiple_text: (map, stemmer) => {
      const map_text = d => text.default_process(map(d)).map(stemmer)
      const result = RangeMultiple(api, map_text)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      const search = (lo, hi) => {
        if (lo) lo = stemmer(lo)
        if (hi) hi = stemmer(hi)
        return result(lo, hi)
      }
      for (const key of Object.keys(result))
        search[key] = result[key]
      return search
    },
    set_single: map => {
      const result = SetSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    set_multiple: map => {
      const result = SetMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    link: (source, map) => {
      if (source.forward.has(api))
        throw new Error('Cubes are already linked')
      const dimension = Link(api, map)
      dimensions.push(dimension)
      dimension.on('filter changed', p => onfiltered(p))
      dimension.on('trace', p => hub.emit('trace', p))
      source.forward.set(api, dimension)
      api.backward.set(source, dimension)
      dimension.source = source
      return dimension
    },
    batch_calculate_selection_change: async ({ put, del }) => {
      if (put.length == 0 && del.length == 0) return
      const changes = { put: [], del: [] }
      const linkchanges = { put: [], del: [] }
      for (const [i, d] of del) {
        changes.del.push(d)
        linkchanges.del.push(i2id(i))
      }
      for (const [i, d] of put) {
        if (filterbits.zero(i)) {
          changes.put.push(d)
          linkchanges.put.push(i2id(i))
        }
      }
      await hub.emit('selection changed', changes)
      for (const [cube, link] of forward.entries()) {
        const diff = await link(linkchanges)
      }
    },
    batch: async ({ put = [], del = [] }) => {
      const del_ids = []
      for (const d of del) {
        const id = identity(d)
        if (!data.has(id)) continue
        del_ids.push(id)
        delete data.delete(id)
      }
      const put_ids = []
      for (const d of put) {
        const id = identity(d)
        if (data.has(id)) throw new Error('Put with id already in dataset')
        put_ids.push(id)
        data.set(id, d)
      }
      const indicies = index.batch({ put: put_ids, del: del_ids })
      const result = {
        put: indicies.put.map(i => {
          lookup.set(i2id(i), i)
          return [i, i2d(i)]
        }),
        del: indicies.del.map((i, index) => {
          lookup.delete(i2id(i))
          return [i, del[index]]
        })
      }
      filterbits.lengthen(index.length())
      for (const i of indicies.put) filterbits.clear(i)
      for (const d of dimensions) d.batch(indicies, put, del)
      await hub.emit('batch', { indicies, put, del })
      return result
    }
  }
  api.linkfilter = LinkFilter(api)
  dimensions.push(api.linkfilter)
  api.linkfilter.on('filter changed', p => onfiltered(p))
  api.linkfilter.on('trace', p => hub.emit('trace', p))
  const iterate = fn => function*() {
    const iterator = index[Symbol.iterator]()
    let i = iterator.next()
    while (!i.done) {
      if (fn(i.value)) yield i2d(i.value)
      i = iterator.next()
    }
  }
  api.highlighted = iterate(i => filterbits.zero(i))
  api.filtered = iterate(i => filterbits.zero(i))
  api.unfiltered = iterate(i => true)
  return api
}