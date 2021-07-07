const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
if (!isDevelopment || typeof window !== 'undefined') {
  module.exports = state => { }
}
else {
  const { PerformanceObserver, performance } = require('perf_hooks')
  new PerformanceObserver(items => {
    for (const e of items.getEntries())
      console.log(`${(e.duration / 1000).toFixed(4)}s — ${e.name}`)
    performance.clearMarks()
  })
  .observe({ entryTypes: ['measure'] })

  let last = null
  module.exports = state => {
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
    last = state
  }
}
