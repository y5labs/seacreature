import inject from 'seacreature/lib/inject'
import papa from 'papaparse'
import axios from 'axios'
const { DateTime } = require('luxon')
const stemmer = require('stemmer')
const pathie = require('seacreature/lib/pathie')
const Cube = require('seacreature/analytics/cube')
const numeral = require('numeral')

let c = null

inject('pod', ({ hub, state }) => {
  hub.on('clear cube diff', () => {
    c.diff = {
      supplier: { put: 0, del: 0 },
      product: { put: 0, del: 0 },
      order: { put: 0, del: 0 },
      orderitem: { put: 0, del: 0 },
      customer: { put: 0, del: 0 }
    }
  })
  hub.on('print cube diff', () => {
    console.log(Object.keys(c.diff).map(k => `   ${k[0]} ${c.diff[k].put.toString().padStart(3, ' ')}+ ${c.diff[k].del.toString().padStart(3, ' ')}-`).join(''))
  })
  hub.on('filter supplier by country', async country => {
    await hub.emit('clear cube diff')
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
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter customer by country', async country => {
    await hub.emit('clear cube diff')
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
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter supplier by id', async name => {
    await hub.emit('clear cube diff')
    if (name) {
      await c.supplier_byid(name)
      state.filters.supplierbyid = name
    }
    else {
      await c.supplier_byid(name)
      delete state.filters.supplierbyid
    }
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter customer by id', async id => {
    await hub.emit('clear cube diff')
    if (id) {
      await c.customer_byid(id)
      state.filters.customerbyid = id
    }
    else {
      await c.customer_byid(id)
      delete state.filters.customerbyid
    }
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter product by id', async id => {
    await hub.emit('clear cube diff')
    if (id) {
      await c.product_byid(id)
      state.filters.productbyid = id
    }
    else {
      await c.product_byid(id)
      delete state.filters.productbyid
    }
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter order by id', async id => {
    await hub.emit('clear cube diff')
    if (id) {
      await c.order_byid(id)
      state.filters.orderbyid = id
    }
    else {
      await c.order_byid(id)
      delete state.filters.orderbyid
    }
    await hub.emit('print cube diff')
    await hub.emit('update')
  })
  hub.on('filter orderitem by id', async id => {
    await hub.emit('clear cube diff')
    if (id) {
      await c.orderitem_byid(id)
      state.filters.orderitembyid = id
    }
    else {
      await c.orderitem_byid(id)
      delete state.filters.orderitembyid
    }
    await hub.emit('print cube diff')
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
    c.supplierbyspend = {}
    c.customerbyspend = {}
    c.productbyunits = {}
    c.countrybyspendposition = {}

    const propagate = (cube, forwards, backwards, fn) => {
      const payload = Array(backwards.length + 1 + forwards.length)
      const backward = (i, fn) => {
        if (i >= backwards.length) return forward(0, fn)
        for (const id of backwards[i].lookup(payload[backwards.length - i])) {
          payload[backwards.length - i - 1] = id
          backward(i + 1, fn)
        }
      }
      const forward = (i, fn) => {
        if (i >= forwards.length) return fn(payload)
        for (const id of forwards[i].lookup(payload[backwards.length + i])) {
          payload[backwards.length + i + 1] = id
          forward(i + 1, fn)
        }
      }
      cube.on('selection changed', ({ put }) => {
        for (const d of put) {
          payload[backwards.length] = cube.identity(d)
          backward(0, pipe => fn(pipe))
        }
      })
    }


    const projection = (cubes, forwards, backwards, fn) => {
      const indexbykey = new Map()
      const indexbycube = Array(cubes.length).fill(new Map())
      const pending = { put: [], del: [] }

      cubes.forEach((cube, index) => {
        propagate(
          cube,
          forwards.slice(index, forwards.length),
          backwards.slice(backwards.length - index, backwards.length),
          pipe => {
            pipe = pipe.slice()
            const hash = JSON.stringify(pipe)
            if (indexbykey.has(hash)) return
            indexbykey.set(hash, pipe)
            pipe.forEach((id, index) => {
              if (!indexbycube[index].has(id))
                indexbycube[index].set(id, new Set())
              indexbycube[index].get(id).add(hash)
            })
            pending.put.push(pipe)
          })
        cube.on('selection changed', ({ del }) => {
          for (const d of del) {
            const id = cube.identity(d)
            if (indexbycube[index].has(id)) {
              for (const hash of indexbycube[index].get(id).keys()) {
                const pipe = indexbykey.get(hash)
                indexbykey.delete(hash)
                pending.del.push(pipe)
                pipe.forEach((id, index) =>
                  indexbycube[index].get(id).delete(hash))
              }
            }
          }
        })
      })

      return () => {
        fn(pending)
        pending.put = []
        pending.del = []
      }
    }

    const supplierbyspend = {}
    const proj = projection(
      [c.orderitems, c.products, c.suppliers],
      [c.product_byorderitem, c.supplier_byproduct],
      [c.product_bysupplier, c.orderitem_byproduct],
      ({ put, del }) => {
        for (const [ orderitemid, productid, supplierid ] of put) {
          const orderitem = c.orderitems.id2d(orderitemid)
          pathie.assign(supplierbyspend, [supplierid], c => (c || 0) + orderitem.UnitPrice * orderitem.Quantity)
        }
        for (const [ orderitemid, productid, supplierid ] of del) {
          const orderitem = c.orderitems.id2d(orderitemid)
          pathie.assign(supplierbyspend, [supplierid], c => (c || 0) - orderitem.UnitPrice * orderitem.Quantity)
        }
      })

    c.orderitems.on('selection changed', ({ put, del }) => {
      for (const o of put) {
        const spend = o.UnitPrice * o.Quantity
        for (const id of c.supplier_byproduct.lookup(o.ProductId)) {
          pathie.assign(c.supplierbyspend,
            [id], c => (c || 0) + spend)
          pathie.assign(c.countrybyspendposition,
            [c.suppliers.id2d(id).Country], c => (c || 0) + spend)
        }
        pathie.assign(c.customerbyspend,
          [c.orders.id2d(o.OrderId).CustomerId], c => (c || 0) + spend)
        pathie.assign(c.countrybyspendposition,
          [c.customers.id2d(c.orders.id2d(o.OrderId).CustomerId).Country],
            c => (c || 0) - spend)
        pathie.assign(c.productbyunits,
          [o.ProductId], c => (c || 0) + o.Quantity)
      }
      for (const o of del) {
        const spend = o.UnitPrice * o.Quantity
        for (const id of c.supplier_byproduct.lookup(o.ProductId)) {
          pathie.assign(c.supplierbyspend,
            [id], c => (c || 0) - spend)
          pathie.assign(c.countrybyspendposition,
            [c.suppliers.id2d(id).Country], c => (c || 0) - spend)
        }
        pathie.assign(c.customerbyspend,
          [c.orders.id2d(o.OrderId).CustomerId], c => (c || 0) - spend)
        pathie.assign(c.countrybyspendposition,
          [c.customers.id2d(c.orders.id2d(o.OrderId).CustomerId).Country],
            c => (c || 0) + spend)
        pathie.assign(c.productbyunits,
          [o.ProductId], c => (c || 0) - o.Quantity)
      }
    })

    c.countrybysuppliercount = {}
    c.suppliers.on('selection changed', ({ put, del }) => {
      for (const s of put) pathie.assign(c.countrybysuppliercount,
        [s.Country], c => (c || 0) + 1)
      for (const s of del) pathie.assign(c.countrybysuppliercount,
        [s.Country], c => (c || 0) - 1)
    })

    c.countrybycustomercount = {}
    c.customers.on('selection changed', ({ put, del }) => {
      for (const u of put) pathie.assign(c.countrybycustomercount,
        [u.Country], c => (c || 0) + 1)
      for (const u of del) pathie.assign(c.countrybycustomercount,
        [u.Country], c => (c || 0) - 1)
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

    proj()
    console.log(c.supplierbyspend)
    console.log(supplierbyspend)
  })
})