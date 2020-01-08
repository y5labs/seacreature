module.exports = async ({ db, hub, timeline, transactions, hierarchy, dimensions }) => {
  await Promise.all([
    timeline.open(),
    transactions.open(),
    hierarchy.open(),
    dimensions.open(),
  ])

  let pending = []
  hub.on('on operations committed', async fn => {
    const commit = async () => {
      hub.off('operations committed', commit)
      hub.off('operations cancelled', cancel)
      await fn()
    }
    const cancel = async () => {
      hub.off('operations committed', commit)
      hub.off('operations cancelled', cancel)
    }
    hub.on('operations committed', commit)
    hub.on('operations cancelled', cancel)
  })
  hub.on('record operations', operations => pending.push(operations))
  hub.on('cancel operations', async () => {
    const operations = pending
    pending = []
    await Promise.all(operations.map(o => o.emit('cancel')))
    await hub.emit('operations cancelled')
  })
  hub.on('commit operations', async () => {
    const operations = pending
    pending = []
    const toexecute = operations.map(o => o.operations).flat()
    // console.log(toexecute)
    await db.batch(toexecute)
    await Promise.all(operations.map(o => o.emit('commit')))
    await hub.emit('operations committed')
  })
}
