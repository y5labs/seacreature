// https://github.com/odojs/injectinto/

const inject = () => {
  let bindings = {}
  const unbind = (key, value) => {
    if (bindings[key] == null) return
    const items = bindings[key]
    const index = items.indexOf(value)
    if (index !== -1) items.splice(index, 1)
  }
  return {
    bind: (key, value) => {
      if (!bindings[key]) bindings[key] = []
      bindings[key].push(value)
      return { off: () => unbind(key, value) }
    },
    unbind: unbind,
    one: (key) => {
      if (bindings[key] == null) throw new Error(`${key} not found`)
      const items = bindings[key]
      if (items.length > 1) throw new Error(`${key} too many bound`)
      return items[0]
    },
    oneornone: (key) => {
      if (bindings[key] == null) return null
      const items = bindings[key]
      if (items.length > 1) throw new Error(`${key} too many bound`)
      return items[0]
    },
    many: (key) => {
      if (bindings[key] == null) return []
      return bindings[key]
    },
    clear: (key) => delete bindings[key],
    reset: () => bindings = {}
  }
}

const _inject = inject()
module.exports = (key, value) => {
  if (key == null) return inject()
  return _inject.bind(key, value)
}
module.exports.bind = (key, value) => _inject.bind(key, value)
module.exports.unbind = (key, value) => _inject.unbind(key, value)
module.exports.one = (key) => _inject.one(key)
module.exports.oneornone = (key) => _inject.oneornone(key)
module.exports.many = (key) => _inject.many(key)
module.exports.clear = (key) => _inject.clear(key)
module.exports.reset = () => _inject.reset()
