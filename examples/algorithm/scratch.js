(async () => {

const { perf } = require('seacreature/lib/perf')
const Cube = require('seacreature/analytics/cube')

const data = {
  suppliers: [
    { Id: 'Bottle-O' },
    { Id: 'Vege Bin' }
  ],
  products: [
    { Id: 'Beer', SupplierId: 'Bottle-O' },
    { Id: 'Oranges', SupplierId: 'Vege Bin' },
    { Id: 'Apples', SupplierId: 'Vege Bin' }
  ],
  orders: [
    { Id: 1, CustomerId: 'Bob', ProductIds: ['Beer'] },
    { Id: 2, CustomerId: 'Andy', ProductIds: ['Beer'] },
    { Id: 3, CustomerId: 'Mary', ProductIds: ['Beer', 'Oranges'] },
    { Id: 4, CustomerId: 'Mary', ProductIds: ['Apples'] },
    { Id: 5, CustomerId: 'Sue', ProductIds: ['Apples'] }
  ],
  customers: [
    { Id: 'Bob' },
    { Id: 'Andy' },
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
// this currently doesn't work, likely because the order of operations means it's not populated first.
state.supplier_byproduct = state.suppliers.backward_link(state.products, s => state.product_bysupplier.lookup(s.Id))

state.product_byid = state.products.range_single(p => p.Id)
state.product_bysupplier = state.products.forward_link(state.suppliers, p => [p.SupplierId])
state.product_byorder = state.products.backward_link(state.orders, p => state.order_byproduct.lookup(p.Id))

state.order_byid = state.orders.range_single(o => o.Id)
state.order_byproduct = state.orders.forward_link(state.products, o => o.ProductIds)
state.order_bycustomer = state.orders.forward_link(state.customers, o => [o.CustomerId])

state.customer_byid = state.customers.range_single(c => c.Id)
state.customer_byorder = state.customers.backward_link(state.orders, c => state.order_bycustomer.lookup(c.Id))

const put = async (state, data) => {
  const diff = {}
  for (const key of Object.keys(data))
    diff[key] = await state[key].batch({ put: data[key] })
  for (const key of Object.keys(diff))
    await state[key].batch_calculate_link_change(diff[key].link_change)
  for (const key of Object.keys(diff))
    await state[key].batch_calculate_selection_change(diff[key].selection_change)
}

await put(state, data)

const cubes = ['suppliers', 'products', 'orders', 'customers']
const cube_padding = 24
let count = 0
const print_cubes = msg => {
  const e = perf((count++).toString())
  console.log(cubes.map(id => Array.from(state[id].filtered(Infinity)).map(state[id].identity).join(', ').padStart(cube_padding, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`, `    ${msg}`)
}

console.log()
console.log(cubes.map(id => id.padStart(cube_padding, ' ')).join(''), '   duration')
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
const link_padding = 20
const print_links = msg => {
  const e = perf((count++).toString())
  console.log(links.map(id => Array.from(state[id].filterindex, i => state[id].filterindex.get(i).count).join(' ').padStart(link_padding, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`, `    ${msg}`)
}

console.log()
console.log(links.map(id => id.padStart(link_padding, ' ')).join(''), '   duration')
console.log(links.map(id => Array.from(state[id].filterindex, i => state[id].cube.i2id(i).toString()[0]).join(' ').padStart(link_padding, ' ')).join(''))
print_links()
await state.product_byid('Beer')
print_links('product_byid(Beer)')
await state.customer_byid('Mary')
print_links('customer_byid(Mary)')
await state.product_byid(null)
print_links('product_byid(null)')
await state.customer_byid(null)
print_links('customer_byid(null)')

})()