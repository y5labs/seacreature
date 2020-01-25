const SparseArray = require('./sparsearray')
const { BitArray } = require('./bitarray')
const RangeSingle = require('./range_single')
const RangeMultiple = require('./range_multiple')
const SetSingle = require('./set_single')
const SetMultiple = require('./set_multiple')
const text = require('./text')
const Hub = require('../lib/hub')
const Mutex = require('../lib/mutex')

const print_cube = cube => cube.identity.toString().split(' => ')[0]

const visit_cubes = (target, fn) => {
  const seen = new Set()
  const unseen = new Set()
  unseen.add(target)
  while (unseen.size > 0) {
    const tosee = Array.from(unseen.values())
    unseen.clear()
    for (const cube of tosee) {
      seen.add(cube)
      fn(cube)
    }
    for (const cube of tosee) {
      for (const c of cube.forward.keys()) {
        if (seen.has(c)) continue
        unseen.add(c)
      }
      for (const c of cube.backward.keys()) {
        if (seen.has(c)) continue
        unseen.add(c)
      }
    }
  }
}

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
  const backward = new Map()

  const dimensions = []

  const i2d = i => data.get(index.get(i))
  const i2id = i => index.get(i)
  const id2d = id => data.get(id)
  const id2i = id => lookup.get(id)
  const isselected = id => filterbits.zero(id2i(id))

  const onfiltered = async ({ bitindex, put, del }) => {
    if (put.length == 0 && del.length == 0) return

    console.log(
      '  cube filtered',
      put.length.toString().padStart(5, ' ') + ' ↑',
      del.length.toString().padStart(5, ' ') + ' ↓   ',
      print_cube(api),
      { bitindex, put, del }
    )

    const changes = { put: [], del: [] }

    for (const i of del) {
      if (filterbits.zero(i)) changes.del.push(i2d(i))
      filterbits[bitindex.offset][i] |= bitindex.one
    }
    for (const i of put) {
      filterbits[bitindex.offset][i] &= ~bitindex.one
      if (filterbits.zero(i)) changes.put.push(i2d(i))
    }

    await hub.emit('filter changed', { bitindex, put, del })

    if (changes.put.length != 0 || changes.del.length != 0) {
      console.log(
        '  cube filtered',
        changes.put.length.toString().padStart(5, ' ') + ' ↑',
        changes.del.length.toString().padStart(5, ' ') + ' ↓   ',
        print_cube(api),
        changes
      )
      await hub.emit('selection changed', { bitindex, ...changes })
    }
    // await hub.emit('update link selection', {
    //   bitindex,
    //   ...changes
    // })
    await hub.emit('update link selection', {
      bitindex,
      put: put.map(i2d),
      del: del.map(i2d)
    })
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
    index,
    forward,
    backward,
    mutex: null,
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
    link_to: (target, dimension) => {
      if (forward.has(target))
        throw new Error('Cubes are already linked')
      if (!haslinkdiff) {
        let total = 0
        let count = 0
        hub.on('batch', ({ put, del }) =>
          total += put.length - del.length)
        hub.on('update link selection', async params => {
          console.log(print_cube(api), 'update link selection', params)
          count += params.put.length - params.del.length
          // link cubes together with a shared mutex
          if (!api.mutex) {
            visit_cubes(api, cube => {
              if (cube.mutex) api.mutex = cube.mutex
            })
            if (!api.mutex) {
              api.mutex = Mutex()
              visit_cubes(api, cube => cube.mutex = api.mutex)
            }
          }
          if (!api.mutex.islocked) {
            const release = await api.mutex.acquire()
            console.log(print_cube(api), 'Mutex acquired')
            visit_links(api, (source, target, link, seen) => {
              if (!link.isenabled()) return
              if (seen) {
                console.log(print_cube(source), '=>', print_cube(target), 'Deactivating')
                link.deactivate()
              }
              else {
                console.log(print_cube(source), '=>', print_cube(target), 'Activating')
                link.activate()
              }
            })
            await hub.emit('link selection changed', { ...params, total, count })
            visit_links(api, (source, target, link, seen) => {
              if (!link.isenabled()) return
              console.log(print_cube(source), '=>', print_cube(target), 'Activating')
              link.activate()
            })
            console.log(print_cube(api), 'Mutex released')
            release()
          }
          else {
            await hub.emit('link selection changed', { ...params, total, count })
          }
        })
        haslinkdiff = true
      }
      hub.on('link selection changed', async ({ put, del, total, count }) => {
        if (!isenabled || !isactive) return
        console.log(
          '      link_diff',
          put.length.toString().padStart(5, ' ') + ' ↑',
          del.length.toString().padStart(5, ' ') + ' ↓   ',
          `${count}/${total}`,
          print_cube(api)
        )
        if (count == total) await dimension.shownulls()
        else await dimension.hidenulls()
        return dimension({
          put: put.map(identity),
          del: del.map(identity)
        })
      })
      let isenabled = true
      let isactive = true
      const link_api = {
        isenabled: () => isenabled,
        enable: () => isenabled = true,
        disable: () => isenabled = false,
        isactive: () => isactive,
        activate: () => isactive = true,
        deactivate: () => isactive = false
      }
      forward.set(target, link_api)
      target.backward.set(api, link_api)
      return link_api
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