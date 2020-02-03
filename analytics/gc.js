module.exports = async (cube, candidates) => {
  if (candidates.length == 0) return
  // await cube.trace({
  //   op: 'gc cube',
  //   target: cube.print(),
  //   id: 'GC',
  //   desc: candidates.map(cube.i2id),
  //   ref: null })
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
  const isrootlookup = new Map()
  const checkisroot = (cube, i) => {
    if (!isrootlookup.has(cube)) isrootlookup.set(cube, new Map())
    const node = isrootlookup.get(cube)
    if (!node.has(i)) {
      const isroot = !cube.filterbits.zeroExcept(i, cube.linkfilter.bitindex.offset, ~cube.linkfilter.bitindex.one)
      node.set(i, isroot)
      return isroot
    }
    return node.get(i)
  }
  const cancollect = async (cube, i) => {
    // await cube.trace({
    //   op: 'gc cube',
    //   target: cube.print(),
    //   id: cube.i2id(i),
    //   desc: 'test',
    //   ref: null })
    see(cube, i)
    for (const [source, dimension] of cube.backward.entries()) {
      // only follow refs
      if (dimension.filterindex.get(i) != 0) continue
      // await cube.trace({
      //   op: 'gc dimension',
      //   source: cube.print(),
      //   target: source.print(),
      //   id: cube.i2id(i),
      //   desc: 'check' })
      const links = Array.from(dimension.backward.get(i).keys())
      let ref = links.length
      for (const id of links.filter(id => dimension.forward.get(id).count == 0)) {
        const sourceindex = source.id2i(id)
        if (hasseen(source, sourceindex)) continue
        const isroot = checkisroot(source, sourceindex)
        if (isroot) {
          ref--
          // await cube.trace({
          //   op: 'gc cube',
          //   target: source.print(),
          //   id: source.i2id(sourceindex),
          //   desc: 'is root',
          //   ref })
        }
        else if (await cancollect(source, sourceindex)) {
          // await cube.trace({
          //   op: 'gc cube',
          //   target: source.print(),
          //   id: source.i2id(sourceindex),
          //   desc: 'can',
          //   ref })
          await source.linkfilter({ put: [sourceindex] })
        }
        else {
          ref--
          // await cube.trace({
          //   op: 'gc cube',
          //   target: source.print(),
          //   id: source.i2id(sourceindex),
          //   desc: 'cant',
          //   ref })
        }
      }
      if (ref == 0) {
        // await cube.trace({
        //   op: 'gc cube',
        //   target: source.print(),
        //   id: links,
        //   desc: 'NO',
        //   ref })
        unsee(cube, i)
        return false
      }
    }
    // await cube.trace({
    //   op: 'gc cube',
    //   target: cube.print(),
    //   id: cube.i2id(i),
    //   desc: 'YES',
    //   ref: null })
    unsee(cube, i)
    return true
  }

  for (const i of candidates) {
    if (cube.filterbits.zero(i)) continue
    if (await cancollect(cube, i)) {
      // await cube.trace({
      //   op: 'gc cube',
      //   target: cube.print(),
      //   id: cube.i2id(i),
      //   desc: 'Collect',
      //   ref: null })
      await cube.linkfilter({ put: [i] })
    }
    // else {
    //   await cube.trace({
    //     op: 'gc cube',
    //     target: cube.print(),
    //     id: cube.i2id(i),
    //     desc: 'Ignore',
    //     ref: null })
    // }
  }
  // await cube.trace({ op: 'finish gc' })
}