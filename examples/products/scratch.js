(async () => {

const papa = require('papaparse')
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const Cube = require('seacreature/analytics/cube')
const Projection = require('seacreature/analytics/projection')
const pathie = require('seacreature/lib/pathie')
const Hub = require('seacreature/lib/hub')
const fs = require('fs').promises

const hub = Hub()
const state = {}
let c = null

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
if (!isDevelopment) {
  module.exports = (state) => { }
  return
}

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


perf()

hub.on('load projections', async () => {
  // count projections
  state.cube.counts = {
    supplier: { selected: 0, total: 0 },
    product: { selected: 0, total: 0 },
    order: { selected: 0, total: 0 },
    orderitem: { selected: 0, total: 0 },
    customer: { selected: 0, total: 0 }
  }
  state.cube.diff = {
    supplier: { put: 0, del: 0 },
    product: { put: 0, del: 0 },
    order: { put: 0, del: 0 },
    orderitem: { put: 0, del: 0 },
    customer: { put: 0, del: 0 }
  }
  const rec_counts = (cube, key) => {
    cube.on('selection changed', ({ put, del }) => {
      state.cube.diff[key].put += put.length
      state.cube.diff[key].del += del.length
      state.cube.counts[key].selected += put.length - del.length
    })
    cube.on('batch', ({ put, del }) =>
      state.cube.counts[key].total += put.length - del.length)
  }
  rec_counts(state.cube.suppliers, 'supplier')
  rec_counts(state.cube.products, 'product')
  rec_counts(state.cube.orders, 'order')
  rec_counts(state.cube.orderitems, 'orderitem')
  rec_counts(state.cube.customers, 'customer')

  // project data
  state.cube.countrybyspendposition = {}
  state.cube.customerbyspend = {}
  state.cube.countrybycustomerspend = {}
  const orderitemsintocustomers = Projection(
    [state.cube.orderitems, state.cube.orders, state.cube.customers],
    [state.cube.order_byorderitem, state.cube.customer_byorder],
    [state.cube.order_bycustomer, state.cube.orderitem_byorder],
    ({ put, del }) => {
      del.forEach(([ orderitemid, orderid, customerid ]) => {
        const customer = state.cube.customers.id2d(customerid)
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        const spend = orderitem.UnitPrice * orderitem.Quantity
        pathie.assign(state.cube.customerbyspend, [customer.Id], c => (c || 0) - spend)
        pathie.assign(state.cube.countrybyspendposition, [customer.Country], c => (c || 0) + spend)
        pathie.assign(state.cube.countrybycustomerspend, [customer.Country], c => (c || 0) - spend)
      })
      put.forEach(([ orderitemid, orderid, customerid ]) => {
        const customer = state.cube.customers.id2d(customerid)
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        const spend = orderitem.UnitPrice * orderitem.Quantity
        pathie.assign(state.cube.customerbyspend, [customer.Id], c => (c || 0) + spend)
        pathie.assign(state.cube.countrybyspendposition, [customer.Country], c => (c || 0) - spend)
        pathie.assign(state.cube.countrybycustomerspend, [customer.Country], c => (c || 0) + spend)
      })
    })
  hub.on('calculate projections', () => orderitemsintocustomers())

  state.cube.supplierbyspend = {}
  state.cube.countrybysupplierspend = {}
  const orderitemsintosuppliers = Projection(
    [state.cube.orderitems, state.cube.products, state.cube.suppliers],
    [state.cube.product_byorderitem, state.cube.supplier_byproduct],
    [state.cube.product_bysupplier, state.cube.orderitem_byproduct],
    ({ put, del }) => {
      del.forEach(([ orderitemid, productid, supplierid ]) => {
        const supplier = state.cube.suppliers.id2d(supplierid)
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        const spend = orderitem.UnitPrice * orderitem.Quantity
        pathie.assign(state.cube.supplierbyspend, [supplier.Id], c => (c || 0) - spend)
        pathie.assign(state.cube.countrybyspendposition, [supplier.Country], c => (c || 0) - spend)
        pathie.assign(state.cube.countrybysupplierspend, [supplier.Country], c => (c || 0) - spend)
      })
      put.forEach(([ orderitemid, productid, supplierid ]) => {
        const supplier = state.cube.suppliers.id2d(supplierid)
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        const spend = orderitem.UnitPrice * orderitem.Quantity
        pathie.assign(state.cube.supplierbyspend, [supplier.Id], c => (c || 0) + spend)
        pathie.assign(state.cube.countrybyspendposition, [supplier.Country], c => (c || 0) + spend)
        pathie.assign(state.cube.countrybysupplierspend, [supplier.Country], c => (c || 0) + spend)
      })
    })
  hub.on('calculate projections', () => orderitemsintosuppliers())

  state.cube.productbyunits = {}
  const productbyunits = Projection(
    [state.cube.orderitems, state.cube.products],
    [state.cube.product_byorderitem],
    [state.cube.orderitem_byproduct],
    ({ put, del }) => {
      del.forEach(([ orderitemid, productid ]) => {
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        pathie.assign(state.cube.productbyunits, [productid],
          c => (c || 0) - orderitem.Quantity)
      })
      put.forEach(([ orderitemid, productid ]) => {
        const orderitem = state.cube.orderitems.id2d(orderitemid)
        pathie.assign(state.cube.productbyunits, [productid],
          c => (c || 0) + orderitem.Quantity)
      })
    })
  hub.on('calculate projections', () => productbyunits())

  // matrix view?
  state.cube.productsbycustomer = {}
  const productsintocustomers = Projection(
    [state.cube.products, state.cube.orderitems, state.cube.orders, state.cube.customers],
    [state.cube.orderitem_byproduct, state.cube.order_byorderitem, state.cube.customer_byorder],
    [state.cube.order_bycustomer, state.cube.orderitem_byorder, state.cube.product_byorderitem],
    ({ put, del }) => {
      del.forEach(([ productid, orderitemid, orderid, customerid ]) => {
        const quantity = state.cube.orderitems.id2d(orderitemid).Quantity
        pathie.assign(state.cube.productsbycustomer, [customerid, productid], c => (c || 0) - quantity)
      })
      put.forEach(([ productid, orderitemid, orderid, customerid ]) => {
        const quantity = state.cube.orderitems.id2d(orderitemid).Quantity
        pathie.assign(state.cube.productsbycustomer, [customerid, productid], c => (c || 0) + quantity)
      })
    })
  hub.on('calculate projections', () => productsintocustomers())

  state.cube.countrymovements = {}
  const suppliersintocustomers = Projection(
    [state.cube.suppliers, state.cube.products, state.cube.orderitems, state.cube.orders, state.cube.customers],
    [state.cube.product_bysupplier, state.cube.orderitem_byproduct, state.cube.order_byorderitem, state.cube.customer_byorder],
    [state.cube.order_bycustomer, state.cube.orderitem_byorder, state.cube.product_byorderitem, state.cube.supplier_byproduct],
    ({ put, del }) => {
      del.forEach(([ supplierid, productid, orderitemid, orderid, customerid ]) => {
        const quantity = state.cube.orderitems.id2d(orderitemid).Quantity
        const supplier = state.cube.suppliers.id2d(supplierid)
        const customer = state.cube.customers.id2d(customerid)
        pathie.assign(state.cube.countrymovements, [supplier.Country, customer.Country], c => (c || 0) - quantity)
      })
      put.forEach(([ supplierid, productid, orderitemid, orderid, customerid ]) => {
        const quantity = state.cube.orderitems.id2d(orderitemid).Quantity
        const supplier = state.cube.suppliers.id2d(supplierid)
        const customer = state.cube.customers.id2d(customerid)
        pathie.assign(state.cube.countrymovements, [supplier.Country, customer.Country], c => (c || 0) + quantity)
      })
    })
  hub.on('calculate projections', () => suppliersintocustomers())
})

state.cube = c = {}
state.filters = {}
const data = (await Promise.all(
  ['Customers', 'Orders', 'OrderItems', 'Products', 'Suppliers']
  .map(async name => {
    const res = await fs.readFile(`../../docs/data/${name}.csv`, 'utf8')
    // console.log(res)
    return { name, ...papa.parse(res, { header: true }) }
  })))
  .reduce((result, item) => {
    result[item.name] = item.data
    return result
  }, {})
for (const order of data.Orders) {
  order.ts = DateTime.fromISO(order.OrderDate).toMillis()
  order.TotalAmount = parseFloat(order.TotalAmount) * 100
}
for (const item of data.OrderItems) {
  item.UnitPrice = parseFloat(item.UnitPrice) * 100
  item.Quantity = parseFloat(item.Quantity)
}
for (const product of data.Products) {
  product.UnitPrice = parseFloat(product.UnitPrice) * 100
  product.IsDiscontinued = product.IsDiscontinued === '1'
}

// Supplier — Id, CompanyName, ContactName, City, Country, Phone, Fax
c.suppliers = Cube(s => s.Id)
// Product — Id, ProductName, SupplierId, UnitPrice, Package, IsDiscontinued
c.products = Cube(p => p.Id)
// Order — Id, OrderDate, CustomerId, TotalAmount, OrderNumber
c.orders = Cube(o => o.Id)
// Customer — Id, FirstName, LastName, City, Country, Phone
c.customers = Cube(u => u.Id)
// OrderItem — Id, OrderId, ProductId, UnitPrice, Quantity
c.orderitems = Cube(i => i.Id)

c.supplier_byid = c.suppliers.range_single(s => s.Id)
c.supplier_bycompanyname = c.suppliers.range_single(s => s.CompanyName)
c.supplier_bycontactname = c.suppliers.range_single(s => s.ContactName)
c.supplier_city = c.suppliers.set_single(s => s.City)
c.supplier_country = c.suppliers.set_single(s => s.Country)
c.supplier_byphone = c.suppliers.range_single(s => s.Phone)
c.supplier_byfax = c.suppliers.range_single(s => s.Fax)
c.supplier_byproduct = c.suppliers.link(c.products, s => c.product_bysupplier.lookup(s.Id))

c.product_byid = c.products.range_single(p => p.Id)
c.product_byproductname = c.products.range_single(p => p.ProductName)
c.product_bysupplier = c.products.link(c.suppliers, p => [p.SupplierId])
c.product_byunitprice = c.products.range_single(p => p.UnitPrice)
c.product_bypackage = c.products.range_multiple_text(p => p.Package, stemmer)
c.product_byisdiscontinued = c.products.range_single(p => p.IsDiscontinued)
c.product_byorderitem = c.products.link(c.orderitems, p => c.orderitem_byproduct.lookup(p.Id))

c.order_byid = c.orders.range_single(o => o.Id)
c.order_bytime = c.orders.range_single(o => o.ts)
c.order_bycustomer = c.orders.link(c.customers, o => [o.CustomerId])
c.order_bytotalamount = c.orders.range_single(o => o.TotalAmount)
c.order_byordernumber = c.orders.range_single(o => o.OrderNumber)
c.order_byorderitem = c.orders.link(c.orderitems, o => c.orderitem_byorder.lookup(o.Id))

c.customer_byid = c.customers.range_single(u => u.Id)
c.customer_byfirstname = c.customers.range_single(u => u.FirstName)
c.customer_bylastname = c.customers.range_single(u => u.LastName)
c.customer_city = c.customers.set_single(u => u.City)
c.customer_country = c.customers.set_single(u => u.Country)
c.customer_byphone = c.customers.range_single(u => u.Phone)
c.customer_byorder = c.customers.link(c.orders, u => c.order_bycustomer.lookup(u.Id))

c.orderitem_byid = c.orderitems.range_single(i => i.Id)
c.orderitem_byorder = c.orderitems.link(c.orders, i => [i.OrderId])
c.orderitem_byproduct = c.orderitems.link(c.products, i => [i.ProductId])
c.orderitem_byunitprice = c.orderitems.range_single(i => i.UnitPrice)
c.orderitem_byquantity = c.orderitems.range_single(i => i.Quantity)
c.orderitem_byprice = c.orderitems.range_single(i => i.UnitPrice * i.Quantity)

await hub.emit('load projections')

const orderitems_indicies = await c.orderitems.batch({ put: data.OrderItems })
const orders_indicies = await c.orders.batch({ put: data.Orders })
const customers_indicies = await c.customers.batch({ put: data.Customers })
const products_indicies = await c.products.batch({ put: data.Products })
const suppliers_indicies = await c.suppliers.batch({ put: data.Suppliers })

await c.suppliers.batch_calculate_selection_change(suppliers_indicies)
await c.products.batch_calculate_selection_change(products_indicies)
await c.customers.batch_calculate_selection_change(customers_indicies)
await c.orders.batch_calculate_selection_change(orders_indicies)
await c.orderitems.batch_calculate_selection_change(orderitems_indicies)

await hub.emit('calculate projections')

const cubes = ['suppliers', 'products', 'orderitems', 'orders', 'customers']
let count = 0
const print = () => {
  const e = perf((count++).toString())
  console.log(cubes.map(id => Array.from(c[id].filtered(Infinity)).length.toString().padStart(12, ' ')).join(''), `   ${(e.duration / 1000).toFixed(4)}s`)
}

console.log(cubes.map(id => id.padStart(12, ' ')).join(''), '   duration')

print()
await state.cube.supplier_country.hidenulls()
await state.cube.supplier_country.selectnone()
await state.cube.supplier_country({ put: ['France'] })
print()
await state.cube.customer_country.hidenulls()
await state.cube.customer_country.selectnone()
await state.cube.customer_country({ put: ['Germany'] })
print()
await state.cube.product_byid(39)
print()
await state.cube.supplier_country.shownulls()
await state.cube.supplier_country.selectall()
print()
await state.cube.customer_country.shownulls()
await state.cube.customer_country.selectall()
print()
await state.cube.product_byid(null)
print()



// print()
// await state.cube.product_byid(39)
// print()
// await state.cube.product_byid(null)
// print()

})()