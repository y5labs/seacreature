const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
if (!isDevelopment) {
  module.exports = (state) => { }
  return
}

const { PerformanceObserver, performance } = require('perf_hooks')

new PerformanceObserver((items) => {
  items.getEntries().forEach(e =>
    console.log(`${(e.duration / 1000).toFixed(4)}s — ${e.name}`))
  performance.clearMarks()
})
.observe({ entryTypes: ['measure'] })

let last = null

module.exports = (state) => {
  if (!state) {
    last = 'start'
    performance.mark('start')
    return
  }

  if (!last) {
    last = state
    performance.mark(state)
    return
  }

  performance.mark(state)
  performance.measure(state, last, state)
  performance.mark(state)
  last = state
}