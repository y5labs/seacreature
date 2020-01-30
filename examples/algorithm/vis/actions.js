import inject from 'seacreature/lib/inject'

inject('pod', ({ hub, state }) => {
  state.filters = {}
  hub.on('filter supplier by id', async id => {
    if (id) {
      await state.cube.supplier_byid(id)
      state.filters.supplierbyid = id
    }
    else {
      await state.cube.supplier_byid(id)
      delete state.filters.supplierbyid
    }
    await hub.emit('push trace')
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
    await hub.emit('push trace')
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
    await hub.emit('push trace')
    await hub.emit('update')
  })
})