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
const or = state.orders.or()
state.order_byid1 = or.range_single(o => o.Id)
state.order_byid2 = or.range_single(o => o.Id)


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

await state.order_byid1(2)
await state.order_byid2(-Infinity)

console.log(Array.from(state.order_byid.filtered(Infinity), x => x[1].Id))

})()