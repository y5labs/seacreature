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
    return h('div.cols', [
      h('div.box', [
        h('h2', 'Orders'),
        state.filters.orderbyid
          ? h('a', { on: { click: emit('filter order by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.orderbyid}`)
          : [],
        h('ul', Array.from(state.cube.order_byid.highlighted(Infinity),
          s => h('li', [ h('a', { on: { click: emit('filter order by id', s[0]) }, attrs: { href: '#' } }, s[1].Id)])))
      ]),
      h('div.box', [
        h('h2', 'Products'),
        state.filters.productbyid
          ? h('a', { on: { click: emit('filter product by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.productbyid}`)
          : [],
        h('ul', Array.from(state.cube.product_byid.highlighted(Infinity),
          s => h('li', [ h('a', { on: { click: emit('filter product by id', s[0]) }, attrs: { href: '#' } }, s[1].Id)])))
      ]),
      h('div.box', [
        h('h2', 'Suppliers'),
        state.filters.supplierbyid
          ? h('a', { on: { click: emit('filter supplier by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbyid}`)
          : [],
        h('ul', Array.from(state.cube.supplier_byid.highlighted(Infinity),
          s => h('li', [ h('a', { on: { click: emit('filter supplier by id', s[0]) }, attrs: { href: '#' } }, s[1].Id)])))
      ])
    ])
  }
})
