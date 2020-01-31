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
    const cube = id => h('td', [
      state.filters[`${id}byid`]
        ? h('a', { on: { click: emit(`filter ${id} by id`, null) }, attrs: { href: '#' } }, `Clear ${state.filters[`${id}byid`]}`)
        : [],
      h('ul', Array.from(state.cube[`${id}_byid`].unfiltered(Infinity),
        s => {
          const cube = state.cube[`${id}s`]
          const i = cube.id2i(s[0])
          const filterbit = cube.filterbits[0][i].toString(2)
          const linkbit = cube.linkbits[0][i].toString(2)
          if (filterbit > 0 || linkbit > 0)
            return h('li', `${s[1].Id} (${cube.refcount.filterindex.get(i)}, ${filterbit}, ${linkbit})`)
          else
            return h('li', [ h('a', { on: { click: emit(`filter ${id} by id`, s[0]) }, attrs: { href: '#' } }, `${s[1].Id} (${cube.refcount.filterindex.get(i)}, ${filterbit}, ${linkbit})`)])
        }))
    ])
    const link = (from, to) => {
      const link = state.cube[`${to}_by${from}`]
      const cube = state.cube[`${to}s`]
      return h('td', [
        h('ul', Array.from(link.set.entries(), ([external, node]) =>
          Array.from(node.indicies, index =>
            h('li', `${external} (${node.count}) => ${cube.i2id(index)} (${link.filterindex.get(index)})`))))
      ])
    }
    const empty = () => h('td', [])
    return h('table', [
      h('tr', [
        h('th', 'O'),
        h('th', 'OP'),
        h('th', 'PO'),
        h('th', 'P'),
        h('th', 'PS'),
        h('th', 'SP'),
        h('th', 'S')
      ]),
      h('tr', [
        cube('order'),
        link('product', 'order'),
        link('order', 'product'),
        cube('product'),
        link('supplier', 'product'),
        link('product', 'supplier'),
        cube('supplier')
      ]),
      ...state.cube.traces.map(trace => {
        const tracelink = (from, to) => h('td', [
          h('ul', trace
            .filter(t => t.op.indexOf('link') != -1
              && t.source == from[0]
              && t.target == to[0])
            .map(t => h('li', `${t.count} ${t.op[0]} ${t.key} => ${t.index} (${t.current})`)))
        ])
        const tracecube = id => h('td', [
          h('ul', trace
            .filter(t => t.op.indexOf('ref') != -1
              && t.target == id)
            .map(t => h('li', `${t.count} ${t.op[0]} ${t.index} (${t.current})`)))
        ])
        return h('tr', [
          tracecube('o'),
          tracelink('product', 'order'),
          tracelink('order', 'product'),
          tracecube('p'),
          tracelink('supplier', 'product'),
          tracelink('product', 'supplier'),
          tracecube('s')
        ])
      })
    ])
  }
})
