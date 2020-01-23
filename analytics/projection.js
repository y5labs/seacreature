module.exports = (cubes, forwards, backwards, fn) => {
  const indexbykey = new Map()
  const indexbycube = Array(cubes.length).fill(new Map())
  const pending = { put: [], del: [] }

  cubes.forEach((cube, index) => {
    propagate(
      cube,
      forwards.slice(index, forwards.length),
      backwards.slice(backwards.length - index, backwards.length),
      pipe => {
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
    cube.on('selection changed', ({ del }) => {
      for (const d of del) {
        const id = cube.identity(d)
        if (indexbycube[index].has(id)) {
          for (const hash of indexbycube[index].get(id).keys()) {
            const pipe = indexbykey.get(hash)
            indexbykey.delete(hash)
            pending.del.push(pipe)
            pipe.forEach((id, index) =>
              indexbycube[index].get(id).delete(hash))
          }
        }
      }
    })
  })

  return () => {
    fn(pending)
    pending.put = []
    pending.del = []
  }
}