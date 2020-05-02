const Link = require('./link')

module.exports = (from, to, map) => {
  if (to.forward.has(from) || from.forward.has(to))
    throw new Error('Cubes are already linked')

  const forward = Link(from, map)
  from.dimensions.push(forward)
  forward.on('filter changed', p => from.onfiltered(p))
  to.forward.set(from, forward)
  forward.source = to
  from.forward_links.push(forward)

  const backward = Link(to, i => forward.lookup(to.identity(i)))
  to.dimensions.push(backward)
  backward.on('filter changed', p => to.onfiltered(p))
  from.forward.set(to, backward)
  backward.source = from
  to.backward_links.push(backward)

  forward.on('batch', ({ put, del, diff }) => {
    for (const d of del) {
      const keys = map(d) || []
      const id = from.identity(d)
      for (const k of keys) {
        const index = to.id2i(k)
        if (backward.filterindex.length <= index) continue
        const current = backward.filterindex.get(index)
        if (!current) continue
        if (!backward.forward.has(id)) continue
        const node = backward.forward.get(id)
        if (node.has(index)) {
          node.delete(index)
          if (node.size == 0) nulls.add(index)
        }
      }
    }
    for (const d of put) {
      const keys = map(d) || []
      const id = from.identity(d)
      for (const k of keys) {
        const index = to.id2i(k)
        if (backward.filterindex.length <= index) continue
        if (backward.nulls.has(index)) backward.nulls.delete(index)
        const current = backward.filterindex.get(index)
        if (!current) continue
        if (!backward.forward.has(id))
          backward.forward.set(id, new Set())
        const node = backward.forward.get(id)
        if (!node.has(index)) node.add(index)
        current.count++
        current.total++
      }
    }
  })

  const api = { forward, backward }

  from.duplex_links.push(api)

  return api
}