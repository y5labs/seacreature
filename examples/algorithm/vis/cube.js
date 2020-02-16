import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const Cube = require('seacreature/analytics/cube')
const numeral = require('numeral')

inject('pod', ({ hub, state }) => {
  hub.on('load cube', async () => {
    if (state.cube) return

    const data = {
      suppliers: [
        { Id: 'Bottle-O' },
        { Id: 'Vege Bin' }
      ],
      products: [
        { Id: 'Drink', SupplierId: 'Bottle-O' },
        { Id: 'Oranges', SupplierId: 'Vege Bin' },
        { Id: 'Eggplant', SupplierId: 'Vege Bin' }
      ],
      orders: [
        { Id: 1, CustomerId: 'Paul', ProductIds: ['Drink'] },
        { Id: 2, CustomerId: 'Andy', ProductIds: ['Drink'] },
        { Id: 3, CustomerId: 'Mary', ProductIds: ['Drink', 'Oranges'] },
        { Id: 4, CustomerId: 'Mary', ProductIds: ['Eggplant'] },
        { Id: 5, CustomerId: 'Sue', ProductIds: ['Eggplant'] }
      ],
      customers: [
        { Id: 'Paul' },
        { Id: 'Andy' },
        { Id: 'Mary' },
        { Id: 'Sue' }
      ]
    }

    state.cube = {
      suppliers: Cube(s => s.Id),
      products: Cube(p => p.Id),
      orders: Cube(o => o.Id),
      customers: Cube(c => c.Id)
    }

    state.cube.supplier_byid = state.cube.suppliers.range_single(s => s.Id)
    state.cube.supplier_byproduct = state.cube.suppliers.backward_link(state.cube.products, s => state.cube.product_bysupplier.lookup(s.Id))

    state.cube.product_byid = state.cube.products.range_single(p => p.Id)
    state.cube.product_bysupplier = state.cube.products.forward_link(state.cube.suppliers, p => [p.SupplierId])
    state.cube.product_byorder = state.cube.products.backward_link(state.cube.orders, p => state.cube.order_byproduct.lookup(p.Id))

    state.cube.order_byid = state.cube.orders.range_single(o => o.Id)
    state.cube.order_byproduct = state.cube.orders.forward_link(state.cube.products, o => o.ProductIds)
    state.cube.order_bycustomer = state.cube.orders.forward_link(state.cube.customers, o => [o.CustomerId])

    state.cube.customer_byid = state.cube.customers.range_single(cu => cu.Id)
    state.cube.customer_byorder = state.cube.customers.backward_link(state.cube.orders, cu => state.cube.order_bycustomer.lookup(cu.Id))

    const diff = {}
    for (const key of Object.keys(data))
      diff[key] = await state.cube[key].batch({ put: data[key] })
    for (const key of Object.keys(diff))
      await state.cube[key].batch_calculate_link_change(diff[key].link_change)
    for (const key of Object.keys(diff))
      await state.cube[key].batch_calculate_selection_change(diff[key].selection_change)

    await hub.emit('calculate projections')
  })
})
