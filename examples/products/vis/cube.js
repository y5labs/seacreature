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
    state.filters = {}
    const data = (await Promise.all(
      ['Customers', 'Orders', 'OrderItems', 'Products', 'Suppliers']
      .map(async name => {
        const res = await axios.get(`/seacreature/data/${name}.csv`, 'utf8')
        return { name, ...papa.parse(res.data, { header: true }) }
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
    c.supplier_byid = c.suppliers.range_single(s => s.Id)
    c.supplier_bycompanyname = c.suppliers.range_single(s => s.CompanyName)
    c.supplier_bycontactname = c.suppliers.range_single(s => s.ContactName)
    c.supplier_city = c.suppliers.set_single(s => s.City)
    c.supplier_country = c.suppliers.set_single(s => s.Country)
    c.supplier_byphone = c.suppliers.range_single(s => s.Phone)
    c.supplier_byfax = c.suppliers.range_single(s => s.Fax)
    c.supplier_byproduct = c.suppliers.set_multiple(s => c.product_bysupplier.lookup(s.Id))

    // Product — Id, ProductName, SupplierId, UnitPrice, Package, IsDiscontinued
    c.products = Cube(p => p.Id)
    c.product_byid = c.products.range_single(p => p.Id)
    c.product_byproductname = c.products.range_single(p => p.ProductName)
    c.product_bysupplier = c.products.set_single(p => p.SupplierId)
    c.product_byunitprice = c.products.range_single(p => p.UnitPrice)
    c.product_bypackage = c.products.range_multiple_text(p => p.Package, stemmer)
    c.product_byisdiscontinued = c.products.range_single(p => p.IsDiscontinued)
    c.product_byorderitem = c.products.set_multiple(p => c.orderitem_byproduct.lookup(p.Id))

    // Order — Id, OrderDate, CustomerId, TotalAmount, OrderNumber
    c.orders = Cube(o => o.Id)
    c.order_byid = c.orders.range_single(o => o.Id)
    c.order_bytime = c.orders.range_single(o => o.ts)
    c.order_bycustomer = c.orders.set_single(o => o.CustomerId)
    c.order_bytotalamount = c.orders.range_single(o => o.TotalAmount)
    c.order_byordernumber = c.orders.range_single(o => o.OrderNumber)
    c.order_byorderitem = c.orders.set_multiple(o => c.orderitem_byorder.lookup(o.Id))

    // Customer — Id, FirstName, LastName, City, Country, Phone
    c.customers = Cube(u => u.Id)
    c.customer_byid = c.customers.range_single(u => u.Id)
    c.customer_byfirstname = c.customers.range_single(u => u.FirstName)
    c.customer_bylastname = c.customers.range_single(u => u.LastName)
    c.customer_city = c.customers.set_single(u => u.City)
    c.customer_country = c.customers.set_single(u => u.Country)
    c.customer_byphone = c.customers.range_single(u => u.Phone)
    c.customer_byorder = c.customers.set_multiple(u => c.order_bycustomer.lookup(u.Id))

    // OrderItem — Id, OrderId, ProductId, UnitPrice, Quantity
    c.orderitems = Cube(i => i.Id)
    c.orderitem_byid = c.orderitems.range_single(i => i.Id)
    c.orderitem_byorder = c.orderitems.set_single(i => i.OrderId)
    c.orderitem_byproduct = c.orderitems.set_single(i => i.ProductId)
    c.orderitem_byunitprice = c.orderitems.range_single(i => i.UnitPrice)
    c.orderitem_byquantity = c.orderitems.range_single(i => i.Quantity)
    c.orderitem_byprice = c.orderitems.range_single(i => i.UnitPrice * i.Quantity)

    c.products.link_to(c.suppliers, c.supplier_byproduct)
    c.suppliers.link_to(c.products, c.product_bysupplier)
    c.products.link_to(c.orderitems, c.orderitem_byproduct)
    c.orderitems.link_to(c.products, c.product_byorderitem)
    c.customers.link_to(c.orders, c.order_bycustomer)
    c.orders.link_to(c.customers, c.customer_byorder)
    c.orderitems.link_to(c.orders, c.order_byorderitem)
    c.orders.link_to(c.orderitems, c.orderitem_byorder)

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
  })
})
