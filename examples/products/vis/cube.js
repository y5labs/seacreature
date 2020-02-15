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
    const data = (await Promise.all(
      ['customers', 'orders', 'orderitems', 'products', 'suppliers']
      .map(async name => {
        const res = await axios.get(`/seacreature/data/${name}.csv`, 'utf8')
        return { name, ...papa.parse(res.data, { header: true }) }
      })))
      .reduce((result, item) => {
        result[item.name] = item.data
        return result
      }, {})
    for (const order of data.orders) {
      order.ts = DateTime.fromISO(order.OrderDate).toMillis()
      order.TotalAmount = parseFloat(order.TotalAmount) * 100
    }
    for (const item of data.orderitems) {
      item.UnitPrice = parseFloat(item.UnitPrice) * 100
      item.Quantity = parseFloat(item.Quantity)
    }
    for (const product of data.products) {
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
    c.supplier_byproduct = c.suppliers.backward_link(c.products, s => c.product_bysupplier.lookup(s.Id))

    c.product_byid = c.products.range_single(p => p.Id)
    c.product_byproductname = c.products.range_single(p => p.ProductName)
    c.product_bysupplier = c.products.forward_link(c.suppliers, p => [p.SupplierId])
    c.product_byunitprice = c.products.range_single(p => p.UnitPrice)
    c.product_bypackage = c.products.range_multiple_text(p => p.Package, stemmer)
    c.product_byisdiscontinued = c.products.range_single(p => p.IsDiscontinued)
    c.product_byorderitem = c.products.backward_link(c.orderitems, p => c.orderitem_byproduct.lookup(p.Id))

    c.order_byid = c.orders.range_single(o => o.Id)
    c.order_bytime = c.orders.range_single(o => o.ts)
    c.order_bycustomer = c.orders.forward_link(c.customers, o => [o.CustomerId])
    c.order_bytotalamount = c.orders.range_single(o => o.TotalAmount)
    c.order_byordernumber = c.orders.range_single(o => o.OrderNumber)
    c.order_byorderitem = c.orders.backward_link(c.orderitems, o => c.orderitem_byorder.lookup(o.Id))

    c.customer_byid = c.customers.range_single(u => u.Id)
    c.customer_byfirstname = c.customers.range_single(u => u.FirstName)
    c.customer_bylastname = c.customers.range_single(u => u.LastName)
    c.customer_city = c.customers.set_single(u => u.City)
    c.customer_country = c.customers.set_single(u => u.Country)
    c.customer_byphone = c.customers.range_single(u => u.Phone)
    c.customer_byorder = c.customers.backward_link(c.orders, u => c.order_bycustomer.lookup(u.Id))

    c.orderitem_byid = c.orderitems.range_single(i => i.Id)
    c.orderitem_byorder = c.orderitems.forward_link(c.orders, i => [i.OrderId])
    c.orderitem_byproduct = c.orderitems.forward_link(c.products, i => [i.ProductId])
    c.orderitem_byunitprice = c.orderitems.range_single(i => i.UnitPrice)
    c.orderitem_byquantity = c.orderitems.range_single(i => i.Quantity)
    c.orderitem_byprice = c.orderitems.range_single(i => i.UnitPrice * i.Quantity)

    // helpers
    c.product_desc = id => c.products.id2d(id).ProductName
    c.supplier_desc = id => c.suppliers.id2d(id).CompanyName
    c.customer_desc = id => {
      const customer = c.customers.id2d(id)
      return `${customer.FirstName} ${customer.LastName}`
    }
    c.order_desc = id => c.orders.id2d(id).OrderNumber
    c.orderitem_desc = id => {
      const orderitem = c.orderitems.id2d(id)
      return `${orderitem.Quantity} ✕ ${c.products.id2d(orderitem.ProductId).ProductName} @ ${numeral(orderitem.UnitPrice).format('$0,0')}`
    }

    await hub.emit('load projections')

    const put = async (state, data) => {
      const diff = {}
      for (const key of Object.keys(data))
        diff[key] = await state[key].batch({ put: data[key] })
      for (const key of Object.keys(diff))
        await state[key].batch_calculate_link_change(diff[key].link_change)
      for (const key of Object.keys(diff))
        await state[key].batch_calculate_selection_change(diff[key].selection_change)
    }

    await put(c, data)

    await hub.emit('calculate projections')
  })
})
