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

const visit_links = async (target, payload, fn) => {
  const seen = new Set()
  const unseen = new Map()
  unseen.set(target, payload)
  while (unseen.size > 0) {
    const tosee = Array.from(unseen.entries())
    unseen.clear()
    for (const cube of tosee) seen.add(cube[0])
    for (const cube of tosee) {
      for (const [c, d] of cube[0].forward.entries()) {
        if (seen.has(c)) continue
        unseen.set(c, await fn(cube[0], c, d, cube[1]))
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

  let linkbitindex = null
  const refcount = new SparseArray()
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
    //   api.print(),
    //   { bitindex, put, del }
    // )

    const changes = { put: [], del: [] }
    const linkchanges = { put: [], del: [] }

    for (const i of del) {
      const id = i2id(i)
      filterbits[bitindex.offset][i] |= bitindex.one
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        changes.del.push(id2d(id))
      if (filterbits.onlyExceptMask(i, bitindex.offset, bitindex.one, link_masks))
        linkchanges.del.push(id)
    }
    for (const i of put) {
      const id = i2id(i)
      if (filterbits.only(i, bitindex.offset, bitindex.one))
        changes.put.push(id2d(id))
      if (filterbits.onlyExceptMask(i, bitindex.offset, bitindex.one, link_masks))
        linkchanges.put.push(id)
      filterbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('filter changed', { bitindex, put, del })

    if (changes.put.length > 0 || changes.del.length > 0)
      await hub.emit('selection changed', changes)
    if (linkchanges.put.length > 0 || linkchanges.del.length > 0)
      await hub.emit('update link selection', linkchanges)
  }

  const onlinkchanged = async ({ put, del }) => {
    const diff = {
      put: new Set(),
      del: new Set()
    }
    for (const d of del) {
      const current = refcount.get(d)
      if (current == 1) diff.del.add(d)
      refcount.set(d, current - 1)
      console.log(api.print(), 'REF -', i2id(d), current - 1)
    }
    for (const p of put) {
      const current = refcount.get(p)
      if (current == 0) {
        diff.del.delete(p)
        diff.put.add(p)
      }
      refcount.set(p, current + 1)
      console.log(api.print(), 'REF +', i2id(p), current + 1)
    }
    for (const i of diff.del)
      filterbits[linkbitindex.offset][i] |= linkbitindex.one
    for (const i of diff.put)
      filterbits[linkbitindex.offset][i] &= ~linkbitindex.one
    console.log(api.print(), 'link changed', { put, del }, diff)
  }
  const createlinkinfra = () => {
    linkbitindex = filterbits.add()
    while (link_masks.length < linkbitindex.offset)
      link_masks.push(0)
    link_masks[linkbitindex.offset] |= linkbitindex.one
    hub.on('update link selection', async params => {
      console.log(api.print(), 'update link selection', params)
      await visit_links(api, params, async (source, target, dimension, params) => {
        await dimension(params)
        const result = {
          put: params.put.map(i =>
            dimension.lookup(i)).flat(),
          del: params.del.map(i =>
            dimension.lookup(i)).flat()
        }
        console.log(
          source.print(),
          '=>',
          target.print(),
          dimension.map.toString(),
          params,
          result
        )
        return result
      })
    })
  }

  const api = {
    i2d,
    i2id,
    id2d,
    id2i,
    isselected,
    identity,
    print: () => api.identity.toString().split(' => ')[0],
    on: (...args) => hub.on(...args),
    length: () => index.length(),
    filterbits,
    link_masks,
    index,
    refcount,
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
      if (!linkbitindex) createlinkinfra()
      const result = LinkSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('link changed', p => onlinkchanged(p))
      return result
    },
    link_multiple: (map) => {
      if (!linkbitindex) createlinkinfra()
      const result = LinkMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('link changed', p => onlinkchanged(p))
      return result
    },
    link_to: (target, dimension) => {
      if (forward.has(target))
        throw new Error('Cubes are already linked')
      forward.set(target, dimension)
      while (target.link_masks.length < dimension.bitindex.offset)
        target.link_masks.push(0)
      target.link_masks[dimension.bitindex.offset] |= dimension.bitindex.one
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
        if (!filterbits.zero(i)) continue
        changes.put.push(d)
        linkchanges.put.push(i2id(i))
      }
      await hub.emit('selection changed', changes)
      await hub.emit('update link selection', linkchanges)
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
      refcount.length(Math.max(...indicies.put) + 1)
      const result = {
        put: indicies.put.map(i => {
          refcount.set(i, 0)
          lookup.set(i2id(i), i)
          return [i, i2d(i)]
        }),
        del: indicies.del.map((i, index) => {
          refcount.set(i, null)
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