import inject from 'seacreature/lib/inject'

inject('pod', ({ hub, state }) => {
  hub.on('filter supplier by country', async country => {
    if (country) {
      await state.cube.supplier_country.hidenulls()
      await state.cube.supplier_country.selectnone()
      await state.cube.supplier_country({ put: [country] })
      state.filters.supplierbycountry = country
    }
    else {
      await state.cube.supplier_country.shownulls()
      await state.cube.supplier_country.selectall()
      delete state.filters.supplierbycountry
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter customer by country', async country => {
    if (country) {
      await state.cube.customer_country.hidenulls()
      await state.cube.customer_country.selectnone()
      await state.cube.customer_country({ put: [country] })
      state.filters.customerbycountry = country
    }
    else {
      await state.cube.customer_country.shownulls()
      await state.cube.customer_country.selectall()
      delete state.filters.customerbycountry
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter supplier by id', async id => {
    if (id) {
      await state.cube.supplier_byid(id)
      state.filters.supplierbyid = id
    }
    else {
      await state.cube.supplier_byid(id)
      delete state.filters.supplierbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter customer by id', async id => {
    if (id) {
      await state.cube.customer_byid(id)
      state.filters.customerbyid = id
    }
    else {
      await state.cube.customer_byid(id)
      delete state.filters.customerbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter product by id', async id => {
    if (id) {
      await state.cube.product_byid(id)
      state.filters.productbyid = id
    }
    else {
      await state.cube.product_byid(id)
      delete state.filters.productbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter order by id', async id => {
    if (id) {
      await state.cube.order_byid(id)
      state.filters.orderbyid = id
    }
    else {
      await state.cube.order_byid(id)
      delete state.filters.orderbyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter orderitem by id', async id => {
    if (id) {
      await state.cube.orderitem_byid(id)
      state.filters.orderitembyid = id
    }
    else {
      await state.cube.orderitem_byid(id)
      delete state.filters.orderitembyid
    }
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
})