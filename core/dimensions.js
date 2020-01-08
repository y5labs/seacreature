module.exports = async (ctx) => {
  ctx.hub.on('change dimensions', async (changes = []) => {
    const deltas = {
      del: [],
      put: []
    }
    // // Deletions
    // // Remove all relationships one at a time
    // for (const c of changes.filter(d => d[0] !== null && d[1] === null)) {
      
    // }
    // changes.filter(d => d[0] !== null && d[1] !== null)


    await ctx.hub.emit('record operations',
      ctx.dimensions.batch(
        changes
          .filter(d => d[0] === null && d[1] !== null)
          .map(d => ({ type: 'put', key: d[1].id, value: {
            id: d[1].id,
            attrs: d[1].attrs
          } }))))
    await ctx.hub.emit('commit operations')
    // Creation
    for (const d of changes.filter(d => d[0] === null && d[1] !== null))
      for (const c of Object.keys(d[1].dimensions)) {
        const put = await ctx.hierarchy.put(d[1].id, c)
        await ctx.hub.emit('record operations',
          ctx.hierarchy.batch({ put }))
        await ctx.hub.emit('commit operations')
        deltas.put.push(...put)
      }
    console.log(deltas)
    // await ctx.hub.emit('record operations',
    //   ctx.hierarchy.batch(
    //     changes
    //       .filter(d => d[0] == null)
    //       .map(d => Object.keys(d[1].dimensions || {})
    //       .map(p => ({ type: 'put', child: d[1].id, parent: p }))).flat()))
    await ctx.hub.emit('commit operations')
    await ctx.hub.emit('dimensions changed', changes)
  })
}
