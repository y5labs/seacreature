import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const pathie = require('seacreature/lib/pathie')
const Cube = require('seacreature/analytics/cube')

inject('pod', ({ hub, state }) => {
  hub.on('load cube', async () => {
    if (state.cube) return
    state.cube = {}
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
    const suppliers = Cube(supplier => supplier.Id)
    const supplier_bycompanyname = suppliers.range_single(supplier => supplier.CompanyName)
    const supplier_bycontactname = suppliers.range_single(supplier => supplier.ContactName)
    const supplier_city = suppliers.set_single(supplier => supplier.City)
    const supplier_country = suppliers.set_single(supplier => supplier.Country)
    const supplier_byphone = suppliers.range_single(supplier => supplier.Phone)
    const supplier_byfax = suppliers.range_single(supplier => supplier.Fax)
    const supplier_byproduct = suppliers.set_multiple(supplier => product_bysupplier.lookup(supplier.Id))

    // Product — Id, ProductName, SupplierId, UnitPrice, Package, IsDiscontinued
    const products = Cube(product => product.Id)
    const product_byproductname = products.range_single(product => product.ProductName)
    const product_bysupplier = products.set_single(product => product.SupplierId)
    const product_byunitprice = products.range_single(product => product.UnitPrice)
    const product_bypackage = products.range_multiple_text(product => product.Package, stemmer)
    const product_byisdiscontinued = products.range_single(product => product.IsDiscontinued)
    const product_byorderitem = products.set_multiple(product => orderitem_byproduct.lookup(product.Id))

    // Order — Id, OrderDate, CustomerId, TotalAmount, OrderNumber
    const orders = Cube(order => order.Id)
    const order_bytime = orders.range_single(order => order.ts)
    const order_bycustomer = orders.set_single(order => order.CustomerId)
    const order_bytotalamount = orders.range_single(order => order.TotalAmount)
    const order_byordernumber = orders.range_single(order => order.OrderNumber)
    const order_byorderitem = orders.set_multiple(order => orderitem_byorder.lookup(order.Id))

    // Customer — Id, FirstName, LastName, City, Country, Phone
    const customers = Cube(customer => customer.Id)
    const customer_byfirstname = customers.range_single(customer => customer.FirstName)
    const customer_bylastname = customers.range_single(customer => customer.LastName)
    const customer_city = customers.set_single(customer => customer.City)
    const customer_country = customers.set_single(customer => customer.Country)
    const customer_byphone = customers.range_single(customer => customer.Phone)
    const customer_byorder = customers.set_multiple(customer => order_bycustomer.lookup(customer.Id))

    // OrderItem — Id, OrderId, ProductId, UnitPrice, Quantity
    const orderitems = Cube(orderitem => orderitem.Id)
    const orderitem_byorder = orderitems.set_single(orderitem => orderitem.OrderId)
    const orderitem_byproduct = orderitems.set_single(orderitem => orderitem.ProductId)
    const orderitem_byunitprice = orderitems.range_single(orderitem => orderitem.UnitPrice)
    const orderitem_byquantity = orderitems.range_single(orderitem => orderitem.Quantity)

    products.link_to(suppliers, supplier_byproduct)
    suppliers.link_to(products, product_bysupplier)
    products.link_to(orderitems, orderitem_byproduct)
    orderitems.link_to(products, product_byorderitem)
    customers.link_to(orders, order_bycustomer)
    orders.link_to(customers, customer_byorder)
    orderitems.link_to(orders, order_byorderitem)
    orders.link_to(orderitems, orderitem_byorder)

    // count projections
    state.cube.counts = {
      supplier: 0,
      product: 0,
      order: 0,
      orderitem: 0,
      customer: 0
    }
    const rec_count = (cube, key) =>
      cube.on('selection changed', ({ put, del }) =>
        state.cube.counts[key] += put.length - del.length)
    rec_count(suppliers, 'supplier')
    rec_count(products, 'product')
    rec_count(orders, 'order')
    rec_count(orderitems, 'orderitem')
    rec_count(customers, 'customer')

    // project data into map structure
    const orderitems_bysupplier = new Map()
    const getorset = (map, id, value) => {
      if (!map.has(id)) map.set(id, value)
      else map.set(id, map.get(id) + value)
    }
    orderitems.on('selection changed', ({ put, del }) => {
      for (const o of put)
        for (const id of supplier_byproduct.lookup(o.ProductId))
          getorset(orderitems_bysupplier, id, 1)
      for (const o of del)
        for (const id of supplier_byproduct.lookup(o.ProductId))
          getorset(orderitems_bysupplier, id, -1)
    })


    state.cube.supplier_country_count = {}
    suppliers.on('selection changed', ({ put, del }) => {
      for (const s of put)
        pathie.assign(state.cube.supplier_country_count, [s.Country], c => (c || 0) + 1)
      for (const s of del)
        pathie.assign(state.cube.supplier_country_count, [s.Country], c => (c || 0) - 1)
    })
    // supplier_country.on('batch', ({ diff }) => {
    //   console.log(diff)
    // })
    // supplier_country.on('filter changed', diff => {
    //   console.log(diff)
    // })

    const orderitems_indicies = await orderitems.batch({ put: data.OrderItems })
    const orders_indicies = await orders.batch({ put: data.Orders })
    const customers_indicies = await customers.batch({ put: data.Customers })
    const products_indicies = await products.batch({ put: data.Products })
    const suppliers_indicies = await suppliers.batch({ put: data.Suppliers })

    await suppliers.batch_calculate_selection_change(suppliers_indicies)
    await products.batch_calculate_selection_change(products_indicies)
    await customers.batch_calculate_selection_change(customers_indicies)
    await orders.batch_calculate_selection_change(orders_indicies)
    await orderitems.batch_calculate_selection_change(orderitems_indicies)
  })
})