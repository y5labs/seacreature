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

const state = {
  suppliers: Cube(s => s.Id),
  products: Cube(p => p.Id),
  orders: Cube(o => o.Id),
  customers: Cube(c => c.Id)
}

state.supplier_byid = state.suppliers.range_single(s => s.Id)
state.supplier_byproduct = state.suppliers.link(state.products, s => state.product_bysupplier.lookup(s.Id))

state.product_byid = state.products.range_single(p => p.Id)
state.product_bysupplier = state.products.link(state.suppliers, p => [p.SupplierId])
state.product_byorder = state.products.link(state.orders, p => state.order_byproduct.lookup(p.Id))

state.order_byid = state.orders.range_single(o => o.Id)
state.order_byproduct = state.orders.link(state.products, o => o.ProductIds)
state.order_bycustomer = state.orders.link(state.customers, o => [o.CustomerId])

state.customer_byid = state.customers.range_single(c => c.Id)
state.customer_byorder = state.customers.link(state.orders, c => state.order_bycustomer.lookup(c.Id))

const suppliers_indicies = await state.suppliers.batch({ put: data.Suppliers })
const products_indicies = await state.products.batch({ put: data.Products })
const orders_indicies = await state.orders.batch({ put: data.Orders })
const customers_indicies = await state.customers.batch({ put: data.Customers })
await state.suppliers.batch_calculate_selection_change(suppliers_indicies)
await state.products.batch_calculate_selection_change(products_indicies)
await state.orders.batch_calculate_selection_change(orders_indicies)
await state.customers.batch_calculate_selection_change(customers_indicies)

const cubes = ['suppliers', 'products', 'orders', 'customers']
const padding = 24
let count = 0
const print_cubes = msg => {
  const e = perf((count++).toString())
  console.log(cubes.map(id => Array.from(state[id].filtered(Infinity)).map(state[id].identity).join(', ').padStart(padding, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`, `    ${msg}`)
}

console.log(cubes.map(id => id.padStart(padding, ' ')).join(''), '   duration')
print_cubes()
await state.product_byid('Beer')
print_cubes('product_byid(Beer)')
await state.customer_byid('Mary')
print_cubes('customer_byid(Mary)')
await state.product_byid(null)
print_cubes('product_byid(null)')
await state.customer_byid(null)
print_cubes('customer_byid(null)')

const links = ['supplier_byproduct', 'product_bysupplier', 'product_byorder', 'order_byproduct', 'order_bycustomer', 'customer_byorder']
const print_links = msg => {
  const e = perf((count++).toString())
  //console.log(links.map(id => Array.from(state[id].filterindex.map(state[id].identity).join(', ').padStart(padding, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`, `    ${msg}`)
}

console.log(links.map(id => id.padStart(padding, ' ')).join(''), '   duration')
print_cubes()
await state.product_byid('Beer')
print_cubes('product_byid(Beer)')
await state.customer_byid('Mary')
print_cubes('customer_byid(Mary)')
await state.product_byid(null)
print_cubes('product_byid(null)')
await state.customer_byid(null)
print_cubes('customer_byid(null)')

})()