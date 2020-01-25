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
const supplier_byproduct = suppliers.set_multiple(s => product_bysupplier.lookup(s.Id))

const products = Cube(p => p.Id)
const product_byid = products.range_single(p => p.Id)
const product_bysupplier = products.set_single(p => p.SupplierId)
const product_byorder = products.set_multiple(p => order_byproduct.lookup(p.Id))

const orders = Cube(o => o.Id)
const order_byid = orders.range_single(o => o.Id)
const order_byproduct = orders.set_single(o => o.ProductId)

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
const print = () => {
  console.log('o => p', Array.from(product_byorder.filter.keys()))
  console.log('p => s', Array.from(supplier_byproduct.filter.keys()))
  console.log('s => p', Array.from(product_bysupplier.filter.keys()))
  console.log('p => o', Array.from(order_byproduct.filter.keys()))
  console.log('Of', Array.from(order_byid.filtered(Infinity), i0))
  console.log('Oc', Array.from(order_byid.context(Infinity), i0))
  console.log('Ou', Array.from(order_byid.unfiltered(Infinity), i0))
  console.log('Pf', Array.from(product_byid.filtered(Infinity), i0))
  console.log('Pc', Array.from(product_byid.context(Infinity), i0))
  console.log('Pu', Array.from(product_byid.unfiltered(Infinity), i0))
  console.log('Sf', Array.from(supplier_byid.filtered(Infinity), i0))
  console.log('Sc', Array.from(supplier_byid.context(Infinity), i0))
  console.log('Su', Array.from(supplier_byid.unfiltered(Infinity), i0))
}

print()
console.log('****** order_byid(Bob) ******')
await order_byid('Bob')
print()
console.log('****** product_byid(Beer) ******')
await product_byid('Beer')
print()
console.log('****** order_byid(null) ******')
await order_byid(null)
print()
console.log('****** product_byid(null) ******')
await product_byid(null)
print()

})()