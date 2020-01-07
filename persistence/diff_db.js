const diff = require('./diff')

module.exports = (data) => ({
  transaction: (prev, now) => {
    const ops = []
    if (now == null) ops.push(data.transactions.batch([
      { type: 'del', key: `${prev.batchid}/${prev.id}` }]))
    else {
      ops.push(data.transactions.batch([
        { type: 'put', key: `${now.batchid}/${now.id}`, value: now }]))
      if (prev && prev.ts != now.ts)
        ops.push(data.transactions_timeline.batch([
          { type: 'del', ts: prev.ts, batchid: prev.batchid, id: prev.id }]))
      ops.push(data.transactions_timeline.batch([
        { type: 'put', ts: now.ts, batchid: now.batchid, id: now.id, value: now }]))
    }
    return ops
  },
  transaction_delta: (prev, now) => {
    const delta = diff.transaction(prev, now)
    for (const d of delta)
      for (const dim of Object.keys(d.dimensions))
        for (const ancestor of data.dimensions_hierarchy.ancestors(dim))
          d.dimensions[ancestor] = true
    return delta
  }
})