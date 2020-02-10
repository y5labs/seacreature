const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
if (!isDevelopment) {
  module.exports = (state) => { }
  return
}

const { PerformanceObserver, performance } = require('perf_hooks')

let perf_entry = null
new PerformanceObserver((items) => {
  items.getEntries().forEach(e => perf_entry = e)
  performance.clearMarks()
})
.observe({ entryTypes: ['measure'] })

let last = null

const perf = state => {
  if (!state) {
    last = 'start'
    performance.mark('start')
    return null
  }

  if (!last) {
    last = state
    performance.mark(state)
    return null
  }

  performance.mark(state)
  performance.measure(state, last, state)
  // console.log(`${(perf_entry.duration / 1000).toFixed(4)}s — ${perf_entry.name}`)
  performance.mark(state)
  last = state
  return perf_entry
}

module.exports = state => {
  const e = perf(state)
  console.log(`${(e.duration / 1000).toFixed(4)}s — ${e.name}`)
}
module.exports.perf = perf
