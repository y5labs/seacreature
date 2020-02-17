import inject from 'seacreature/lib/inject'
const Projection = require('seacreature/analytics/projection')
const pathie = require('seacreature/lib/pathie')

inject('pod', ({ hub, state }) => {
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
    state.cube.countrybycustomercount = {}
    state.cube.customers.on('selection changed', ({ put, del }) => {
      del.forEach(customer => {
        pathie.assign(state.cube.countrybycustomercount, [customer.Country], c => (c || 0) - 1)
      })
      put.forEach(customer => {
        pathie.assign(state.cube.countrybycustomercount, [customer.Country], c => (c || 0) + 1)
      })
    })
    state.cube.countrybysuppliercount = {}
    state.cube.suppliers.on('selection changed', ({ put, del }) => {
      del.forEach(supplier => {
        pathie.assign(state.cube.countrybysuppliercount, [supplier.Country], c => (c || 0) - 1)
      })
      put.forEach(supplier => {
        pathie.assign(state.cube.countrybysuppliercount, [supplier.Country], c => (c || 0) + 1)
      })
    })

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
})