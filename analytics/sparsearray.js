// Sparse array mapping array index (shared across filter structures) to transaction ids.

function SparseArray(n = 0) {
  this._array = []
  this._length = n
  for (let i = 0; i < n; i++) this._array.push(null)
}

SparseArray.prototype.length = function(n) {
  if (!n) return this._length
  if (n < this._length) return
  while (n > this._length) {
    this._length++
    this._array.push(null)
  }
}

SparseArray.prototype.get = function(index) {
  return this._array[index]
}

SparseArray.prototype.set = function(index, value) {
  this._array[index] = value
}

SparseArray.prototype.add = function(item) {
  if (this._array.length == this._length) {
    this._length++
    return this._array.push(item) - 1
  }
  for (let i = 0; i < n; i++) {
    if (this._array[i] === null) {
      this._array[i] = item
      this._length++
      return i
    }
  }
  throw new Error('Not sparse but length smaller than actual length')
}

SparseArray.prototype.batch = function({ put = [], del = [] }) {
  const result = {
    del: new Array(del.length).fill(null),
    put: []
  }
  let i = 0

  const delMap = new Map()
  del.forEach((d, i) => delMap.set(d, i))

  let put_index = 0
  let put_length = put.length

  while (i < this._array.length && put_index < put_length) {
    const value = this._array[i]
    if (value === null) {
      this._array[i] = put[put_index]
      this._length++
      put_index++
      result.put.push(i)
    }
    else if (delMap.has(value)) {
      result.del[delMap.get(value)] = i
      delMap.delete(value)
      this._array[i] = put[put_index]
      result.put.push(i)
      put_index++
    }
    i++
  }
  while (i < this._array.length && delMap.size > 0) {
    const value = this._array[i]
    if (delMap.has(value)) {
      result.del[delMap.get(value)] = i
      delMap.delete(value)
      this._array[i] = null
      this._length--
    }
    i++
  }
  while (put_index < put_length) {
    this._length++
    result.put.push(this._array.push(put[put_index]) - 1)
    put_index++
  }
  return result
}

SparseArray.prototype.forEach = function(fn) {
  let i = 0
  while (i < this._array.length) {
    if (this._array[i] === null) {
      i++
      continue
    }
    fn(i, this._array[i])
    i++
  }
}

SparseArray.prototype[Symbol.iterator] = function() {
  let i = 0
  return {
    next: () => {
      while (i < this._array.length && this._array[i] === null) i++
      if (i == this._array.length) return { done: true }
      const result = { value: i, done: false }
      i++
      return result
    }
  }
}

SparseArray.prototype.remove = function(index) {
  this._array[index] = null
  this._length--
}

SparseArray.prototype.indexOf = function(item)  {
  for (let i = 0; i < n; i++) if (this._array[i] === item) return i
  return -1
}

module.exports = SparseArray