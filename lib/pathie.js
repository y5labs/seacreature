// https://github.com/tcoats/pathie

const visit = (object, path, fn) => {
  const length = path.length
  const lastIndex = length - 1
  let index = -1

  while (object != null && ++index < length) {
    const key = path[index]
    if (index == lastIndex) return fn(object, key)
    if (object[key] === undefined) object[key] = {}
    object = object[key]
  }
}

const get = (object, path) =>
  visit(object, path, (object, key) =>
    object[key])

const getorset = (object, path, value) =>
  visit(object, path, (object, key) => {
    if (!object[key]) object[key] = value
    return object[key]
  })

const getkeys = (object, path) =>
  visit(object, path, (object, key) =>
    Object.keys(object[key] || {}))

const set = (object, path, value) =>
  visit(object, path, (object, key) =>
    object[key] = value)

const assign = (object, path, fn) =>
  visit(object, path, (object, key) =>
    object[key] = fn(object[key]))

const del = (object, path) =>
  visit(object, path, (object, key) => {
    if (object[key] === undefined) return null
    const res = object[key]
    delete object[key]
    return res
  })

const clean = object => {
  for (const key of Object.keys(object)) {
    if (typeof object[key] !== 'object') continue
    clean(object[key])
    if (Object.keys(object[key]).length == 0)
      delete object[key]
  }
}

const flat = (object, depth) => {
  if (depth == 0) return [[object]]
  const result = []
  for (const key of Object.keys(object)) {
    if (object[key] == null) continue
    for (const row of flat(object[key], depth - 1))
      result.push([ key, ...row ])
  }
  return result
}

const build = (items) => {
  const res = {}
  for (let item of items) {
    const path = item.slice()
    const value = path.splice(-1)
    set(res, path, value[0])
  }
  return res
}

module.exports = {
  visit,
  get,
  getkeys,
  getorset,
  set,
  assign,
  del,
  clean,
  flat,
  build
}
