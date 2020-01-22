import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const pathie = require('seacreature/lib/pathie')
const Cube = require('seacreature/analytics/cube')

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
    await hub.emit('update')
  })
  hub.on('filter customer and supplier by country', async country => {
    if (country) {
      await c.supplier_country.hidenulls()
      await c.supplier_country.selectnone()
      await c.supplier_country({ put: [country] })
      state.filters.supplierbycountry = country
      await c.customer_country.hidenulls()
      await c.customer_country.selectnone()
      await c.customer_country({ put: [country] })
      state.filters.customerbycountry = country
    }
    else {
      await c.supplier_country.shownulls()
      await c.supplier_country.selectall()
      delete state.filters.supplierbycountry
      await c.customer_country.shownulls()
      await c.customer_country.selectall()
      delete state.filters.customerbycountry
    }
    await hub.emit('update')
  })
  hub.on('filter supplier by id', async name => {
    if (name) {
      await c.supplier_byid(name)
      state.filters.supplierbyid = name
    }
    else {
      await c.supplier_byid(name)
      delete state.filters.supplierbyid
    }
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
    await hub.emit('update')
  })
  hub.on('load cube', async () => {
    if (c) return
    c = {}
    state.cube = {}
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
    c.suppliers = Cube(supplier => supplier.Id)
    c.supplier_byid = c.suppliers.range_single(supplier => supplier.Id)
    c.supplier_bycompanyname = c.suppliers.range_single(supplier => supplier.CompanyName)
    c.supplier_bycontactname = c.suppliers.range_single(supplier => supplier.ContactName)
    c.supplier_city = c.suppliers.set_single(supplier => supplier.City)
    c.supplier_country = c.suppliers.set_single(supplier => supplier.Country)
    c.supplier_byphone = c.suppliers.range_single(supplier => supplier.Phone)
    c.supplier_byfax = c.suppliers.range_single(supplier => supplier.Fax)
    c.supplier_byproduct = c.suppliers.set_multiple(supplier => c.product_bysupplier.lookup(supplier.Id))

    // Product — Id, ProductName, SupplierId, UnitPrice, Package, IsDiscontinued
    c.products = Cube(product => product.Id)
    c.product_byid = c.products.range_single(product => product.Id)
    c.product_byproductname = c.products.range_single(product => product.ProductName)
    c.product_bysupplier = c.products.set_single(product => product.SupplierId)
    c.product_byunitprice = c.products.range_single(product => product.UnitPrice)
    c.product_bypackage = c.products.range_multiple_text(product => product.Package, stemmer)
    c.product_byisdiscontinued = c.products.range_single(product => product.IsDiscontinued)
    c.product_byorderitem = c.products.set_multiple(product => c.orderitem_byproduct.lookup(product.Id))

    // Order — Id, OrderDate, CustomerId, TotalAmount, OrderNumber
    c.orders = Cube(order => order.Id)
    c.order_byid = c.orders.range_single(order => order.Id)
    c.order_bytime = c.orders.range_single(order => order.ts)
    c.order_bycustomer = c.orders.set_single(order => order.CustomerId)
    c.order_bytotalamount = c.orders.range_single(order => order.TotalAmount)
    c.order_byordernumber = c.orders.range_single(order => order.OrderNumber)
    c.order_byorderitem = c.orders.set_multiple(order => c.orderitem_byorder.lookup(order.Id))

    // Customer — Id, FirstName, LastName, City, Country, Phone
    c.customers = Cube(customer => customer.Id)
    c.customer_byid = c.customers.range_single(customer => customer.Id)
    c.customer_byfirstname = c.customers.range_single(customer => customer.FirstName)
    c.customer_bylastname = c.customers.range_single(customer => customer.LastName)
    c.customer_city = c.customers.set_single(customer => customer.City)
    c.customer_country = c.customers.set_single(customer => customer.Country)
    c.customer_byphone = c.customers.range_single(customer => customer.Phone)
    c.customer_byorder = c.customers.set_multiple(customer => c.order_bycustomer.lookup(customer.Id))

    // OrderItem — Id, OrderId, ProductId, UnitPrice, Quantity
    c.orderitems = Cube(orderitem => orderitem.Id)
    c.orderitem_byid = c.orderitems.range_single(orderitem => orderitem.Id)
    c.orderitem_byorder = c.orderitems.set_single(orderitem => orderitem.OrderId)
    c.orderitem_byproduct = c.orderitems.set_single(orderitem => orderitem.ProductId)
    c.orderitem_byunitprice = c.orderitems.range_single(orderitem => orderitem.UnitPrice)
    c.orderitem_byquantity = c.orderitems.range_single(orderitem => orderitem.Quantity)

    c.products.link_to(c.suppliers, c.supplier_byproduct)
    c.suppliers.link_to(c.products, c.product_bysupplier)
    c.products.link_to(c.orderitems, c.orderitem_byproduct)
    c.orderitems.link_to(c.products, c.product_byorderitem)
    c.customers.link_to(c.orders, c.order_bycustomer)
    c.orders.link_to(c.customers, c.customer_byorder)
    c.orderitems.link_to(c.orders, c.order_byorderitem)
    c.orders.link_to(c.orderitems, c.orderitem_byorder)

    state.cube.product_id2d = c.products.id2d
    state.cube.order_id2d = c.orders.id2d
    state.cube.supplier_id2d = c.suppliers.id2d
    state.cube.orderitem_id2d = c.orderitems.id2d
    state.cube.customer_id2d = c.customers.id2d

    // count projections
    state.cube.counts = {
      supplier: { selected: 0, total: 0 },
      product: { selected: 0, total: 0 },
      order: { selected: 0, total: 0 },
      orderitem: { selected: 0, total: 0 },
      customer: { selected: 0, total: 0 }
    }
    const rec_counts = (cube, key) => {
      cube.on('selection changed', ({ put, del }) =>
        state.cube.counts[key].selected += put.length - del.length)
      cube.on('batch', ({ put, del }) =>
        state.cube.counts[key].total += put.length - del.length)
    }
    rec_counts(c.suppliers, 'supplier')
    rec_counts(c.products, 'product')
    rec_counts(c.orders, 'order')
    rec_counts(c.orderitems, 'orderitem')
    rec_counts(c.customers, 'customer')

    // project data
    state.cube.supplierbyspend = {}
    state.cube.customerbyspend = {}
    state.cube.productbyunits = {}
    state.cube.countrybyspendposition = {}
    c.orderitems.on('selection changed', ({ put, del }) => {
      for (const o of put) {
        const spend = o.UnitPrice * o.Quantity
        for (const id of c.supplier_byproduct.lookup(o.ProductId)) {
          pathie.assign(state.cube.supplierbyspend,
            [id], c => (c || 0) + spend)
          pathie.assign(state.cube.countrybyspendposition,
            [c.suppliers.id2d(id).Country], c => (c || 0) + spend)
        }
        for (const id of c.order_byorderitem.lookup(o.OrderId)) {
          pathie.assign(state.cube.customerbyspend,
            [c.orders.id2d(id).CustomerId], c => (c || 0) + spend)
          pathie.assign(state.cube.countrybyspendposition,
            [c.customers.id2d(c.orders.id2d(id).CustomerId).Country],
              c => (c || 0) - spend)
        }
        pathie.assign(state.cube.productbyunits,
          [o.ProductId], c => (c || 0) + o.Quantity)
      }
      for (const o of del) {
        const spend = o.UnitPrice * o.Quantity
        for (const id of c.supplier_byproduct.lookup(o.ProductId)) {
          pathie.assign(state.cube.supplierbyspend,
            [id], c => (c || 0) - spend)
          pathie.assign(state.cube.countrybyspendposition,
            [c.suppliers.id2d(id).Country], c => (c || 0) - spend)
        }
        for (const id of c.order_byorderitem.lookup(o.OrderId)) {
          pathie.assign(state.cube.customerbyspend,
            [c.orders.id2d(id).CustomerId], c => (c || 0) - spend)
          pathie.assign(state.cube.countrybyspendposition,
            [c.customers.id2d(c.orders.id2d(id).CustomerId).Country],
              c => (c || 0) + spend)
        }
        pathie.assign(state.cube.productbyunits,
          [o.ProductId], c => (c || 0) - o.Quantity)
      }
    })

    state.cube.countrybysuppliercount = {}
    c.suppliers.on('selection changed', ({ put, del }) => {
      for (const s of put) pathie.assign(state.cube.countrybysuppliercount,
        [s.Country], c => (c || 0) + 1)
      for (const s of del) pathie.assign(state.cube.countrybysuppliercount,
        [s.Country], c => (c || 0) - 1)
    })

    state.cube.countrybycustomercount = {}
    c.customers.on('selection changed', ({ put, del }) => {
      for (const c of put) pathie.assign(state.cube.countrybycustomercount,
        [c.Country], c => (c || 0) + 1)
      for (const c of del) pathie.assign(state.cube.countrybycustomercount,
        [c.Country], c => (c || 0) - 1)
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
  })
})