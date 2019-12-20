module.exports = (listeners = {}) => ({
  on: (e, fn) => {
    if (!listeners[e]) listeners[e] = []
    listeners[e].push(fn)
  },
  off: (e, fn) => {
    if (!listeners[e]) return
    const index = listeners[e].indexOf(fn)
    if (index !== -1) listeners[e].splice(index, 1)
  },
  emit: async (e, ...args) => {
    if (!listeners[e]) return
    for (const fn of listeners[e]) await fn(...args)
  }
})
