module.exports = initial => {
  const listeners = {}
  const unhandled = []
  if (initial) for (let e of Object.keys(initial)) listeners[e] = [initial[e]]

  const emit = (e, ...args) => {
    if (listeners[e] == null)
      return Promise.all(unhandled.map((fn) => fn(e, ...args)))
    return Promise.all(listeners[e].map((fn) => fn(...args)))
  }

  return {
    on: (e, fn) => {
      if (!listeners[e]) listeners[e] = []
      listeners[e].push(fn)
    },
    off: (e, fn) => {
      if (!listeners[e]) return
      const index = listeners[e].indexOf(fn)
      if (index !== -1) listeners[e].splice(index, 1)
    },
    emit: emit,
    unhandled: fn => unhandled.push(fn),
    unhandledOff: fn => {
      const index = unhandled.indexOf(fn)
      if (index !== -1) unhandled.splice(index, 1)
    },
    child: initial => {
      const res = module.exports(initial)
      res.unhandled((e, ...args) => emit(e, ...args))
      return res
    },
    create: (initial) => module.exports(initial)
  }
}
