import component from '../lib/component'
import objstats from 'seacreature/lib/objstats'

export default component({
  name: 'dasboard',
  module,
  query: ({ hub, props }) => hub.emit('load cube'),
  render: (h, { props, hub, state, route, router }) => {
    const countrybysuppliercount = objstats(state.cube.countrybysuppliercount)
    const countrybysuppliercountfiltered = countrybysuppliercount.rows.filter(s => s.value != 0)
    const countrybycustomercount = objstats(state.cube.countrybycustomercount)
    const countrybycustomercountfiltered = countrybycustomercount.rows.filter(s => s.value != 0)
    const clearsupplierbycountry = e => {
      e.preventDefault()
      hub.emit('filter supplier by country', null)
    }
    const clearcustomerbycountry = e => {
      e.preventDefault()
      hub.emit('filter customer by country', null)
    }
    const supplierbyspend = objstats(state.cube.supplierbyspend)
    const clearsupplierbyid = e => {
      e.preventDefault()
      hub.emit('filter supplier by id', null)
    }
    const customerbyspend = objstats(state.cube.customerbyspend)
    const clearcustomerbyid = e => {
      e.preventDefault()
      hub.emit('filter customer by id', null)
    }
    const productbyunits = objstats(state.cube.productbyunits)
    const clearproductbyid = e => {
      e.preventDefault()
      hub.emit('filter product by id', null)
    }
    const countrybyspendposition = objstats(state.cube.countrybyspendposition)
    return h('div', [
      h('div.box', [
        h('h2', [
          'Countries by supplier count ',
          h('small', `${countrybysuppliercountfiltered.length}/${countrybysuppliercount.rows.length}`)
        ]),
        state.filters.supplierbycountry
          ? h('a', { on: { click: clearsupplierbycountry }, attrs: { href: '#' } }, `Clear ${state.filters.supplierbycountry}`)
          : [],
        h('ul', countrybysuppliercountfiltered.map(s => {
          const click = e => {
            e.preventDefault()
            hub.emit('filter supplier by country', s.key)
          }
          if (s.value == 0) return []
          return h('li', [ h('a', { on: { click }, attrs: { href: '#' } },
            countrybysuppliercount.sum > 0
              ? `${s.key}: ${(s.value / countrybysuppliercount.sum * 100).toFixed(0)}%`
              : `${s.key}: 0%`
          )])
        }))
      ]),
      h('div.box', [
        h('h2', [
          'Countries by customer count ',
          h('small', `${countrybycustomercountfiltered.length}/${countrybycustomercount.rows.length}`)
        ]),
        state.filters.customerbycountry
          ? h('a', { on: { click: clearcustomerbycountry }, attrs: { href: '#' } }, `Clear ${state.filters.customerbycountry}`)
          : [],
        h('ul', countrybycustomercountfiltered.map(s => {
          const click = e => {
            e.preventDefault()
            hub.emit('filter customer by country', s.key)
          }
          if (s.value == 0) return []
          return h('li', [ h('a', { on: { click }, attrs: { href: '#' } },
            countrybycustomercount.sum > 0
              ? `${s.key}: ${(s.value / countrybycustomercount.sum * 100).toFixed(0)}%`
              : `${s.key}: 0%`
          )])
        }))
      ]),
      h('div.box', [
        h('h2', [
          'Suppliers by spend ',
          h('small', `${state.cube.counts.supplier.selected}/${state.cube.counts.supplier.total}`)
        ]),
        state.filters.supplierbyid
          ? h('a', { on: { click: clearsupplierbyid }, attrs: { href: '#' } }, `Clear ${state.cube.supplier_id2d(state.filters.supplierbyid).CompanyName}`)
          : [],
        h('ul', supplierbyspend.rows.map(s => {
          const click = e => {
            e.preventDefault()
            hub.emit('filter supplier by id', s.key)
          }
          if (s.value < 0.1) return []
          return h('li', [ h('a', { on: { click }, attrs: { href: '#' } },
            `${state.cube.supplier_id2d(s.key).CompanyName}: $${s.value.toFixed(0)}`)])
        }))
      ]),
      h('div.box', [
        h('h2', [
          'Customers by spend ',
          h('small', `${state.cube.counts.customer.selected}/${state.cube.counts.customer.total}`)
        ]),
        state.filters.customerbyid
          ? h('a', { on: { click: clearcustomerbyid }, attrs: { href: '#' } }, `Clear ${state.cube.customer_id2d(state.filters.customerbyid).FirstName} ${state.cube.customer_id2d(state.filters.customerbyid).LastName}`)
          : [],
        h('ul', customerbyspend.rows.map(s => {
          const click = e => {
            e.preventDefault()
            hub.emit('filter customer by id', s.key)
          }
          if (s.value < 0.1) return []
          return h('li', [ h('a', { on: { click }, attrs: { href: '#' } },
            `${state.cube.customer_id2d(s.key).FirstName} ${state.cube.customer_id2d(s.key).LastName}: $${s.value.toFixed(0)}`)])
        }))
      ]),
      h('div.box', [
        h('h2', [
          'Products by units ',
          h('small', `${state.cube.counts.product.selected}/${state.cube.counts.product.total}`)
        ]),
        state.filters.productbyid
          ? h('a', { on: { click: clearproductbyid }, attrs: { href: '#' } }, `Clear ${state.cube.product_id2d(state.filters.productbyid).ProductName}`)
          : [],
        h('ul', productbyunits.rows.map(s => {
          const click = e => {
            e.preventDefault()
            hub.emit('filter product by id', s.key)
          }
          if (s.value == 0) return []
          return h('li', [ h('a', { on: { click }, attrs: { href: '#' } },
            `${state.cube.product_id2d(s.key).ProductName}: ${s.value}`)])
        }))
      ]),
      h('div.box', [
        h('h2', 'Countries by spend position '),
        h('ul', countrybyspendposition.rows.map(s => {
          if (s.value < 0.1 && s.value > -0.1) return []
          return h('li', `${s.key}: $${s.value.toFixed(0)}`)
        }))
      ])
    ])
  }
})
