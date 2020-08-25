// https://github.com/odojs/injectinto/

const inject = () => {
  const bindings = new Map()
  const unbind = (key, value) => {
    if (!bindings.has(key)) return
    const items = bindings.get(key)
    const index = items.indexOf(value)
    if (index !== -1) items.splice(index, 1)
  }
  return {
    bindings: () => bindings,
    bind: (key, value) => {
      if (!bindings.has(key)) bindings.set(key, [])
      bindings.get(key).push(value)
      return { off: () => unbind(key, value) }
    },
    unbind,
    one: key => {
      if (!bindings.has(key)) throw new Error(`${key} not found`)
      const items = bindings.get(key)
      if (items.length > 1) throw new Error(`${key} too many bound`)
      return items[0]
    },
    oneornone: key => {
      if (!bindings.has(key)) return null
      const items = bindings.get(key)
      if (items.length > 1) throw new Error(`${key} too many bound`)
      return items[0]
    },
    many: key => {
      if (!bindings.has(key)) return []
      return bindings.get(key)
    },
    clear: key => bindings.delete(key),
    reset: () => bindings.clear()
  }
}

const _inject = inject()
module.exports = (key, value) => {
  if (key == null) return inject()
  return _inject.bind(key, value)
}
module.exports.bind = (key, value) => _inject.bind(key, value)
module.exports.unbind = (key, value) => _inject.unbind(key, value)
module.exports.one = key => _inject.one(key)
module.exports.oneornone = key => _inject.oneornone(key)
module.exports.many = key => _inject.many(key)
module.exports.clear = key => _inject.clear(key)
module.exports.reset = () => _inject.reset()
module.exports.bindings = () => _inject.bindings()
