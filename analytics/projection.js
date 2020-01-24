const propagate = (cube, forwards, backwards, fn) => {
  const payload = Array(backwards.length + 1 + forwards.length)
  const backward = (i, fn) => {
    if (i >= backwards.length) return forward(0, fn)
    for (const id of backwards[i].lookup(payload[backwards.length - i])) {
      payload[backwards.length - i - 1] = id
      backward(i + 1, fn)
    }
  }
  const forward = (i, fn) => {
    if (i >= forwards.length) return fn(payload)
    for (const id of forwards[i].lookup(payload[backwards.length + i])) {
      payload[backwards.length + i + 1] = id
      forward(i + 1, fn)
    }
  }
  cube.on('selection changed', ({ put }) => {
    for (const d of put) {
      payload[backwards.length] = cube.identity(d)
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
          // console.log('-', index, pipe)
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
      cube,
      forwards.slice(index, forwards.length),
      backwards.slice(backwards.length - index, backwards.length),
      pipe => {
        for (let i = 0; i < pipe.length; i++) {
          const cube = cubes[i]
          if (!cube.filterbits.zero(cube.id2i(pipe[i]))) return
        }
        pipe = pipe.slice()
        // console.log('+', index, pipe)
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