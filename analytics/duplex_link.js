const Link = require('./link')

module.exports = (from, to, map) => {
  if (to.forward.has(from) || from.forward.has(to))
    throw new Error('Cubes are already linked')

  const forward = Link(from, map)
  from.dimensions.push(forward)
  forward.on('filter changed', p => from.onfiltered(p))
  to.forward.set(from, forward)
  from.backward.set(to, forward)
  forward.source = to
  from.forward_links.push(forward)

  const backward = Link(to, i => forward.lookup(to.identity(i)))
  to.dimensions.push(backward)
  backward.on('filter changed', p => to.onfiltered(p))
  from.forward.set(to, backward)
  to.backward.set(from, backward)
  backward.source = from
  to.backward_links.push(backward)
  
  return { forward, backward }
}