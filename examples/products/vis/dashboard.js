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
    const countrybysupplierspend = objstats(state.cube.countrybysupplierspend)
    const countrybysupplierspendfiltered = countrybysupplierspend.rows
      .filter(s => s.value > 0.1)
    const countrybycustomerspend = objstats(state.cube.countrybycustomerspend)
    const countrybycustomerspendfiltered = countrybycustomerspend.rows
      .filter(s => s.value > 0.1)
    const supplierbyspend = objstats(state.cube.supplierbyspend)
    supplierbyspend.rows = supplierbyspend.rows.filter(s => s.value > 0.1)
    const customerbyspend = objstats(state.cube.customerbyspend)
    customerbyspend.rows = customerbyspend.rows.filter(s => s.value > 0.1)
    const productbyunits = objstats(state.cube.productbyunits)
    productbyunits.rows = productbyunits.rows.filter(s => s.value != 0)
    const countrybyspendposition = objstats(state.cube.countrybyspendposition)
    countrybyspendposition.rows = countrybyspendposition.rows
      .filter(s => s.value > 0.1 || s.value < -0.1)
    const spendpositionmin = -Math.min(countrybyspendposition.min, 0)
    const spendpositionabs = countrybyspendposition.max + spendpositionmin
    const spendpositionminratio = spendpositionmin / spendpositionabs
    const spendpositionmaxratio = (spendpositionabs - spendpositionmin) / spendpositionabs

    return h('div', [
      h('div.box', [
        h('h2', [
          'Countries by supplier spend ',
          h('small', `${countrybysupplierspendfiltered.length}/${countrybysupplierspend.rows.length}`)
        ]),
        state.filters.supplierbycountry
          ? h('a', { on: { click: emit('filter supplier by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbycountry}`)
          : [],
        h('ul', countrybysupplierspendfiltered
          .map(s => h('li', [ h('a', { on: { click: emit('filter supplier by country', s.key) }, attrs: { href: '#' } }, [
            h('span.bar', { style: { width: `${100 * s.value / countrybysupplierspend.max}px` } }),
            `${s.key}: ${numeral(s.value).format('$0,0')}`
          ])])))
      ]),
      h('div.box', [
        h('h2', [
          'Countries by customer spend ',
          h('small', `${countrybycustomerspendfiltered.length}/${countrybycustomerspend.rows.length}`)
        ]),
        state.filters.customerbycountry
          ? h('a', { on: { click: emit('filter customer by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.customerbycountry}`)
          : [],
        h('ul', countrybycustomerspendfiltered
          .map(s => h('li', [ h('a', { on: { click: emit('filter customer by country', s.key) }, attrs: { href: '#' } }, [
            h('span.bar', { style: { width: `${100 * s.value / countrybycustomerspend.max}px` } }),
            `${s.key}: ${numeral(s.value).format('$0,0')}`
          ])])))
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
          .map(s => h('li', [ h('a', { on: { click: emit('filter supplier by id', s.key) }, attrs: { href: '#' } }, [
            h('span.bar', { style: { width: `${100 * s.value / supplierbyspend.max}px` } }),
            `${state.cube.supplier_desc(s.key)}: ${numeral(s.value).format('$0,0')}`
          ])])))
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
          .map(s => h('li', [ h('a', { on: { click: emit('filter customer by id', s.key) }, attrs: { href: '#' } }, [
            h('span.bar', { style: { width: `${100 * s.value / customerbyspend.max}px` } }),
            `${state.cube.customer_desc(s.key)}: ${numeral(s.value).format('$0,0')}`
          ])])))
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
          .map(s => h('li', [ h('a', { on: { click: emit('filter product by id', s.key) }, attrs: { href: '#' } }, [
            h('span.bar', { style: { width: `${100 * s.value / productbyunits.max}px` } }),
            `${state.cube.product_desc(s.key)}: ${s.value}`
          ])])))
      ]),
      h('div.box', [
        h('h2', 'Countries by spend position '),
        h('ul', countrybyspendposition.rows
          .map(s => h('li', [
            s.value < 0
            ? [
              h('span.bar.blank', { style: { width: `${100 * (spendpositionmin + s.value) / spendpositionabs}px` } }),
              h('span.bar.red', { style: { width: `${100 * -s.value / spendpositionabs}px` } })
            ]
            : h('span.bar.blank', { style: { width: `${100 * spendpositionminratio}px` } }),
            s.value > 0
            ? h('span.bar.green', { style: { width: `${100 * s.value / spendpositionabs}px` } })
            : null,
            `${s.key}: ${numeral(s.value).format('$0,0')}`
          ].flat())))
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
            ...countrybysupplierspendfiltered.map(sc =>
              h('th', sc.key))
          ])]),
          h('tbody', countrybycustomerspendfiltered.map(cc =>
            h('tr', [
              h('th', cc.key),
              ...countrybysupplierspendfiltered.map(sc =>
                h('td', (pathie.get(state.cube.countrymovements, [sc.key, cc.key]) || 0).toString()))
            ])))
        ])
      ])
    ])
  }
})
