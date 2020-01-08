const diff = require('./diff')

module.exports = async (ctx) => {
  const rec = (ops) => ctx.hub.emit('record operations', ops)
  const commit = () => ctx.hub.emit('commit operations')

  ctx.hub.on('change transactions', async (changes = []) => {
    for (const t of changes) {
      const [prev, now] = t
      if (now == null) await rec(ctx.transactions.batch([
        { type: 'del', key: `${prev.batchid}/${prev.id}` }]))
      else {
        await rec(ctx.transactions.batch([
          { type: 'put', key: `${now.batchid}/${now.id}`, value: now }]))
        if (prev && prev.ts != now.ts) await rec(ctx.timeline.batch([
          { type: 'del', ts: prev.ts, batchid: prev.batchid, id: prev.id }]))
        await rec(ctx.timeline.batch([
          { type: 'put', ts: now.ts, batchid: now.batchid, id: now.id, value: now }]))
      }
    }
    await commit()
    await ctx.hub.emit('transactions changed',
      await Promise.all(changes.map(async t => {
        const delta = diff.transaction(t[0], t[1])
        for (const d of delta)
          for (const ancestor of await ctx.dim_hierarchy.ancestors(Object.keys(d.dimensions)))
            d.dimensions[ancestor] = true
        return delta
      })))
  })
}
