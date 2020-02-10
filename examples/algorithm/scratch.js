(async () => {

const { perf } = require('seacreature/lib/perf')
const Cube = require('seacreature/analytics/cube')

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

const run = async fn => {
  fn()
  await state.product_byid('Drink')
  fn('product_byid(Drink)')
  await state.customer_byid('Mary')
  fn('customer_byid(Mary)')
  await state.product_byid(null)
  fn('product_byid(null)')
  await state.customer_byid(null)
  fn('customer_byid(null)')
}

const cubes = ['suppliers', 'products', 'orders', 'customers']
const cube_desc = ['SUPP', 'PROD', 'ORDER', 'CUSTOMR']
const cube_paddings = [6, 8, 12, 7]
let count = 0
const print_cubes = msg => {
  const e = perf((count++).toString())
  console.log('│', cubes.map((id, index) => Array.from(state[id].filtered(Infinity)).map(d =>state[id].identity(d).toString()[0]).join(' ').padEnd(cube_paddings[index], ' ')).join(''), `  ${(e.duration / 1000).toFixed(4)}s`, ' ', (msg || '').padEnd(20, ' '), '│')
}


perf()
console.log()
console.log('┌' + Array(68).fill('─').join('') + '┐')
console.log('│', cubes.map((id, index) => cube_desc[index].padEnd(cube_paddings[index], ' ')).join(''), '  DURATION'.padEnd(11, ' '), 'ACTION'.padEnd(20, ' '), '│')
console.log('├' + Array(68).fill('─').join('') + '┤')
await run(print_cubes)
console.log('└' + Array(68).fill('─').join('') + '┘')

const link_dests = ['supplier_byproduct', 'product_bysupplier', 'product_byorder', 'order_byproduct', 'order_bycustomer', 'customer_byorder']
const link_dest_desc = ['P→S', 'S→P', 'O→P', 'P→O', 'C→O', 'O→C']
const link_dest_paddings = [6, 8, 8, 12, 12, 6]
const print_link_dests = msg => {
  const e = perf((count++).toString())
  console.log('│', link_dests.map((id, index) => Array.from(state[id].filterindex, i => state[id].filterindex.get(i).count).join(' ').padEnd(link_dest_paddings[index], ' ')).join(''), `  ${(e.duration / 1000).toFixed(4)}s`, ' ', (msg || '').padEnd(20, ' '), '│')
}

console.log()
console.log('┌' + Array(88).fill('─').join('') + '┐')
console.log('│', link_dests.map((id, index) => link_dest_desc[index].padEnd(link_dest_paddings[index], ' ')).join(''), '│'.padStart(35, ' '))
console.log('│', link_dests.map((id, index) => Array.from(state[id].filterindex, i => state[id].cube.i2id(i).toString()[0]).join(' ').padEnd(link_dest_paddings[index], ' ')).join(''), '  DURATION'.padEnd(11, ' '), 'ACTION'.padEnd(20, ' '), '│')
console.log('├' + Array(88).fill('─').join('') + '┤')
await run(print_link_dests)
console.log('└' + Array(88).fill('─').join('') + '┘')

const link_srcs = ['supplier_byproduct', 'product_bysupplier', 'product_byorder', 'order_byproduct', 'order_bycustomer', 'customer_byorder']
const link_src_desc = ['P→S', 'S→P', 'O→P', 'P→O', 'C→O', 'O→C']
const link_src_paddings = [8, 6, 12, 8, 10, 6]
const print_link_srcs = msg => {
  const e = perf((count++).toString())
  console.log('│', link_srcs.map((id, index) => Array.from(state[id].forward.values(), i => i.count).join(' ').padEnd(link_src_paddings[index], ' ')).join(''), `  ${(e.duration / 1000).toFixed(4)}s`, ' ', (msg || '').padEnd(20, ' '), '│')
}

console.log()
console.log('┌' + Array(88).fill('─').join('') + '┐')
console.log('│', link_srcs.map((id, index) => link_src_desc[index].padEnd(link_src_paddings[index], ' ')).join(''), '│'.padStart(37, ' '))
console.log('│', link_srcs.map((id, index) => Array.from(state[id].forward.keys(), i => i.toString()[0]).join(' ').padEnd(link_src_paddings[index], ' ')).join(''), '  DURATION'.padEnd(11, ' '), 'ACTION'.padEnd(20, ' '), '│')
console.log('├' + Array(88).fill('─').join('') + '┤')
await run(print_link_srcs)
console.log('└' + Array(88).fill('─').join('') + '┘')

})()