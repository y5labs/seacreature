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
      customer: { selected: 0, total: 0 }
    }
    state.cube.diff = {
      supplier: { put: 0, del: 0 },
      product: { put: 0, del: 0 },
      order: { put: 0, del: 0 },
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
    rec_counts(state.cube.customers, 'customer')

    // hub.on('calculate projections', () => orderitemsintocustomers())
  })
})
