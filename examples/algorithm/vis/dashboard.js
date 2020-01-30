import component from '../lib/component'
import objstats from 'seacreature/lib/objstats'
import numeral from 'numeral'
import pathie from 'seacreature/lib/pathie'

export default component({
  name: 'dasboard',
  module,
  query: ({ hub, props }) => hub.emit('load cube'),
  render: (h, { props, hub, state, route, router }) => {
    const emit = (...args) => e => {
      e.preventDefault()
      hub.emit(...args)
    }
    const cube = (title, id) => h('div.box', [
      h('h2', title),
      state.filters[`${id}byid`]
        ? h('a', { on: { click: emit(`filter ${id} by id`, null) }, attrs: { href: '#' } }, `Clear ${state.filters[`${id}byid`]}`)
        : [],
      h('ul', Array.from(state.cube[`${id}_byid`].highlighted(Infinity),
        s => h('li', [ h('a', { on: { click: emit(`filter ${id} by id`, s[0]) }, attrs: { href: '#' } }, `${s[1].Id} (${state.cube[`${id}s`].linkcount.get(state.cube[`${id}s`].id2i(s[0]))})`)])))
    ])
    const link = (title, from, to) => h('div.box', [
      h('h2', title),
      h('ul', Array.from(state.cube[`${to}_by${from}`].set.entries(), ([external, indexes]) =>
        Array.from(indexes, index =>
          h('li', `${external} => ${state.cube[`${to}s`].i2id(index)} (${state.cube[`${to}_by${from}`].filterindex.get(index)})`))))
    ])
    return h('div.cols', [
      cube('O', 'order'),
      link('OP', 'product', 'order'),
      link('PO', 'order', 'product'),
      cube('P', 'product'),
      link('PS', 'supplier', 'product'),
      link('SP', 'product', 'supplier'),
      cube('S', 'supplier')
    ])
  }
})
