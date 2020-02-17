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

    const zipped = {
      supplier: {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
        total: 0
      },
      position: {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
        total: 0
      },
      customer: {
        min: Infinity,
        max: -Infinity,
        sum: 0,
        count: 0,
        total: 0
      },
      entries: {}
    }

    const zip = (obj, index) => {
      for (const key of Object.keys(obj)) {
        zipped[index].total++
        const value = obj[key]
        if (value < 0.1 && value > -0.1) continue
        zipped[index].count++
        zipped[index].max = Math.max(zipped[index].max, value)
        zipped[index].min = Math.min(zipped[index].min, value)
        zipped[index].sum += value
        if (!zipped.entries[key]) zipped.entries[key] = {
          key,
          supplier: 0,
          position: 0,
          customer: 0
        }
        zipped.entries[key][index] = value
      }
    }

    zip(state.cube.countrybysupplierspend, 'supplier')
    zip(state.cube.countrybycustomerspend, 'customer')
    zip(state.cube.countrybyspendposition, 'position')

    const spendpositionmin = -Math.min(zipped.position.min, 0)
    const spendpositionabs = zipped.position.max + spendpositionmin

    zipped.rows = Object.values(zipped.entries)
    const filterby = index => (a, b) =>
      a[index] > b[index] ? -1
      : a[index] < b[index] ? 1
      : 0
    zipped.rows.sort(filterby(state.filters.countrysort))

    const countrybysupplierspend = objstats(state.cube.countrybysupplierspend)
    const countrybysupplierspendfiltered = countrybysupplierspend.rows
      .filter(s => s.value > 0.1 || s.value < -0.1)
    const countrybycustomerspend = objstats(state.cube.countrybycustomerspend)
    const countrybycustomerspendfiltered = countrybycustomerspend.rows
      .filter(s => s.value > 0.1 || s.value < -0.1)
    const countrybyspendposition = objstats(state.cube.countrybyspendposition)
    countrybyspendposition.rows = countrybyspendposition.rows
      .filter(s => s.value > 0.1 || s.value < -0.1)

    const supplierbyspend = objstats(state.cube.supplierbyspend)
    supplierbyspend.rows = supplierbyspend.rows.filter(s => s.value > 0.1)
    const customerbyspend = objstats(state.cube.customerbyspend)
    customerbyspend.rows = customerbyspend.rows.filter(s => s.value > 0.1)
    const productbyunits = objstats(state.cube.productbyunits)
    productbyunits.rows = productbyunits.rows.filter(s => s.value != 0)

    return h('div', [
      h('div.box', [
        state.filters.supplierbycountry
          ? h('div', [ h('a', { on: { click: emit('filter supplier by country', null) }, attrs: { href: '#' } }, `Clear suppliers from ${state.filters.supplierbycountry}`)])
          : [],
        state.filters.supplierbyid
          ? h('div', [ h('a', { on: { click: emit('filter supplier by id', null) }, attrs: { href: '#' } }, `Clear supplier ${state.cube.supplier_desc(state.filters.supplierbyid)}`)])
          : [],
        state.filters.customerbycountry
          ? h('div', [ h('a', { on: { click: emit('filter customer by country', null) }, attrs: { href: '#' } }, `Clear customers from ${state.filters.customerbycountry}`)])
          : [],
        state.filters.customerbyid
          ? h('div', [ h('a', { on: { click: emit('filter customer by id', null) }, attrs: { href: '#' } }, `Clear customer ${state.cube.customer_desc(state.filters.customerbyid)}`)])
          : [],
        state.filters.productbyid
          ? h('div', [ h('a', { on: { click: emit('filter product by id', null) }, attrs: { href: '#' } }, `Clear product ${state.cube.product_desc(state.filters.productbyid)}`)])
          : [],
        state.filters.orderitembyid
          ? h('div', [ h('a', { on: { click: emit('filter orderitem by id', null) }, attrs: { href: '#' } }, `Clear orderitem ${state.cube.orderitem_desc(state.filters.orderitembyid)}`)])
          : []
      ]),
      h('div.box', [
        h('table', [
          h('tr', [
            h('th', []),
            h('th', { attrs: { colspan: 3 } }, [
              h('h2', [h('a', { on: { click: emit('sort country by', 'supplier') }, attrs: { href: '#' } }, [
                'Supplier spend ',
                h('small', `${zipped.supplier.count}/${zipped.supplier.total}`)
              ])]),
              state.filters.supplierbycountry
                ? h('a', { on: { click: emit('filter supplier by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbycountry}`)
                : []
            ]),
            h('th', { attrs: { colspan: 2 } }, [
              h('h2', [h('a', { on: { click: emit('sort country by', 'position') }, attrs: { href: '#' } }, 'Spend position ')])
            ]),
            h('th', { attrs: { colspan: 3 } }, [
              h('h2', [h('a', { on: { click: emit('sort country by', 'customer') }, attrs: { href: '#' } }, [
                'Customer spend ',
                h('small', `${countrybycustomerspendfiltered.length}/${countrybycustomerspend.rows.length}`)
              ])]),
              state.filters.customerbycountry
                ? h('a', { on: { click: emit('filter customer by country', null) }, attrs: { href: '#' } }, `Clear ${state.filters.customerbycountry}`)
                : []
            ])
          ]),
          ...zipped.rows.map(d =>
            h('tr', [
              h('td', d.key),
              h('td.d', [
                d.supplier != 0
                ? h('a', { on: { click: emit('filter supplier by country', d.key) }, attrs: { href: '#' } }, [
                  numeral(d.supplier).format('$0,0')
                ])
                : null
              ]),
              h('td.d', [
                (state.cube.countrybysuppliercount[d.key] || '').toString()
              ]),
              h('td', [
                d.supplier != 0
                ? h('span.bar', { style: { width: `${100 * d.supplier / zipped.supplier.max}px` } })
                : null
              ]),
              h('td.d', [
                numeral(d.position).format('$0,0')
              ]),
              h('td', [
                d.position < 0
                ? [
                  h('span.bar.blank', { style: { width: `${100 * (spendpositionmin + d.position) / spendpositionabs}px` } }),
                  h('span.bar.red', { style: { width: `${100 * -d.position / spendpositionabs}px` } })
                ]
                : h('span.bar.blank', { style: { width: `${100 * spendpositionmin / spendpositionabs}px` } }),
                d.position > 0
                ? h('span.bar.green', { style: { width: `${100 * d.position / spendpositionabs}px` } })
                : null
              ]),
              h('td.d', [
                d.customer != 0
                ? h('a', { on: { click: emit('filter customer by country', d.key) }, attrs: { href: '#' } }, [
                  numeral(d.customer).format('$0,0')
                ])
                : null
              ]),
              h('td.d', [
                (state.cube.countrybycustomercount[d.key] || '').toString()
              ]),
              h('td', [
                d.customer != 0
                ? h('span.bar', { style: { width: `${100 * d.customer / zipped.customer.max}px` } })
                : null
              ])
            ]))
          ])
      ]),
      h('div.cols', [
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
        ])
      ]),
      h('div.cols', [
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
        ])
      ]),
      h('div.box', [
        h('h2', 'Customers (rows) by product (columns)'),
        state.filters.customerbyid
          ? h('div', [h('a', { on: { click: emit('filter customer by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.customer_desc(state.filters.customerbyid)}`)])
          : [],
        state.filters.productbyid
          ? h('div', [h('a', { on: { click: emit('filter product by id', null) }, attrs: { href: '#' } }, `Clear ${state.cube.product_desc(state.filters.productbyid)}`)])
          : [],
        h('table', [
          h('thead', [h('tr.rotate.large', [
            h('th', ''),
            ...productbyunits.rows.map(p =>
              h('th', [ h('div', [h('a', { on: { click: emit('filter product by id', p.key) }, attrs: { href: '#' } }, [ state.cube.product_desc(p.key) ])])]))
          ])]),
          h('tbody', customerbyspend.rows.map(c =>
            h('tr', [
              h('th', [h('a', { on: { click: emit('filter customer by id', c.key) }, attrs: { href: '#' } }, [ state.cube.customer_desc(c.key) ])]),
              ...productbyunits.rows.map(p =>
                h('td.d', [ h('a', { on: { click: emit('filter customer and product by id', { CustomerId: c.key, ProductId: p.key }) }, attrs: { href: '#' } }, [(pathie.get(state.cube.productsbycustomer, [c.key, p.key]) || 0).toString()])]))
            ])))
        ])
      ]),
      h('div.box', [
        h('h2', 'Customer country (rows) by supplier country (columns)'),
        state.filters.customerbycountry
          ? h('div', [ h('a', { on: { click: emit('filter customer by country', null) }, attrs: { href: '#' } }, `Clear customers from ${state.filters.customerbycountry}`)])
          : [],
        state.filters.supplierbycountry
          ? h('div', [ h('a', { on: { click: emit('filter supplier by country', null) }, attrs: { href: '#' } }, `Clear suppliers from ${state.filters.supplierbycountry}`)])
          : [],
        h('table', [
          h('thead', [h('tr.rotate.small', [
            h('th', ''),
            ...countrybysupplierspendfiltered.map(sc =>
              h('th', [ h('div', [h('a', { on: { click: emit('filter supplier by country', sc.key) }, attrs: { href: '#' } }, [ sc.key ])])]))
          ])]),
          h('tbody', countrybycustomerspendfiltered.map(cc =>
            h('tr', [
              h('td', [ h('a', { on: { click: emit('filter customer by country', cc.key) }, attrs: { href: '#' } }, [ cc.key ])]),
              ...countrybysupplierspendfiltered.map(sc =>
                h('td.d', [ h('a', { on: { click: emit('filter supplier and customer by country', { SupplierCountry: sc.key, CustomerCountry: cc.key }) }, attrs: { href: '#' } }, [(pathie.get(state.cube.countrymovements, [sc.key, cc.key]) || 0).toString()])]))
            ])))
        ])
      ])
    ])
  }
})
