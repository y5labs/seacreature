// This datastructure pre-computes all parent, grandparent, nth ancestor and descendants. Modifications are processed as a diff so they can be used to update other datasets.

module.exports = (db, prefix, dataset = []) => {
  const decode_forward = key => {
    const [prefix, literal, n, child, parent] = key.split('/')
    return { n, child, parent }
  }
  const decode_backward = key => {
    const [prefix, literal, n, parent, child] = key.split('/')
    return { n, parent, child }
  }
  const encode_forward = (n, child, parent) =>
    `${prefix}/→/${n}/${child}/${parent}`
  const encode_backward = (n, parent, child) =>
    `${prefix}/←/${n}/${parent}/${child}`
  const forward_get = (n, node) => ({
    gt: `${prefix}/→/${n}/${node}/\x00`,
    lt: `${prefix}/→/${n}/${node}/\xff`
  })
  const backward_get = (n, node) => ({
    gt: `${prefix}/←/${n}/${node}/\x00`,
    lt: `${prefix}/←/${n}/${node}/\xff`
  })
  const read = options =>
    new Promise((resolve, reject) => {
      const result = []
      db.createKeyStream(options)
        .on('data', key => { result.push(key) })
        .on('end', () => resolve(result))
    })
  const getmaxdepth = async () =>
    Number(decode_forward((
      await read({ reverse: true, limit: 1 }))[0]).n)
  const getalldepths = async () =>
    [...Array(await getmaxdepth() + 1).keys()]

  // Pass through an array of from -> to for pre-populating the structure rather than iterating on each addition.
  const _open = db.open().then(async () => {
    await db.batch(dataset.map(d => [
      { type: 'put', key: encode_forward(0, d[0], d[1]), value: true },
      { type: 'put', key: encode_backward(0, d[1], d[0]), value: true }
    ]).flat())
    let depth = 0
    while (true) {
      // Might be nice to create an alternate structure for this
      // so we don't have to read everything at a certain depth
      // but this is in startup anyway so not a huge deal.
      // Could keep an in-memory store instead as we've created
      // all this data ourselves.
      const nodes = await read({
        gt: `${prefix}/→/${depth}/\x00`,
        lt: `${prefix}/→/${depth}/\xff`
      })
      if (nodes.length == 0) break
      const parents = Object.keys(nodes.map(decode_forward)
        .reduce((o, i) => {
          o[i.child] = true
          return o
        }, {}))
      for (const node of parents) {
        const children = (await read(backward_get(0, node)))
          .map(decode_backward)
          .map(d => d.child)
        const ancestors = (await read(forward_get(depth, node)))
          .map(decode_forward)
          .map(d => d.parent)
        await db.batch(
          children.map(from => ancestors.map(to => ([
            {
              type: 'put',
              key: encode_forward(depth + 1, from, to),
              value: true
            },
            {
              type: 'put',
              key: encode_backward(depth + 1, to, from),
              value: true
            }
          ]))).flat().flat()
        )
      }
      depth++
    }
  })
  const api = {
    open: () => _open,
    read,
    apply: async ({ put = [], del = [] }) => {
      const operations = []
      for (const o of put)
        operations.push({
          type: 'put',
          key: encode_forward(o[0], o[1], o[2]),
          value: true
        },
        {
          type: 'put',
          key: encode_backward(o[0], o[2], o[1]),
          value: true
        })
      for (const o of del)
        operations.push({
          type: 'del',
          key: encode_forward(o[0], o[1], o[2]),
          value: true
        },
        {
          type: 'del',
          key: encode_backward(o[0], o[2], o[1]),
          value: true
        })
      await db.batch(operations)
    },
    del: async (from, to) => {
      try {
        await db.get(encode_forward(0, from, to))
      } catch (e) {
        return []
      }
      const depths = await getalldepths()
      const ancestors = [[0, to]].concat((await Promise.all(
        depths.map(async depth =>
          (await read(forward_get(depth, to)))
            .map(d => [depth + 1, decode_forward(d).parent])
        ))).flat())
      const descendants = [[0, from]].concat((await Promise.all(
        depths.map(async depth =>
          (await read(backward_get(depth, from)))
            .map(d => [depth + 1, decode_backward(d).child])
        ))).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    put: async (from, to) => {
      try {
        await db.get(encode_forward(0, from, to))
        return []
      } catch (e) { }
      const depths = await getalldepths()
      const ancestors = [[0, to]].concat((await Promise.all(
        depths.map(async depth =>
          (await read(forward_get(depth, to)))
            .map(d => [depth + 1, decode_forward(d).parent])
        ))).flat())
      const descendants = [[0, from]].concat((await Promise.all(
        depths.map(async depth =>
          (await read(backward_get(depth, from)))
            .map(d => [depth + 1, decode_backward(d).child])
        ))).flat())
      return ancestors.map(a => descendants.map(b =>
        [a[0] + b[0], b[1], a[1]])).flat()
    },
    ancestors: async (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = await getalldepths()
      for (const depth of depths)
        for (const n of nodes)
          for (const d of await read(forward_get(depth, n)))
            result[decode_forward(d).parent] = true
      return Object.keys(result)
    },
    descendants: async (nodes, depths = null) => {
      const result = {}
      if (!depths) depths = await getalldepths()
      for (const depth of depths)
        for (const n of nodes)
          for (const d of await read(backward_get(depth, n)))
            result[decode_backward(d).child] = true
      return Object.keys(result)
    }
  }
  return api
}
