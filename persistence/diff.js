const dimensions = (prev, now) => {
  const res = {
    put: {},
    del: {},
    same: {}
  }
  for (const key of Object.keys(prev))
    if (now[key] !== undefined) res.same[key] = true
    else res.del[key] = true
  for (const key of Object.keys(now))
    if (prev[key] === undefined) res.put[key] = true
  return res
}

const measures = (prev, now) => {
  const res = {}
  for (const key of Object.keys(prev))
    if (now[key] !== undefined) {
      if (prev[key] - now[key] !== 0)
        res[key] = now[key] - prev[key]
    }
    else res[key] = - prev[key]
  for (const key of Object.keys(now))
    if (prev[key] === undefined) res[key] = now[key]
  return res
}

const transaction = (prev, now) => {
  if (!prev) return [{
    ...now, dimensions: { ...now.dimensions },
    measures: measures({}, now.measures) }]
  if (!now) return [{
    ...prev, dimensions: { ...prev.dimensions },
    measures: measures(prev.measures, {}) }]
  if (prev.ts != now.ts) return [
    { ...prev, dimensions: { ...prev.dimensions },
      measures: measures(prev.measures, {}) },
    { ...now, dimensions: { ...now.dimensions },
      measures: measures({}, now.measures) }
  ]
  const res = []
  const diff = dimensions(
    prev.dimensions, now.dimensions)
  if (Object.keys(diff.del).length > 0) res.push({
    ...prev, dimensions: diff.del,
    measures: measures(prev.measures, {})
  })
  if (Object.keys(diff.put).length > 0) res.push({
    ...now, dimensions: diff.put,
    measures: measures({}, now.measures)
  })
  if (Object.keys(diff.same).length > 0) {
    const m = measures(prev.measures, now.measures)
    if (Object.keys(m) > 0)
      res.push({ ...now, dimensions: same, measures: m })
  }
  return res
}

module.exports = { dimensions, measures, transaction }
