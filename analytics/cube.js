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

const visit_links = async (initial, payload, fn) => {
  const seen = new Set()
  const unseen = new Map()
  unseen.set(initial, payload)
  while (unseen.size > 0) {
    const tosee = Array.from(unseen.entries())
    unseen.clear()
    for (const [source, params] of tosee) seen.add(source)
    for (const [source, params] of tosee) {
      for (const [target, dimension] of source.forward.entries()) {
        if (seen.has(target)) continue
        const result = await fn(source, target, dimension, params, seen.has(target))
        unseen.set(target, result)
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
  const dimensions = []

  const forward = new Map()
  const linkbits = new BitArray()
  const linkcount = new SparseArray()
  const links = []

  const i2d = i => data.get(index.get(i))
  const i2id = i => index.get(i)
  const id2d = id => data.get(id)
  const id2i = id => lookup.get(id)

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
      if (filterbits.only(i, bitindex.offset, bitindex.one)) {
        linkchanges.del.push(id)
        if (linkbits.zero(i))
          changes.del.push(id2d(id))
      }
    }
    for (const i of put) {
      const id = i2id(i)
      if (filterbits.only(i, bitindex.offset, bitindex.one)) {
        linkchanges.put.push(id)
        if (linkbits.zero(i))
          changes.put.push(id2d(id))
      }
      filterbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('filter changed', { bitindex, put, del })

    if (changes.put.length > 0 || changes.del.length > 0) {
      await hub.emit('selection changed', changes)
      await hub.emit('update link selection', linkchanges)
    }
  }

  const onlinkchanged = async ({ bitindex, put, del }) => {
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
      linkbits[bitindex.offset][i] |= bitindex.one
      if (filterbits.zero(i)) {
        if (linkbits.only(i, bitindex.offset, bitindex.one)) {
          linkchanges.del.push(id)
          changes.del.push(id2d(id))
        }
      }
    }
    for (const i of put) {
      const id = i2id(i)
      if (filterbits.zero(i)) {
        if (linkbits.only(i, bitindex.offset, bitindex.one)) {
          linkchanges.put.push(id)
          changes.put.push(id2d(id))
        }
      }
      linkbits[bitindex.offset][i] &= ~bitindex.one
    }

    await hub.emit('link changed', { bitindex, put, del })

    if (changes.put.length > 0 || changes.del.length > 0) {
      await hub.emit('selection changed', changes)
      await hub.emit('update link selection', linkchanges)
    }
  }

  hub.on('update link selection', async params => {
    await visit_links(api, params, async (source, target, dimension, params, hasseencube) => {
      const result = await dimension(params)
      // const roll = ids =>
      //   Array.from(new Set(ids
      //     .map(i => dimension.lookup(i))
      //     .flat()))
      // if (hasseencube) return null
      // const result = {
      //   put: roll(params.put),
      //   del: roll(params.del)
      // }
      // hub.emit('trace', {
      //   op: 'project',
      //   source: source.print(),
      //   target: target.print(),
      //   params, result
      // })
      return result
    })
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
    linkbits,
    linkcount,
    index,
    forward,
    range_single: (map) => {
      const result = RangeSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    range_multiple: (map) => {
      const result = RangeMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    range_multiple_text: (map, stemmer) => {
      const map_text = (d) => text.default_process(map(d)).map(stemmer)
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
    set_single: (map) => {
      const result = SetSingle(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    set_multiple: (map) => {
      const result = SetMultiple(api, map)
      dimensions.push(result)
      result.on('filter changed', p => onfiltered(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    link_single: (map) => {
      const result = LinkSingle(api, map)
      dimensions.push(result)
      result.on('link changed', p => onlinkchanged(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    link_multiple: (map) => {
      const result = LinkMultiple(api, map)
      dimensions.push(result)
      result.on('link changed', p => onlinkchanged(p))
      result.on('trace', p => hub.emit('trace', p))
      return result
    },
    link_to: (target, dimension) => {
      if (forward.has(target))
        throw new Error('Cubes are already linked')
      forward.set(target, dimension)
      dimension.source = api
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
        if (filterbits.zero(i) && linkbits.zero(i)) {
          changes.put.push(d)
          linkchanges.put.push(i2id(i))
        }
      }
      await hub.emit('selection changed', changes)
      // await hub.emit('update link selection', linkchanges)
      for (const [cube, link] of forward.entries()) {
        link(linkchanges)
      }
      // console.log(put, del)
      // TODO propagate selection into forward links
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
      linkcount.length(Math.max(...indicies.put) + 1)
      const result = {
        put: indicies.put.map(i => {
          linkcount.set(i, 0)
          lookup.set(i2id(i), i)
          return [i, i2d(i)]
        }),
        del: indicies.del.map((i, index) => {
          linkcount.set(i, null)
          lookup.delete(i2id(i))
          return [i, del[index]]
        })
      }
      filterbits.lengthen(index.length())
      linkbits.lengthen(index.length())
      for (const i of indicies.put) {
        filterbits.clear(i)
        linkbits.clear(i)
      }
      for (const d of dimensions) d.batch(indicies, put, del)
      for (const l of links) l.batch(indicies, put, del)
      await hub.emit('batch', { indicies, put, del })
      return result
    }
  }
  const iterate = fn => function*() {
    const iterator = index[Symbol.iterator]()
    let i = iterator.next()
    while (!i.done) {
      if (fn(i.value)) yield i2d(i.value)
      i = iterator.next()
    }
  }
  api.highlighted = iterate(i => filterbits.zero(i) && linkbits.zero(i))
  api.filtered = iterate(i => filterbits.zero(i))
  api.unfiltered = iterate(i => true)
  return api
}