const byvaluedesc = (a, b) =>
  a.value > b.value ? -1
  : a.value < b.value ? 1
  : 0

const byvalueasc = (a, b) => byvaluedesc(b, a)

const bykeydesc = (a, b) =>
  a.key > b.key ? -1
  : a.key < b.key ? 1
  : 0

const bykeyasc = (a, b) => bykeydesc(b, a)

const objstats = (obj, sort = byvaluedesc) => {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  const rows = Object.keys(obj)
    .map(key => {
      const value = obj[key]
      max = Math.max(max, value)
      min = Math.min(min, value)
      sum += value
      return { key, value }
    })
    .sort(sort)
  return { rows, max, min, sum, avg: sum / rows.length }
}

objstats.byvaluedesc = byvaluedesc
objstats.byvalueasc = byvalueasc
objstats.bykeydesc = bykeydesc
objstats.bykeyasc = bykeyasc

module.exports = objstats
