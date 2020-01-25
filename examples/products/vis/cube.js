import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const pathie = require('seacreature/lib/pathie')
const Cube = require('seacreature/analytics/cube')
const Projection = require('seacreature/analytics/projection')
const numeral = require('numeral')

let c = null

inject('pod', ({ hub, state }) => {
  hub.on('filter supplier by country', async country => {
    if (country) {
      await c.supplier_country.hidenulls()
      await c.supplier_country.selectnone()
      await c.supplier_country({ put: [country] })
      state.filters.supplierbycountry = country
    }
    else {
      await c.supplier_country.shownulls()
      await c.supplier_country.selectall()
      delete state.filters.supplierbycountry
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter customer by country', async country => {
    if (country) {
      await c.customer_country.hidenulls()
      await c.customer_country.selectnone()
      await c.customer_country({ put: [country] })
      state.filters.customerbycountry = country
    }
    else {
      await c.customer_country.shownulls()
      await c.customer_country.selectall()
      delete state.filters.customerbycountry
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter supplier by id', async id => {
    if (id) {
      await c.supplier_byid(id)
      state.filters.supplierbyid = id
    }
    else {
      await c.supplier_byid(id)
      delete state.filters.supplierbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter customer by id', async id => {
    if (id) {
      await c.customer_byid(id)
      state.filters.customerbyid = id
    }
    else {
      await c.customer_byid(id)
      delete state.filters.customerbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter product by id', async id => {
    if (id) {
      await c.product_byid(id)
      state.filters.productbyid = id
    }
    else {
      await c.product_byid(id)
      delete state.filters.productbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter order by id', async id => {
    if (id) {
      await c.order_byid(id)
      state.filters.orderbyid = id
    }
    else {
      await c.order_byid(id)
      delete state.filters.orderbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter orderitem by id', async id => {
    if (id) {
      await c.orderitem_byid(id)
      state.filters.orderitembyid = id
    }
    else {
      await c.orderitem_byid(id)
      delete state.filters.orderitembyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('load cube', async () => {
    if (c) return
    state.cube = c = {}
    state.filters = {}
    const data = (await Promise.all(
      ['Customers', 'Orders', 'OrderItems', 'Products', 'Suppliers']
      .map(async name => {
        const res = await axios.get(`/data/${name}.csv`, 'utf8')
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

    c.product_id2d = c.products.id2d
    c.order_id2d = c.orders.id2d
    c.supplier_id2d = c.suppliers.id2d
    c.orderitem_id2d = c.orderitems.id2d
    c.customer_id2d = c.customers.id2d

    c.product_desc = id => c.product_id2d(id).ProductName
    c.supplier_desc = id => c.supplier_id2d(id).CompanyName
    c.customer_desc = id => {
      const customer = c.customer_id2d(id)
      return `${customer.FirstName} ${customer.LastName}`
    }
    c.order_desc = id => c.order_id2d(id).OrderNumber
    c.orderitem_desc = id => {
      const orderitem = c.orderitem_id2d(id)
      return `${orderitem.Quantity} ✕ ${c.product_id2d(orderitem.ProductId).ProductName} @ ${numeral(orderitem.UnitPrice).format('$0,0')}`
    }

    // count projections
    c.counts = {
      supplier: { selected: 0, total: 0 },
      product: { selected: 0, total: 0 },
      order: { selected: 0, total: 0 },
      orderitem: { selected: 0, total: 0 },
      customer: { selected: 0, total: 0 }
    }
    c.diff = {
      supplier: { put: 0, del: 0 },
      product: { put: 0, del: 0 },
      order: { put: 0, del: 0 },
      orderitem: { put: 0, del: 0 },
      customer: { put: 0, del: 0 }
    }
    const rec_counts = (cube, key) => {
      cube.on('selection changed', ({ put, del }) => {
        c.diff[key].put += put.length
        c.diff[key].del += del.length
        c.counts[key].selected += put.length - del.length
      })
      cube.on('batch', ({ put, del }) =>
        c.counts[key].total += put.length - del.length)
    }
    rec_counts(c.suppliers, 'supplier')
    rec_counts(c.products, 'product')
    rec_counts(c.orders, 'order')
    rec_counts(c.orderitems, 'orderitem')
    rec_counts(c.customers, 'customer')

    // project data
    c.countrybyspendposition = {}
    hub.on('calculate projections', () => {
      c.countrybyspendposition2 = {}
      for (const orderitem of c.orderitem_byid.filtered(Infinity)) {
        const orderitemid = orderitem[0]
        const spend = orderitem[1].UnitPrice * orderitem[1].Quantity
        for (const orderid of c.order_byorderitem.lookup(orderitemid))
          for (const customerid of c.customer_byorder.lookup(orderid)) {
            const customer = c.customers.id2d(customerid)
            pathie.assign(c.countrybyspendposition2, [customer.Country], c => (c || 0) - spend)
          }
        for (const productid of c.product_byorderitem.lookup(orderitemid))
          for (const supplierid of c.supplier_byproduct.lookup(productid)) {
            const supplier = c.suppliers.id2d(supplierid)
            pathie.assign(c.countrybyspendposition2, [supplier.Country], c => (c || 0) + spend)
          }
      }
    })

    c.customerbyspend = {}
    const orderitemsintocustomers = Projection(
      [c.orderitems, c.orders, c.customers],
      [c.order_byorderitem, c.customer_byorder],
      [c.order_bycustomer, c.orderitem_byorder],
      ({ put, del }) => {
        del.forEach(([ orderitemid, orderid, customerid ]) => {
          const customer = c.customers.id2d(customerid)
          const orderitem = c.orderitems.id2d(orderitemid)
          const spend = orderitem.UnitPrice * orderitem.Quantity
          pathie.assign(c.customerbyspend, [customer.Id], c => (c || 0) - spend)
          pathie.assign(c.countrybyspendposition, [customer.Country], c => (c || 0) + spend)
        })
        put.forEach(([ orderitemid, orderid, customerid ]) => {
          const customer = c.customers.id2d(customerid)
          const orderitem = c.orderitems.id2d(orderitemid)
          const spend = orderitem.UnitPrice * orderitem.Quantity
          pathie.assign(c.customerbyspend, [customer.Id], c => (c || 0) + spend)
          pathie.assign(c.countrybyspendposition, [customer.Country], c => (c || 0) - spend)
        })
      })
    hub.on('calculate projections', () => orderitemsintocustomers())

    c.supplierbyspend = {}
    const orderitemsintosuppliers = Projection(
      [c.orderitems, c.products, c.suppliers],
      [c.product_byorderitem, c.supplier_byproduct],
      [c.product_bysupplier, c.orderitem_byproduct],
      ({ put, del }) => {
        del.forEach(([ orderitemid, productid, supplierid ]) => {
          const supplier = c.suppliers.id2d(supplierid)
          const orderitem = c.orderitems.id2d(orderitemid)
          const spend = orderitem.UnitPrice * orderitem.Quantity
          pathie.assign(c.supplierbyspend, [supplier.Id], c => (c || 0) - spend)
          pathie.assign(c.countrybyspendposition, [supplier.Country], c => (c || 0) - spend)
        })
        put.forEach(([ orderitemid, productid, supplierid ]) => {
          const supplier = c.suppliers.id2d(supplierid)
          const orderitem = c.orderitems.id2d(orderitemid)
          const spend = orderitem.UnitPrice * orderitem.Quantity
          pathie.assign(c.supplierbyspend, [supplier.Id], c => (c || 0) + spend)
          pathie.assign(c.countrybyspendposition, [supplier.Country], c => (c || 0) + spend)
        })
      })
    hub.on('calculate projections', () => orderitemsintosuppliers())

    c.productbyunits = {}
    const productbyunits = Projection(
      [c.orderitems, c.products],
      [c.product_byorderitem],
      [c.orderitem_byproduct],
      ({ put, del }) => {
        del.forEach(([ orderitemid, productid ]) => {
          const orderitem = c.orderitems.id2d(orderitemid)
          pathie.assign(c.productbyunits, [productid],
            c => (c || 0) - orderitem.Quantity)
        })
        put.forEach(([ orderitemid, productid ]) => {
          const orderitem = c.orderitems.id2d(orderitemid)
          pathie.assign(c.productbyunits, [productid],
            c => (c || 0) + orderitem.Quantity)
        })
      })
    hub.on('calculate projections', () => productbyunits())

    // matrix view?
    c.productsbycustomer = {}
    const productsintocustomers = Projection(
      [c.products, c.orderitems, c.orders, c.customers],
      [c.orderitem_byproduct, c.order_byorderitem, c.customer_byorder],
      [c.order_bycustomer, c.orderitem_byorder, c.product_byorderitem],
      ({ put, del }) => {
        del.forEach(([ productid, orderitemid, orderid, customerid ]) => {
          const quantity = c.orderitems.id2d(orderitemid).Quantity
          pathie.assign(c.productsbycustomer, [customerid, productid], c => (c || 0) - quantity)
        })
        put.forEach(([ productid, orderitemid, orderid, customerid ]) => {
          const quantity = c.orderitems.id2d(orderitemid).Quantity
          pathie.assign(c.productsbycustomer, [customerid, productid], c => (c || 0) + quantity)
        })
      })
    hub.on('calculate projections', () => productsintocustomers())

    c.countrymovements = {}
    const suppliersintocustomers = Projection(
      [c.suppliers, c.products, c.orderitems, c.orders, c.customers],
      [c.product_bysupplier, c.orderitem_byproduct, c.order_byorderitem, c.customer_byorder],
      [c.order_bycustomer, c.orderitem_byorder, c.product_byorderitem, c.supplier_byproduct],
      ({ put, del }) => {
        del.forEach(([ supplierid, productid, orderitemid, orderid, customerid ]) => {
          const quantity = c.orderitems.id2d(orderitemid).Quantity
          const supplier = c.suppliers.id2d(supplierid)
          const customer = c.customers.id2d(customerid)
          pathie.assign(c.countrymovements, [supplier.Country, customer.Country], c => (c || 0) - quantity)
        })
        put.forEach(([ supplierid, productid, orderitemid, orderid, customerid ]) => {
          const quantity = c.orderitems.id2d(orderitemid).Quantity
          const supplier = c.suppliers.id2d(supplierid)
          const customer = c.customers.id2d(customerid)
          pathie.assign(c.countrymovements, [supplier.Country, customer.Country], c => (c || 0) + quantity)
        })
      })
    hub.on('calculate projections', () => suppliersintocustomers())

    c.countrybysuppliercount = {}
    c.suppliers.on('selection changed', ({ put, del }) => {
      for (const s of put) pathie.assign(c.countrybysuppliercount, [s.Country],
        c => (c || 0) + 1)
      for (const s of del) pathie.assign(c.countrybysuppliercount, [s.Country],
        c => (c || 0) - 1)
    })

    c.countrybycustomercount = {}
    c.customers.on('selection changed', ({ put, del }) => {
      for (const u of put) pathie.assign(c.countrybycustomercount, [u.Country],
        c => (c || 0) + 1)
      for (const u of del) pathie.assign(c.countrybycustomercount, [u.Country],
        c => (c || 0) - 1)
    })

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
