const diff = require('./diff')
const val = t => ({
  id: t.id,
  batchid: t.batchid,
  ts: t.ts,
  attrs: t.attrs,
  measures: t.measures
})
const puttime = t => ({
  type: 'put',
  ts: t.ts,
  batchid: t.batchid,
  id: t.id,
  value: val(t)
})

module.exports = async (ctx) => {
  const rec = ops => ctx.hub.emit('record operations', ops)
  const commit = () => ctx.hub.emit('commit operations')

  ctx.hub.on('change transactions', async (changes = []) => {
    try {
      const diffs = []

      // Deleting
      const deletions = changes.filter(d => d[0] !== null && d[1] === null)
      await rec(ctx.trans_hierarchy.batch({
        del: (await Promise.all(deletions
          .map(async d => {
            const parents = await ctx.trans_hierarchy.parents(d[0].id)
            diffs.push([diff.transaction2(d[0], null), parents])
            return parents.map(k => [d[0].id, k])
        }))).flat()
      }))
      await rec(ctx.transactions.batch(deletions.map(d => ({
        type: 'del', key: `${d[0].batchid}/${d[0].id}` }))))
      await rec(ctx.timeline.batch(deletions.map(d => ({
        type: 'del', ts: d[0].ts, batchid: d[0].batchid, id: d[0].id }))))

      // Updating
      const updates = changes.filter(d => d[0] !== null && d[1] !== null)
      const dim_updates = await Promise.all(updates.map(async t => {
          const existing = (await ctx.trans_hierarchy.parents([t[1].id]))
          .reduce((o, i) => {
            o[i] = true
            return o
          }, {})
          const dim_delta = diff.dimensions(existing, t[1].dimensions)
          diffs.push([
            diff.transaction2(t[0], t[1]),
            Object.keys(dim_delta.same)])
          diffs.push([
            diff.transaction2(null, t[1]),
            Object.keys(dim_delta.put)])
          diffs.push([
            diff.transaction2(t[0], null),
            Object.keys(dim_delta.del)])
          return {
            put: Object.keys(dim_delta.put).map(d => [t[1].id, d]),
            del: Object.keys(dim_delta.del).map(d => [t[1].id, d])
          }
        }))
      await rec(ctx.trans_hierarchy.batch(dim_updates.reduce((o, i) => {
        o.put.push(...i.put)
        o.del.push(...i.del)
        return o
      }, { put: [], del: [] })))
      await rec(ctx.transactions.batch(updates
        .filter(d => JSON.stringify(d[0]) != JSON.stringify(d[1]))
        .map(d => ({
          type: 'put', key: `${d[1].batchid}/${d[1].id}`, value: val(d[1])}))))
      await rec(ctx.timeline.batch(updates
        .filter(d => JSON.stringify(d[0]) != JSON.stringify(d[1]))
        .map(d => puttime(d[1]))))

      // Creating
      const creations = changes.filter(d => d[0] === null && d[1] !== null)
      await rec(ctx.transactions.batch(creations.map(d => ({
        type: 'put', key: `${d[1].batchid}/${d[1].id}`, value: val(d[1])}))))
      await rec(ctx.timeline.batch(creations.map(d => puttime(d[1]))))
      await rec(ctx.trans_hierarchy.batch({
        put: creations.map(d => {
          diffs.push([
            diff.transaction2(null, d[1]),
            Object.keys(d[1].dimensions)])
          return Object.keys(d[1].dimensions).map(k => [d[1].id, k])
        }).flat()
      }))

      await commit()
      await ctx.hub.emit('transactions changed', changes)
      await ctx.hub.emit('transaction diff',
        await Promise.all(diffs.map(async d => {
        d[0].dimensions = d[1].concat(await ctx.dim_hierarchy.ancestors(d[1])).reduce((o, i) => {
          o[i] = true
          return o
        }, {})
        return d[0]
      })))

    } catch (e) {
      ctx.hub.emit('cancel operations')
      console.error(e)
    }
  })
}
