import inject from 'seacreature/lib/inject'
import mutex from 'seacreature/lib/mutex'

const changes_to_cubes = mutex()

inject('pod', ({ hub, state }) => {
  state.filters = {}
  hub.on('filter supplier by id', async id => {
    const release = await changes_to_cubes.acquire()
    if (id) {
      await state.cube.supplier_byid(id)
      state.filters.supplierbyid = id
    }
    else {
      await state.cube.supplier_byid(id)
      delete state.filters.supplierbyid
    }
    release()
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter product by id', async id => {
    const release = await changes_to_cubes.acquire()
    if (id) {
      await state.cube.product_byid(id)
      state.filters.productbyid = id
    }
    else {
      await state.cube.product_byid(id)
      delete state.filters.productbyid
    }
    release()
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter customer by id', async id => {
    const release = await changes_to_cubes.acquire()
    if (id) {
      await state.cube.customer_byid(id)
      state.filters.customerbyid = id
    }
    else {
      await state.cube.customer_byid(id)
      delete state.filters.customerbyid
    }
    release()
    await hub.emit('calculate projections')
    await hub.emit('update')
  })
  hub.on('filter order by id', async id => {
    const release = await changes_to_cubes.acquire()
    if (id) {
      await state.cube.order_byid(id)
      state.filters.orderbyid = id
    }
    else {
      await state.cube.order_byid(id)
      delete state.filters.orderbyid
    }
    release()
    await hub.emit('calculate projections')
    await hub.emit('update')
  })

  let index = 6
  setInterval(async () => {
    const release = await changes_to_cubes.acquire()
    const diff = await state.cube.orders.batch({ put: [{
      Id: index,
      CustomerId: 'Paul',
      ProductIds: ['Eggplant']
    }] })
    index++
    for (const key of Object.keys(diff))
      await state.cube.orders.batch_calculate_link_change(diff.link_change)
    for (const key of Object.keys(diff))
      await state.cube.orders.batch_calculate_selection_change(diff.selection_change)
    release()
    await hub.emit('calculate projections')
    await hub.emit('update')
  }, 2000)

})