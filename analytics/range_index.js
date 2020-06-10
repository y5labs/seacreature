// A range is a sorted array of key value pairs.
// Keys can be duplicated. Values cannot but aren't checked.

// Locate the first instance of x or the first item larger
const bisect_left = (a, x, lo, hi) => {
  lo = Math.max(lo, 0)
  // hi = Math.min(hi, a.length - 1)
  while (lo < hi) {
    const mid = lo + hi >>> 1
    // if (a[mid] == null) console.log({ a, x, lo, hi })
    if (a[mid] && a[mid][0] < x) lo = mid + 1
    else hi = mid
  }
  lo = Math.min(a.length - 1, lo)
  if (a[lo][0] < x) return lo + 1
  return lo
}

// Locate the last instance of x or the last item smaller
const bisect_right = (a, x, lo, hi) => {
  lo = Math.max(lo, 0)
  // hi = Math.min(hi, a.length - 1)
  while (lo < hi) {
    let mid = (lo + hi >>> 1) + 1
    // if (a[mid] == null) console.log({ a, x, lo, hi })
    if (a[mid] && a[mid][0] > x) hi = mid - 1
    else lo = mid
  }
  lo = Math.min(a.length - 1, lo)
  if (a[lo][0] > x) return lo - 1
  return lo
}

const update_left = (range, filter, indicies, lo) => {
  if (lo === null || range.length == 0) return 0

  // no pivots
  if (filter[0] === null && filter[1] === null)
    return bisect_left(range, lo, 0, range.length - 1)

  // double pivot
  if (filter[0] !== null && filter[1] !== null)
    return lo < filter[0]
      ? bisect_left(range, lo, 0, indicies[0])
      : lo < filter[1]
      ? bisect_left(range, lo, indicies[0], indicies[1])
      : bisect_left(range, lo, indicies[1], range.length - 1)

  // single pivot
  const pivot = filter[0] !== null ? indicies[0] : indicies[1]
  return lo < pivot
    ? bisect_left(range, lo, 0, pivot)
    : bisect_left(range, lo, pivot, range.length - 1)
}

const update_right = (range, filter, indicies, hi) => {
  if (hi === null || range.length == 0) return range.length - 1

  // no pivots
  if (filter[0] === null && filter[1] === null)
    return bisect_right(range, hi, 0, range.length - 1)

  // double pivot
  if (filter[0] !== null && filter[1] !== null)
    return hi > filter[1]
      ? bisect_right(range, hi, indicies[1], range.length - 1)
      : hi > filter[0]
      ? bisect_right(range, hi, indicies[0], indicies[1])
      : bisect_right(range, hi, 0, indicies[0])

  // single pivot
  const pivot = filter[0] !== null ? indicies[0] : indicies[1]
  return hi > pivot
    ? bisect_right(range, hi, pivot, range.length - 1)
    : bisect_right(range, hi, 0, pivot)
}

// Update the related structures for filtering
const update = (range, filter, indicies, lo, hi) => {
  const res = [
    update_left(range, filter, indicies, lo),
    update_right(range, filter, indicies, hi)
  ]
  if (res[0] > res[1]) return [res[1], res[0]]
  return res
}

const indicies_diff = (prev, now) => {
  // no overlap
  if (prev[1] < now[0] || prev[0] > now[1]) {
    return {
      del: range(prev[0], prev[1]),
      put: range(now[0], now[1])
    }
  }

  const result = {
    put: [],
    del: []
  }

  if (now[0] < prev[0])
    result.put = result.put.concat(range(now[0], prev[0] - 1))
  else
    result.del = result.del.concat(range(prev[0], now[0] - 1))

  if (prev[1] == 0) result.put.push(0)
  if (now[1] > prev[1])
    result.put = result.put.concat(range(prev[1] + 1, now[1]))
  else
    result.del = result.del.concat(range(now[1] + 1, prev[1]))

  return result
}

const range = (start, end) => {
  if (end < 0 || start < 0 || end < start) return []
  return new Array(end - start + 1).fill().map((d, i) => i + start)
}

// Sort function for a range
const sort = (a, b) =>
  a[0] < b[0] ? -1
  : a[0] > b[0] ? 1
  : 0

// bulk changes of deletions and additions
const batch2 = (range, { del = [], put = [] }) => {
  const result = []

  // range is already sorted
  del.sort(sort)
  put.sort(sort)
  let i0 = 0
  let ir = 0
  let ia = 0
  const n0 = range.length
  const nr = del.length
  const na = put.length
  while (i0 < n0 || ir < nr || ia < na) {
    // finished with original range
    // add all remaining and we are done
    if (i0 === n0) {
      while (ia < na) {
        result.push(put[ia])
        ia++
      }
      break
    }

    // finished with all modifications
    // add all original and we are done
    if (ir === nr && ia === na) {
      while (i0 < n0) {
        result.push(range[i0])
        i0++
      }
      break
    }

    // add all that are smaller
    while (ia < na && put[ia][0] < range[i0][0]) {
      result.push(put[ia])
      ia++
    }

    // skip any removals that are smaller
    while (ir < nr && del[ir][0] < range[i0][0]) {
      ir++
    }

    // should we skip or add the current original
    if (ir < nr && del[ir][0] === range[i0][0] && del[ir][1] === range[i0][1]) ir++
    else {
      result.push(range[i0])
    }

    i0++
  }
  return result
}

// bulk changes of deletions and additions
const batch = (range, { del = [], put = [] }) => {
  const result = {
    range: [],
    put: [],
    del: []
  }

  // range is already sorted
  del.sort(sort)
  put.sort(sort)
  let i0 = 0
  let ir = 0
  let ia = 0
  const n0 = range.length
  const nr = del.length
  const na = put.length
  while (i0 < n0 || ir < nr || ia < na) {
    // finished with original range
    // add all remaining and we are done
    if (i0 === n0) {
      while (ia < na) {
        result.range.push(put[ia])
        result.put.push(put[ia])
        ia++
      }
      break
    }

    // finished with all modifications
    // add all original and we are done
    if (ir === nr && ia === na) {
      while (i0 < n0) {
        result.range.push(range[i0])
        i0++
      }
      break
    }

    // add all that are smaller
    while (ia < na && put[ia][0] < range[i0][0]) {
      result.range.push(put[ia])
      result.put.push(put[ia])
      ia++
    }

    // skip any removals that are smaller
    while (ir < nr && del[ir][0] < range[i0][0]) ir++

    // should we skip or add the current original
    if (ir < nr && del[ir][0] === range[i0][0] && del[ir][1] === range[i0][1]) {
      result.del.push(del[ir])
      ir++
    }
    else result.range.push(range[i0])

    i0++
  }
  return result
}

// side effect single change
const put = (range, item) => {
  const index = bisect_left(range, item[0], 0, range.length)
  if (index === -1) range.push(item)
  else range.splice(index, 0, item)
}

// side effect single change
const del = (range, item) => {
  let index = bisect_left(range, item[0], 0, range.length)
  while (index < range.length && range[index][0] === item[0])
    if (range[index][1] === item[1]) range.splice(index, 1)
    else index++
}

module.exports = {
  batch,
  batch2,
  put,
  del,
  sort,
  bisect_left,
  bisect_right ,
  update,
  update_left,
  update_right,
  range,
  indicies_diff
}
