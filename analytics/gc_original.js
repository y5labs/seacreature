const checkisroot = (cube, i) => {
  if (cube.mark[i] === true) return true
  const isroot = !cube.filterbits.zeroExcept(i, cube.linkfilter.bitindex.offset, ~cube.linkfilter.bitindex.one)
  if (isroot) cube.mark[i] = true
  return isroot
}

const visit = (cube, fn) => {
  const seen = new Set()
  const tovisit = new Set([cube])
  while (tovisit.size > 0) {
    const visiting = Array.from(tovisit)
    tovisit.clear()
    for (const current of visiting) {
      seen.add(current)
      fn(current)
      for (const forward of current.forward.keys())
        if (!seen.has(forward)) tovisit.add(forward)
    }
  }
}

const clear = start =>
  visit(start, cube => {
    for (let i = 0; i < cube.mark.length; i++)
      cube.mark[0] = false
  })

const collect = async (cube, candidates) => {
  if (candidates.length == 0) return
  const seen = new Map()
  const see = (cube, i) => {
    if (!seen.has(cube)) seen.set(cube, new Set())
    seen.get(cube).add(i)
  }
  const unsee = (cube, i) => {
    seen.get(cube).delete(i)
  }
  const hasseen = (cube, i) => {
    if (!seen.has(cube)) return false
    return seen.get(cube).has(i)
  }
  const cancollect = async (cube, i) => {
    // if (cube.mark[i] === true) return false
    see(cube, i)
    for (const [source, dimension] of cube.backward.entries()) {
      // only follow refs
      const current = dimension.filterindex.get(i)
      if (!current || current.count != 0) continue
      const links = Array.from(dimension.backward.get(i).keys())
      let ref = links.length
      for (const id of links.filter(id => dimension.forward.get(id).count == 0)) {
        const sourceindex = source.id2i(id)
        if (hasseen(source, sourceindex)) continue
        const isroot = checkisroot(source, sourceindex)
        if (!isroot && await cancollect(source, sourceindex)) {
          await source.linkfilter({ put: [sourceindex] })
          // fix marks around change
          continue
        }
        ref--
      }
      if (ref == 0) {
        unsee(cube, i)
        return false
      }
    }
    unsee(cube, i)
    return true
  }

  for (const i of candidates) {
    if (cube.filterbits.zero(i)) continue
    if (await cancollect(cube, i)) {
      await cube.linkfilter({ put: [i] })
    }
  }
}

module.exports = {
  clear,
  collect
}