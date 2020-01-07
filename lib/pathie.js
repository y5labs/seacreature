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
    Object.keys(object[key] || {}))

const test = (object, path) =>
  visit(object, path, (object, key) =>
    object[key])

const set = (object, path, value) =>
  visit(object, path, (object, key) =>
    object[key] = value)

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

module.exports = { visit, get, test, set, del, clean }
