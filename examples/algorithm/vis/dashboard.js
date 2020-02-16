import component from '../lib/component'

export default component({
  name: 'dasboard',
  module,
  query: ({ hub, props }) => hub.emit('load cube'),
  render: (h, { props, hub, state, route, router }) => {
    const emit = (...args) => e => {
      e.preventDefault()
      hub.emit(...args)
    }
    return h('div', [
      h('div.cols', [
        h('div.box', [
          h('h2', 'Suppliers'),
          state.filters.supplierbyid
            ? h('a', { on: { click: emit('filter supplier by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbyid}`)
            : [],
          h('ul', Array.from(state.cube.supplier_byid.filtered(Infinity),
            s => h('li', [ h('a', { on: { click: emit('filter supplier by id', s[1].Id) }, attrs: { href: '#' } }, s[1].Id)])))
        ]),
        h('div.box', [
          h('h2', 'Products'),
          state.filters.productbyid
            ? h('a', { on: { click: emit('filter product by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.productbyid}`)
            : [],
          h('ul', Array.from(state.cube.product_byid.filtered(Infinity),
            s => h('li', [ h('a', { on: { click: emit('filter product by id', s[1].Id) }, attrs: { href: '#' } }, s[1].Id)])))
        ]),
        h('div.box', [
          h('h2', 'Orders'),
          state.filters.orderbyid
            ? h('a', { on: { click: emit('filter order by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.orderbyid}`)
            : [],
          h('ul', Array.from(state.cube.order_byid.filtered(Infinity),
            s => h('li', [ h('a', { on: { click: emit('filter order by id', s[1].Id) }, attrs: { href: '#' } }, [
              s[1].Id,
              ' ',
              s[1].CustomerId,
              ' ',
              s[1].ProductIds.join(', ')
            ])])))
        ]),
        h('div.box', [
          h('h2', 'Customers'),
          state.filters.customerbyid
            ? h('a', { on: { click: emit('filter customer by id', null) }, attrs: { href: '#' } }, `Clear ${state.filters.customerbyid}`)
            : [],
          h('ul', Array.from(state.cube.customer_byid.filtered(Infinity),
            cu => h('li', [ h('a', { on: { click: emit('filter customer by id', cu[1].Id) }, attrs: { href: '#' } }, cu[1].Id)])))
        ])
      ])
    ])
  }
})
