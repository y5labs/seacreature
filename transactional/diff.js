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
  if (!prev) return { ...now, dimensions: { ...now.dimensions },
    measures: measures({}, now.measures) }
  if (!now) return { ...prev, dimensions: { ...prev.dimensions },
    measures: measures(prev.measures, {}) }
  return { ...now, dimensions: { ...now.dimensions },
    measures: measures(prev.measures, now.measures) }
}

module.exports = { dimensions, measures, transaction }
