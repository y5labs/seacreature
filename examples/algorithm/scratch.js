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
    { Id: 4, CustomerId: 'Mary', ProductIds: ['Eggplant'] }
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
state.product_byid = state.products.range_single(p => p.Id)
state.product_bysupplier = state.products.link(state.suppliers, p => [p.SupplierId])
state.order_byid = state.orders.range_single(o => o.Id)
state.order_byproduct = state.orders.link(state.products, o => o.ProductIds)
state.order_bycustomer = state.orders.link(state.customers, o => [o.CustomerId])
state.customer_byid = state.customers.range_single(cu => cu.Id)

const put = async (state, data) => {
  const diff = {}
  for (const key of Object.keys(data))
    diff[key] = await state[key].batch({ put: data[key] })
  for (const key of Object.keys(diff))
    await state[key].batch_calculate_link_change(diff[key].link_change)
  for (const key of Object.keys(diff))
    await state[key].batch_calculate_selection_change(diff[key].selection_change)
  for (const key of Object.keys(data))
    await state[key].recalc()
}

await put(state, data)

let count = 0
const pf = () => perf((count++).toString())
const scenario1 = async fn => {
  fn(pf())
  console.log('Order - 3')
  await state.order_byid(3)
  fn(pf(), 'Order - 3')
  console.log('Product - Drink')
  await state.product_byid('Drink')
  fn(pf(), 'Product - Drink')
  console.log('Product - null')
  await state.product_byid(null)
  fn(pf(), 'Product - null')
  console.log('Order - null')
  await state.order_byid(null)
  fn(pf(), 'Order - null')
  const diff = await state.orders.batch({ put: [{
    Id: 5,
    CustomerId: 'Sue',
    ProductIds: ['Eggplant']
  }] })
  await state.orders.batch_calculate_link_change(diff.link_change)
  await state.orders.batch_calculate_selection_change(diff.selection_change)
  fn(pf(), 'New order')
}
const scenario2 = async fn => {
  fn(pf())
  console.log('Product - Drink')
  await state.product_byid('Drink')
  fn(pf(), 'Product - Drink')
  console.log('Order - 3')
  await state.order_byid(3)
  fn(pf(), 'Order - 3')
  console.log('Product - null')
  await state.product_byid(null)
  fn(pf(), 'Product - null')
  console.log('Order - null')
  await state.order_byid(null)
  fn(pf(), 'Order - null')
}

perf()

const cubes = ['suppliers', 'products', 'orders', 'customers']
const cube_desc = ['SUPP', 'PROD', 'ORDER', 'CUSTOMR']
const cube_paddings = [6, 8, 12, 7]

const link_dests = ['product_bysupplier', 'order_byproduct', 'order_bycustomer']
const link_dest_desc = ['S → P', 'P → O', 'C → O']
const link_dest_paddings = [8, 12, 12]
// const link_dests = ['supplier_byproduct', 'product_bysupplier', 'product_byorder', 'order_byproduct', 'order_bycustomer', 'customer_byorder']
// const link_dest_desc = ['P→S', 'S→P', 'O→P', 'P→O', 'C→O', 'O→C']
// const link_dest_paddings = [6, 8, 8, 12, 12, 7]

const cube_table = []
const link_dest_table = []

const header = () => {
  cube_table.push('╭' + Array(68).fill('─').join('') + '╮')
  cube_table.push('│ ' + cubes.map((id, index) => cube_desc[index].padEnd(cube_paddings[index], ' ')).join('') + '   duration'.padEnd(13, ' ') + 'action'.padEnd(21, ' ') + '│')
  cube_table.push('├' + Array(68).fill('─').join('') + '┤')

  link_dest_table.push('╭' + Array(67).fill('─').join('') + '╮')
  link_dest_table.push('│ ' + link_dests.map((id, index) => link_dest_desc[index].padEnd(link_dest_paddings[index], ' ')).join('') + '│'.padStart(35, ' '))
  link_dest_table.push('│ ' + link_dests.map((id, index) => Array.from(state[id].forward.filterindex, i => state[id].forward.cube.i2id(i).toString()[0]).join(' ').padEnd(link_dest_paddings[index], ' ')).join('') + '   duration'.padEnd(13, ' ') + 'action'.padEnd(21, ' ') + '│')
  link_dest_table.push('├' + Array(67).fill('─').join('') + '┤')
}

const body = (e, msg) => {
  cube_table.push('│ ' + cubes.map((id, index) => Array.from(state[id].filtered(Infinity)).map(d =>state[id].identity(d).toString()[0]).join(' ').padEnd(cube_paddings[index], ' ')).join('') + `   ${(e.duration / 1000).toFixed(4)}s   ` + (msg || '').padEnd(21, ' ') + '│')
  link_dest_table.push('│ ' + link_dests.map((id, index) => Array.from(state[id].forward.filterindex, i => state[id].forward.filterindex.get(i).count).join(' ').padEnd(link_dest_paddings[index], ' ')).join('') + `   ${(e.duration / 1000).toFixed(4)}s   ` + (msg || '').padEnd(21, ' ') + '│')
}

const footer = () => {
  cube_table.push('╰' + Array(68).fill('─').join('') + '╯')
  link_dest_table.push('╰' + Array(67).fill('─').join('') + '╯')
}


header()
await scenario1(body)
footer()
console.log('CUBES')
console.log(cube_table.join('\n'))
console.log('FILTERINDEX')
console.log(link_dest_table.join('\n'))
console.log()

cube_table.length = 0
link_dest_table.length = 0


header()
await scenario2(body)
footer()
console.log('CUBES')
console.log(cube_table.join('\n'))
console.log('FILTERINDEX')
console.log(link_dest_table.join('\n'))
console.log()

})()