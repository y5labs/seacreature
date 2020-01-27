(async () => {

const Cube = require('seacreature/analytics/cube')
const data = {
  Orders: [
    { Id: 'Bob', ProductId: 'Beer' },
    { Id: 'Bruce', ProductId: 'Beer' },
    { Id: 'Mary', ProductId: 'Oranges' },
    { Id: 'Sue', ProductId: 'Apples' }
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

const suppliers = Cube(s => s.Id)
const supplier_byid = suppliers.range_single(s => s.Id)
const supplier_byproduct = suppliers.link_multiple(s => product_bysupplier.lookup(s.Id))

const products = Cube(p => p.Id)
const product_byid = products.range_single(p => p.Id)
const product_bysupplier = products.link_single(p => p.SupplierId)
const product_byorder = products.link_multiple(p => order_byproduct.lookup(p.Id))

const orders = Cube(o => o.Id)
const order_byid = orders.range_single(o => o.Id)
const order_byproduct = orders.link_single(o => o.ProductId)

products.link_to(suppliers, supplier_byproduct)
suppliers.link_to(products, product_bysupplier)
products.link_to(orders, order_byproduct)
orders.link_to(products, product_byorder)

const orders_indicies = await orders.batch({ put: data.Orders })
const products_indicies = await products.batch({ put: data.Products })
const suppliers_indicies = await suppliers.batch({ put: data.Suppliers })
await suppliers.batch_calculate_selection_change(suppliers_indicies)
await products.batch_calculate_selection_change(products_indicies)
await orders.batch_calculate_selection_change(orders_indicies)

const i0 = i => i[0]
const bool = b => {
  const pad = s => s.toString().padEnd(2, ' ')
  if (b === true) return pad(1)
  if (b === false) return pad(0)
  return pad(b)
}
console.log('Order Product  Supplier')
console.log('ID PO OP ID SP PS ID')
const print = msg => {
  console.log(
    bool(order_byid.filter[0] !== null),
    bool(order_byproduct.filter.size),
    bool(product_byorder.filter.size),
    bool(product_byid.filter[0] !== null),
    bool(product_bysupplier.filter.size),
    bool(supplier_byproduct.filter.size),
    bool(supplier_byid.filter[0] !== null),
    // bool(orders.link_filter.get(3)),
    // bool(products.link_filter.get(1)),
    // bool(suppliers.link_filter.get(1)),
    msg
  )
}
// const print = () => {
//   console.log('o => p', Array.from(product_byorder.filter.keys()), product_byorder.autoexpand())
//   console.log('p => s', Array.from(supplier_byproduct.filter.keys()), supplier_byproduct.autoexpand())
//   console.log('s => p', Array.from(product_bysupplier.filter.keys()), product_bysupplier.autoexpand())
//   console.log('p => o', Array.from(order_byproduct.filter.keys()), order_byproduct.autoexpand())
//   console.log('Of', Array.from(order_byid.filtered(Infinity), i0), order_byid.filter)
//   console.log('Oc', Array.from(order_byid.context(Infinity), i0))
//   console.log('Ou', Array.from(order_byid.unfiltered(Infinity), i0))
//   console.log('Pf', Array.from(product_byid.filtered(Infinity), i0), product_byid.filter)
//   console.log('Pc', Array.from(product_byid.context(Infinity), i0))
//   console.log('Pu', Array.from(product_byid.unfiltered(Infinity), i0))
//   console.log('Sf', Array.from(supplier_byid.filtered(Infinity), i0), supplier_byid.filter)
//   console.log('Sc', Array.from(supplier_byid.context(Infinity), i0))
//   console.log('Su', Array.from(supplier_byid.unfiltered(Infinity), i0))
// }

// // Scenario 1
// print()
// console.log('****** order_byid(Bob) ******')
// await order_byid('Bob')
// print()
// console.log('****** product_byid(Beer) ******')
// await product_byid('Beer')
// print()
// console.log('****** order_byid(null) ******')
// await order_byid(null)
// print()

// Scenario 2
print()
await order_byid('Bob')
print('order_byid(Bob)')
await supplier_byid('Bottle-O')
print('supplier_byid(Bottle-O)')
await product_byid('Beer')
print('product_byid(Beer)')
await order_byid(null)
print('order_byid(null)')
await supplier_byid(null)
print('supplier_byid(null)')

})()