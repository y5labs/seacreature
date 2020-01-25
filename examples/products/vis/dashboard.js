import component from '../lib/component'
import objstats from 'seacreature/lib/objstats'
import numeral from 'numeral'
import pathie from 'seacreature/lib/pathie'

export default component({
  name: 'dasboard',
  module,
  query: ({ hub, props }) => hub.emit('load cube'),
  render: (h, { props, hub, state, route, router }) => {
    const countrybysuppliercount = objstats(state.cube.countrybysuppliercount)
    const countrybysuppliercountfiltered = countrybysuppliercount.rows
      .filter(s => s.value != 0)
    const countrybycustomercount = objstats(state.cube.countrybycustomercount)
    const countrybycustomercountfiltered = countrybycustomercount.rows
      .filter(s => s.value != 0)
    const emit = (...args) => e => {
      e.preventDefault()
      hub.emit(...args)
    }
    const supplierbyspend = objstats(state.cube.supplierbyspend)
    supplierbyspend.rows = supplierbyspend.rows.filter(s => s.value > 0.1)
    const customerbyspend = objstats(state.cube.customerbyspend)
    customerbyspend.rows = customerbyspend.rows.filter(s => s.value > 0.1)
    const productbyunits = objstats(state.cube.productbyunits)
    productbyunits.rows = productbyunits.rows.filter(s => s.value != 0)
    const countrybyspendposition = objstats(state.cube.countrybyspendposition)
    countrybyspendposition.rows = countrybyspendposition.rows
      .filter(s => s.value > 0.1 || s.value < -0.1)
    return h('div', [
      h('div.box', [
        h('h2', [
          'Countries by supplier count ',
          h('small', `${countrybysuppliercountfiltered.length}/${countrybysuppliercount.rows.length}`)
        ]),
        state.filters.supplierbycountry
          ? h('a', { on: { click: emit('filter supplier by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbycountry}`)
          : [],
        h('ul', countrybysuppliercountfiltered
          .filter(s => s.value != 0)
          .map(s => h('li', [ h('a', { on: { click: emit('filter supplier by country', s.key) }, attrs: { href: '#' } },
              countrybysuppliercount.sum > 0
                ? `${s.key}: ${(s.value / countrybysuppliercount.sum * 100).toFixed(0)}%`
                : `${s.key}: 0%`
            )])))
      ]),
      h('div.box', [
        h('h2', [
          'Countries by customer count ',
          h('small', `${countrybycustomercountfiltered.length}/${countrybycustomercount.rows.length}`)
        ]),
        state.filters.customerbycountry
          ? h('a', { on: { click: emit('filter customer by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.customerbycountry}`)
          : [],
        h('ul', countrybycustomercountfiltered
          .map(s => h('li', [ h('a', { on: { click: emit('filter customer by country', s.key) }, attrs: { href: '#' } },
              countrybycustomercount.sum > 0
                ? `${s.key}: ${(s.value / countrybycustomercount.sum * 100).toFixed(0)}%`
                : `${s.key}: 0%`
            )])))
      ]),
      h('div.box', [
        h('h2', [
          'Suppliers by spend ',
          h('small', `${state.cube.counts.supplier.selected}/${state.cube.counts.supplier.total}`)
        ]),
        state.filters.supplierbyid
          ? h('a', { on: { click: emit('filter supplier by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.supplier_desc(state.filters.supplierbyid)}`)
          : [],
        h('ul', supplierbyspend.rows
          .map(s => h('li', [ h('a', { on: { click: emit('filter supplier by id', s.key) }, attrs: { href: '#' } }, `${state.cube.supplier_desc(s.key)}: ${numeral(s.value).format('$0,0')}`)])))
      ]),
      h('div.box', [
        h('h2', [
          'Customers by spend ',
          h('small', `${state.cube.counts.customer.selected}/${state.cube.counts.customer.total}`)
        ]),
        state.filters.customerbyid
          ? h('a', { on: { click: emit('filter customer by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.customer_desc(state.filters.customerbyid)}`)
          : [],
        h('ul', customerbyspend.rows
          .map(s => h('li', [ h('a', { on: { click: emit('filter customer by id', s.key) }, attrs: { href: '#' } }, `${state.cube.customer_desc(s.key)}: ${numeral(s.value).format('$0,0')}`)])))
      ]),
      h('div.box', [
        h('h2', [
          'Products by units ',
          h('small', `${state.cube.counts.product.selected}/${state.cube.counts.product.total}`)
        ]),
        state.filters.productbyid
          ? h('a', { on: { click: emit('filter product by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.product_desc(state.filters.productbyid)}`)
          : [],
        h('ul', productbyunits.rows
          .map(s => h('li', [ h('a', { on: { click: emit('filter product by id', s.key) }, attrs: { href: '#' } }, `${state.cube.product_desc(s.key)}: ${s.value}`)])))
      ]),
      h('div.box', [
        h('h2', 'Countries by spend position '),
        h('ul', countrybyspendposition.rows
          .map(s => {
            const alt = state.cube.countrybyspendposition2[s.key]
              ? state.cube.countrybyspendposition2[s.key]
              : 0
            return h('li', `${s.key}: ${numeral(s.value).format('$0,0')} ${numeral(alt).format('$0,0')}`)
          }))
      ]),
      h('div.box', [
        h('h2', [
          'Top 50 Order Items by price ',
          h('small', `${state.cube.counts.orderitem.selected}/${state.cube.counts.orderitem.total}`)
        ]),
        state.filters.orderitembyid
          ? h('a', { on: { click: emit('filter orderitem by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.orderitem_desc(state.filters.orderitembyid)}`)
          : [],
        h('ul', Array.from(state.cube.orderitem_byprice.filtered(-50), s =>
          h('li', [ h('a', { on: { click: emit('filter orderitem by id', s[1].Id) }, attrs: { href: '#' } },
            `${state.cube.orderitem_desc(s[1].Id)}: ${numeral(s[0]).format('$0,0')}`)])))
      ]),
      h('div.box', [
        h('h2', 'Products by customers'),
        h('table', [
          h('thead', [h('tr', [
            h('th', ''),
            ...productbyunits.rows.map(p =>
              h('th', state.cube.product_desc(p.key)))
          ])]),
          h('tbody', customerbyspend.rows.map(c =>
            h('tr', [
              h('th', state.cube.customer_desc(c.key)),
              ...productbyunits.rows.map(p =>
                h('td', (pathie.get(state.cube.productsbycustomer, [c.key, p.key]) || 0).toString()))
            ])))
        ])
      ]),
      h('div.box', [
        h('h2', 'Supplier country (x) by customer country (y)'),
        h('table', [
          h('thead', [h('tr', [
            h('th', ''),
            ...countrybysuppliercountfiltered.map(sc =>
              h('th', sc.key))
          ])]),
          h('tbody', countrybycustomercountfiltered.map(cc =>
            h('tr', [
              h('th', cc.key),
              ...countrybysuppliercountfiltered.map(sc =>
                h('td', (pathie.get(state.cube.countrymovements, [sc.key, cc.key]) || 0).toString()))
            ])))
        ])
      ])
    ])
  }
})
