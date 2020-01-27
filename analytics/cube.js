const SparseArray = require('./sparsearray')
const { BitArray } = require('./bitarray')
const RangeSingle = require('./range_single')
const RangeMultiple = require('./range_multiple')
const SetSingle = require('./set_single')
const SetMultiple = require('./set_multiple')
const LinkSingle = require('./link_single')
const LinkMultiple = require('./link_multiple')
const text = require('./text')
const Hub = require('../lib/hub')
const Mutex = require('../lib/mutex')

const print_cube = cube => cube.identity.toString().split(' => ')[0]

const visit_links = (target, fn) => {
  const seen = new Set()
  const unseen = new Set()
  unseen.add(target)
  while (unseen.size > 0) {
    const tosee = Array.from(unseen.values())
    unseen.clear()
    for (const cube of tosee) seen.add(cube)
    for (const cube of tosee) {
      for (const [c, d] of cube.forward.entries()) {
        fn(cube, c, d, seen.has(c))
        if (seen.has(c)) continue
        unseen.add(c)
      }
    }
  }
}

module.exports = identity => {
  const hub = Hub()
  const data = new Map()
  const lookup = new Map()
  const index = new SparseArray()
  const filterbits = new BitArray()

  let haslinkdiff = false
  const forward = new Map()
  const link_masks = []

  const dimensions = []

  const i2d = i => data.get(index.get(i))
  const i2id = i => index.get(i)
  const id2d = id => data.get(id)
  const id2i = id => lookup.get(id)
  const isselected = id => filterbits.zero(id2i(id))
  const islink = bitindex => {
    if (bitindex.offset >= link_masks.length) return false
    return link_masks[bitindex.offset] & bitindex.one
  }

  const onfiltered = async ({ bitindex, put, del }) => {
    if (put.length == 0 && del.length == 0) return

    // console.log(
    //   '  cube filtered',
    //   put.length.toString().padStart(5, ' ') + ' ↑',
    //   del.length.toString().padStart(5, ' ') + ' ↓   ',
    //   print_cube(api),
    //   { bitindex, put, del }
    // )

    const changes = { put: [], del: [] }

    for (const i of del) {
      filterbits[bitindex.offset][i] |= bitindex.one
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        changes.del.push(i2d(i))
    }
    for (const i of put) {
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        changes.put.push(i2d(i))
      filterbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('filter changed', { bitindex, put, del })

    if (changes.put.length > 0 || changes.del.length > 0) {
      await hub.emit('selection changed', { bitindex, ...changes })
      if (!islink(bitindex))
        await hub.emit('update link selection', { bitindex, ...changes })
    }
  }

  const api = {
    i2d,
    i2id,
    id2d,
    id2i,
    isselected,
    identity,
    on: (...args) => hub.on(...args),
    length: () => index.length(),
    filterbits,
    link_masks,
    index,
    forward,
    range_single: (map) => {
      const result = RangeSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    range_multiple: (map) => {
      const result = RangeMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    range_multiple_text: (map, stemmer) => {
      const map_text = (d) => text.default_process(map(d)).map(stemmer)
      const result = RangeMultiple(api, map_text)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      const search = (lo, hi) => {
        if (lo) lo = stemmer(lo)
        if (hi) hi = stemmer(hi)
        return result(lo, hi)
      }
      for (const key of Object.keys(result))
        search[key] = result[key]
      return search
    },
    set_single: (map) => {
      const result = SetSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    set_multiple: (map) => {
      const result = SetMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    link_single: (map) => {
      const result = LinkSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    link_multiple: (map) => {
      const result = LinkMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      return result
    },
    link_to: (target, dimension) => {
      if (forward.has(target))
        throw new Error('Cubes are already linked')
      if (!haslinkdiff) {
        hub.on('update link selection', async params => {
          visit_links(api, (source, target, link, seen) => {
            
          })
        })
        haslinkdiff = true
      }
      forward.set(target, dimension)
      while (target.link_masks.length < dimension.bitindex.offset)
        target.link_masks.push(0)
      target.link_masks[dimension.bitindex.offset] |= dimension.bitindex.one
    },
    batch_calculate_selection_change: async ({ put, del }) => {
      if (put.length == 0 && del.length == 0) return
      const changes = {
        put: put.filter(p => filterbits.zero(p[0])).map(p => p[1]),
        del: del.map(d => d[1])
      }
      await hub.emit('selection changed', changes)
      await hub.emit('update link selection', changes)
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
  api[Symbol.iterator] = function*() {
    const iterator = index[Symbol.iterator]()
    let i = iterator.next()
    while (!i.done) {
      if (filterbits.zero(i.value))
        yield i2id(i.value)
      i = iterator.next()
    }
  }
  return api
}