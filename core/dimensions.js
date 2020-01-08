module.exports = async (ctx) => {
  ctx.hub.on('change dimensions', async (changes = []) => {
    await ctx.hub.emit('record operations',
      ctx.dimensions.batch(
        changes
          .filter(d => d[0] == null)
          .map(d => ({ type: 'put', key: d[1].id, value: d[1] }))))
    await ctx.hub.emit('record operations',
      ctx.hierarchy.batch(
        changes
          .filter(d => d[0] == null)
          .map(d => Object.keys(d[1].dimensions || {})
          .map(p => ({ type: 'put', child: d[1].id, parent: p }))).flat()))
    await ctx.hub.emit('commit operations')
    await ctx.hub.emit('dimensions changed', changes)
  })
}
