const propagate = (index, cubes, forwards, backwards, fn) => {
  const payload = Array(backwards.length + 1 + forwards.length)
  const backward = (i, fn) => {
    if (i >= backwards.length) return forward(0, fn)
    for (const id of backwards[i].lookup(payload[backwards.length - i])) {
      const position = backwards.length - i - 1
      const cube = cubes[position]
      if (!cube.filterbits.zero(cube.id2i(id))) continue
      payload[position] = id
      backward(i + 1, fn)
    }
  }
  const forward = (i, fn) => {
    if (i >= forwards.length) return fn(payload)
    for (const id of forwards[i].lookup(payload[backwards.length + i])) {
      const position = backwards.length + i + 1
      const cube = cubes[position]
      if (!cube.filterbits.zero(cube.id2i(id))) continue
      payload[position] = id
      forward(i + 1, fn)
    }
  }
  cubes[index].on('selection changed', ({ put }) => {
    for (const d of put) {
      payload[backwards.length] = cubes[index].identity(d)
      backward(0, pipe => fn(pipe))
    }
  })
}

module.exports = (cubes, forwards, backwards, fn) => {
  const indexbykey = new Map()
  const indexbycube = Array(cubes.length).fill(null).map(() => new Map())
  const pending = { put: [], del: [] }

  cubes.forEach((cube, index) => {
    cube.on('selection changed', ({ del }) => {
      for (const d of del) {
        const id = cube.identity(d)
        if (!indexbycube[index].has(id)) continue
        for (const hash of indexbycube[index].get(id).keys()) {
          const pipe = indexbykey.get(hash)
          console.log('-', cube.identity.toString(), pipe)
          indexbykey.delete(hash)
          pipe.forEach((id, index) => {
            if (!indexbycube[index].has(id)) return
            indexbycube[index].get(id).delete(hash)
          })
          indexbycube[index].delete(id)
          pending.del.push(pipe)
        }
      }
    })
    propagate(
      index,
      cubes,
      forwards.slice(index, forwards.length),
      backwards.slice(backwards.length - index, backwards.length),
      pipe => {
        // for (let i = 0; i < pipe.length; i++) {
        //   const cube = cubes[i]
        //   if (!cube.filterbits.zero(cube.id2i(pipe[i]))) return
        // }
        console.log('+', cubes[index].identity.toString(), pipe)
        pipe = pipe.slice()
        const hash = JSON.stringify(pipe)
        if (indexbykey.has(hash)) return
        indexbykey.set(hash, pipe)
        pipe.forEach((id, index) => {
          if (!indexbycube[index].has(id))
            indexbycube[index].set(id, new Set())
          indexbycube[index].get(id).add(hash)
        })
        pending.put.push(pipe)
      })
  })

  return () => {
    fn(pending)
    pending.put = []
    pending.del = []
  }
}