module.exports = async (cube, candidates) => {
  await cube.trace({ op: 'start gc' })
  const seen = new Map()
  const push = (cube, i) => {
    if (!seen.has(cube)) seen.set(cube, new Set())
    seen.get(cube).add(i)
  }
  const pop = (cube, i) => {
    seen.get(cube).delete(i)
  }
  const has = (cube, i) => {
    if (!seen.has(cube)) return false
    return seen.get(cube).has(i)
  }
  const cancollect = async (cube, i) => {
    await cube.trace({
      op: 'gc cube',
      target: cube.print(),
      id: cube.i2id(i),
      desc: 'test',
      ref: null })
    push(cube, i)
    for (const [source, dimension] of cube.backward.entries()) {
      // only follow refs
      if (dimension.filterindex.get(i) != 0) continue
      await cube.trace({
        op: 'gc dimension',
        source: cube.print(),
        target: source.print(),
        id: cube.i2id(i),
        desc: 'check' })
      const links = Array.from(dimension.backward.get(i).keys())
      let ref = links.length
      for (const id of links.filter(id => dimension.forward.get(id).count == 0)) {
        const sourceindex = source.id2i(id)
        if (has(source, sourceindex)) continue
        const isroot = !source.filterbits.zeroExcept(sourceindex, source.linkfilter.bitindex.offset, ~source.linkfilter.bitindex.one)
        if (isroot) {
          ref--
          await cube.trace({
            op: 'gc cube',
            target: source.print(),
            id: source.i2id(sourceindex),
            desc: 'is root',
            ref })
        }
        else if (await cancollect(source, sourceindex)) {
          await cube.trace({
            op: 'gc cube',
            target: source.print(),
            id: source.i2id(sourceindex),
            desc: 'can',
            ref })
          await source.linkfilter({ put: [sourceindex] })
        }
        else {
          ref--
          await cube.trace({
            op: 'gc cube',
            target: source.print(),
            id: source.i2id(sourceindex),
            desc: 'cant',
            ref })
        }
      }
      if (ref == 0) {
        await cube.trace({
          op: 'gc cube',
          target: source.print(),
          id: links,
          desc: 'NO',
          ref })
        pop(cube, i)
        return false
      }
    }
    await cube.trace({
      op: 'gc cube',
      target: cube.print(),
      id: cube.i2id(i),
      desc: 'YES',
      ref: null })
    pop(cube, i)
    return true
  }

  for (const i of candidates) {
    if (await cancollect(cube, i)) {
      await cube.trace({
        op: 'gc cube',
        target: cube.print(),
        id: cube.i2id(i),
        desc: 'cube collect',
        ref: null })
      await cube.linkfilter({ put: [i] })
    }
  }
  await cube.trace({ op: 'finish gc' })
}