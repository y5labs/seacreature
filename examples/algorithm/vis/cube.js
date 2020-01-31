import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const Cube = require('seacreature/analytics/cube')
const numeral = require('numeral')

let c = null

inject('pod', ({ hub, state }) => {
  hub.on('load cube', async () => {
    if (c) return
    state.cube = c = {}
    state.filters = {}

    const data = {
      Orders: [
        { Id: 'Bob', ProductIds: ['Beer'] },
        { Id: 'Bruce', ProductIds: ['Beer'] },
        { Id: 'Sue', ProductIds: ['Oranges'] },
        { Id: 'Mary', ProductIds: ['Apples', 'Beer'] }
      ],
      Products: [
        { Id: 'Beer', SupplierId: 'Bottle-O' },
        { Id: 'Oranges', SupplierId: 'Vege Bin' },
        { Id: 'Apples', SupplierId: 'Vege Bin' }
      ],
      Suppliers: [
        { Id: 'Bottle-O' },
        { Id: 'Vege Bin' }
      ]
    }

    c.suppliers = Cube(s => s.Id)
    c.supplier_byid = c.suppliers.range_single(s => s.Id)
    c.supplier_byproduct = c.suppliers.link_multiple(s => c.product_bysupplier.lookup(s.Id))

    c.products = Cube(p => p.Id)
    c.product_byid = c.products.range_single(p => p.Id)
    c.product_bysupplier = c.products.link_multiple(p => [p.SupplierId])
    c.product_byorder = c.products.link_multiple(p => c.order_byproduct.lookup(p.Id))

    c.orders = Cube(o => o.Id)
    c.order_byid = c.orders.range_single(o => o.Id)
    c.order_byproduct = c.orders.link_multiple(o => o.ProductIds)

    c.products.link_to(c.suppliers, c.supplier_byproduct)
    c.suppliers.link_to(c.products, c.product_bysupplier)
    c.products.link_to(c.orders, c.order_byproduct)
    c.orders.link_to(c.products, c.product_byorder)

    c.traces = []
    let count = 1
    let current = []
    hub.on('push trace', () => {
      c.traces.push(current)
      current = []
    })
    const increment = p => {
      p.count = count
      count++
      current.push(p)
    }
    c.suppliers.on('trace', increment)
    c.products.on('trace', increment)
    c.orders.on('trace', increment)

    const orders_indicies = await c.orders.batch({ put: data.Orders })
    const products_indicies = await c.products.batch({ put: data.Products })
    const suppliers_indicies = await c.suppliers.batch({ put: data.Suppliers })

    await c.suppliers.batch_calculate_selection_change(suppliers_indicies)
    await c.products.batch_calculate_selection_change(products_indicies)
    await c.orders.batch_calculate_selection_change(orders_indicies)

    hub.emit('push trace')
  })
})
