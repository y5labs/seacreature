const diff = require('./diff')

module.exports = async (ctx) => {
  const rec = ops => ctx.hub.emit('record operations', ops)
  const commit = () => ctx.hub.emit('commit operations')

  ctx.hub.on('change dimensions', async (changes = []) => {
    try {
      const deltas = {
        del: [],
        put: []
      }

      // Deleting
      const deletions = changes.filter(d => d[0] !== null && d[1] === null)
      for (const d of deletions) {
        for (const c of await ctx.dim_hierarchy.ancestors([d[0].id], [0])) {
          const del = await ctx.dim_hierarchy.del(d[0].id, c)
          deltas.del.push(...del)
          await rec(ctx.dim_hierarchy.batch({ del }))
          await commit()
        }
      }
      await rec(ctx.dimensions.batch(deletions
          .map(d => ({ type: 'del', key: d[0].id }))))

      // Updating
      const updates = changes.filter(d => d[0] !== null && d[1] !== null)
      for (const d of updates) {
        const existing = (await ctx.dim_hierarchy.ancestors([d[1].id], [0]))
          .reduce((o, i) => {
            o[i] = true
            return o
          }, {})
        const dim_delta = diff.dimensions(existing, d[1].dimensions)
        for (const c of Object.keys(dim_delta.del)) {
          const del = await ctx.dim_hierarchy.del(d[1].id, c)
          deltas.del.push(...del)
          await rec(ctx.dim_hierarchy.batch({ del }))
          await commit()
        }
        for (const c of Object.keys(dim_delta.put)) {
          const put = await ctx.dim_hierarchy.put(d[1].id, c)
          deltas.put.push(...put)
          await rec(ctx.dim_hierarchy.batch({ put }))
          await commit()
        }
      }
      await rec(ctx.dimensions.batch(updates
        .filter(d =>
          JSON.stringify(d[0].attrs) != JSON.stringify(d[1].attrs))
        .map(d => ({ type: 'put', key: d[1].id, value: {
          id: d[1].id,
          attrs: d[1].attrs
        }}))))

      // Creating
      const creations = changes.filter(d => d[0] === null && d[1] !== null)
      await rec(ctx.dimensions.batch(creations
        .map(d => ({ type: 'put', key: d[1].id, value: {
          id: d[1].id,
          attrs: d[1].attrs
        }}))))
      await commit()
      for (const d of creations)
        for (const c of Object.keys(d[1].dimensions)) {
          const put = await ctx.dim_hierarchy.put(d[1].id, c)
          deltas.put.push(...put)
          await rec(ctx.dim_hierarchy.batch({ put }))
          await commit()
        }
      await commit()
      await ctx.hub.emit('dimensions changed', changes)
      await ctx.hub.emit('dimension link deltas', deltas)

    } catch (e) {
      ctx.hub.emit('cancel operations')
      console.error(e)
    }
  })
}
