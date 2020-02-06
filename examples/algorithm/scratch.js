(async () => {

const { PerformanceObserver, performance } = require('perf_hooks')

let perf_entry = null
new PerformanceObserver((items) => {
  items.getEntries().forEach(e => perf_entry = e)
  performance.clearMarks()
})
.observe({ entryTypes: ['measure'] })

let last = null

const perf = state => {
  if (!state) {
    last = 'start'
    performance.mark('start')
    return null
  }

  if (!last) {
    last = state
    performance.mark(state)
    return null
  }

  performance.mark(state)
  performance.measure(state, last, state)
  // console.log(`${(perf_entry.duration / 1000).toFixed(4)}s — ${perf_entry.name}`)
  performance.mark(state)
  last = state
  return perf_entry
}

const Cube = require('seacreature/analytics/cube')
const data = {
  Suppliers: [
    { Id: 'Bottle-O' },
    { Id: 'Vege Bin' }
  ],
  Products: [
    { Id: 'Beer', SupplierId: 'Bottle-O' },
    { Id: 'Oranges', SupplierId: 'Vege Bin' },
    { Id: 'Apples', SupplierId: 'Vege Bin' }
  ],
  Orders: [
    { Id: 1, CustomerId: 'Bob', ProductIds: ['Beer'] },
    { Id: 2, CustomerId: 'Bruce', ProductIds: ['Beer'] },
    { Id: 3, CustomerId: 'Mary', ProductIds: ['Beer', 'Oranges'] },
    { Id: 4, CustomerId: 'Mary', ProductIds: ['Apples'] },
    { Id: 5, CustomerId: 'Sue', ProductIds: ['Apples'] }
  ],
  Customers: [
    { Id: 'Bob' },
    { Id: 'Bruce' },
    { Id: 'Mary' },
    { Id: 'Sue' }
  ]
}

perf()

const c = {
  suppliers: Cube(s => s.Id),
  products: Cube(p => p.Id),
  orders: Cube(o => o.Id),
  customers: Cube(c => c.Id)
}

const supplier_byid = c.suppliers.range_single(s => s.Id)
const supplier_byproduct = c.suppliers.link(c.products, s => product_bysupplier.lookup(s.Id))

const product_byid = c.products.range_single(p => p.Id)
const product_bysupplier = c.products.link(c.suppliers, p => [p.SupplierId])
const product_byorder = c.products.link(c.orders, p => order_byproduct.lookup(p.Id))

const order_byid = c.orders.range_single(o => o.Id)
const order_byproduct = c.orders.link(c.products, o => o.ProductIds)
const order_bycustomer = c.orders.link(c.customers, o => [o.CustomerId])

const customer_byid = c.customers.range_single(c => c.Id)
const customer_byorder = c.customers.link(c.orders, c => order_bycustomer.lookup(c.Id))

const suppliers_indicies = await c.suppliers.batch({ put: data.Suppliers })
const products_indicies = await c.products.batch({ put: data.Products })
const orders_indicies = await c.orders.batch({ put: data.Orders })
const customers_indicies = await c.customers.batch({ put: data.Customers })
await c.suppliers.batch_calculate_selection_change(suppliers_indicies)
await c.products.batch_calculate_selection_change(products_indicies)
await c.orders.batch_calculate_selection_change(orders_indicies)
await c.customers.batch_calculate_selection_change(customers_indicies)

const cubes = ['suppliers', 'products', 'orders', 'customers']
const padding = 24
let count = 0
const print = msg => {
  const e = perf((count++).toString())
  console.log(cubes.map(id => Array.from(c[id].filtered(Infinity)).map(c[id].identity).join(', ').padStart(padding, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`, `    ${msg}`)
}

console.log(cubes.map(id => id.padStart(padding, ' ')).join(''), '   duration')

// Scenario 2
print()
await product_byid('Beer')
print('product_byid(Beer)')
await customer_byid('Mary')
print('customer_byid(Mary)')
await product_byid(null)
print('product_byid(null)')
await customer_byid(null)
print('customer_byid(null)')

})()