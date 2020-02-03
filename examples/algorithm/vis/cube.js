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
    c.products = Cube(p => p.Id)
    c.orders = Cube(o => o.Id)

    c.supplier_byid = c.suppliers.range_single(s => s.Id)
    c.supplier_byproduct = c.suppliers.link(c.products, s => c.product_bysupplier.lookup(s.Id))

    c.product_byid = c.products.range_single(p => p.Id)
    c.product_bysupplier = c.products.link(c.suppliers, p => [p.SupplierId])
    c.product_byorder = c.products.link(c.orders, p => c.order_byproduct.lookup(p.Id))

    c.order_byid = c.orders.range_single(o => o.Id)
    c.order_byproduct = c.orders.link(c.products, o => o.ProductIds)

    c.traces = []

    const orders_indicies = await c.orders.batch({ put: data.Orders })
    const products_indicies = await c.products.batch({ put: data.Products })
    const suppliers_indicies = await c.suppliers.batch({ put: data.Suppliers })

    await c.suppliers.batch_calculate_selection_change(suppliers_indicies)
    await c.products.batch_calculate_selection_change(products_indicies)
    await c.orders.batch_calculate_selection_change(orders_indicies)


    let count = 1
    let current = []
    hub.on('push trace', () => {
      c.traces.push(current)
      current = []
    })
    const rec = async p => {
      p.count = count
      count++
      current.push(p)
    }
    c.suppliers.on('trace', rec)
    c.products.on('trace', rec)
    c.orders.on('trace', rec)

    // await c.order_byid('Sue')
    // state.filters.orderbyid = 'Sue'
    // await c.product_byid('Oranges')
    // state.filters.productbyid = 'Oranges'
    // await c.supplier_byid('Vege Bin')
    // state.filters.supplierbyid = 'Vege Bin'
    // await c.product_byid(null)
    // delete state.filters.productbyid
    // await c.order_byid(null)
    // delete state.filters.orderbyid


    // await c.supplier_byid('Vege Bin')
    // state.filters.supplierbyid = 'Vege Bin'
    // await hub.emit('push trace')
    // await c.supplier_byid(null)
    // delete state.filters.supplierbyid

    await hub.emit('push trace')
  })
})
