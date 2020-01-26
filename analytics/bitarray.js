const array8 = (n) => new Uint8Array(n)
const array16 = (n) => new Uint16Array(n)
const array32 = (n) => new Uint32Array(n)

const lengthen = (array, length) => {
  if (array.length >= length) return array
  let copy = new array.constructor(length)
  copy.set(array)
  return copy
}

const widen = (array, width) => {
  let copy
  switch (width) {
    case 16: copy = array16(array.length); break
    case 32: copy = array32(array.length); break
    default: throw new Error('invalid array width!')
  }
  copy.set(array)
  return copy
}

// An arbitrarily-wide array of bitmasks
function BitArray(n) {
  if (!n) n = 0
  this.length = n
  this.subarrays = 1
  this.width = 8
  this.masks = { 0: 0 }
  this[0] = array8(n)
}

BitArray.prototype.lengthen = function(n) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    this[i] = lengthen(this[i], n)
  this.length = n
}

// Reserve a new bit index in the array, returns {offset, one}
BitArray.prototype.add = function() {
  for (let i = 0, len = this.subarrays; i < len; ++i) {
    const m = this.masks[i]
    const w = this.width - (32 * i)
    // isolate the rightmost zero bit and return it as an unsigned int of 32 bits, if NaN or -1, return a 0
    const one = (~m & (m + 1)) >>> 0

    if (w >= 32 && !one) continue
    if (w < 32 && (one & (1 << w))) {
      // widen this subarray
      this[i] = widen(this[i], w <<= 1)
      this.width = 32 * i + w
    }

    this.masks[i] |= one

    return { offset: i, one }
  }

  // add a new subarray
  this[this.subarrays] = array8(this.length)
  this.masks[this.subarrays] = 1
  this.width += 8
  return { offset: this.subarrays++, one: 1 }
}

// Copy record from index src to index dest
BitArray.prototype.copy = function(dest, src) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    this[i][dest] = this[i][src]
}

// Truncate the array to the given length
BitArray.prototype.truncate = function(n) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    for (let j = this.length - 1; j >= n; j--)
      this[i][j] = 0
  this.length = n
}

// Checks that all bits for the given index are 0
BitArray.prototype.zero = function(n) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    if (this[i][n]) return false
  return true
}

BitArray.prototype.clear = function(n) {
  for (let i = 0, len = this.subarrays; i < len; ++i) this[i][n] = 0
}

// Checks that all bits for the given index are 0 except for possibly one
BitArray.prototype.zeroExcept = function(n, offset, zero) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    if (i === offset ? this[i][n] & zero : this[i][n])
      return false
  return true
}
// Checks that all bits for the given index are 0 except for a mask
// Mask is of the same format as the subarrays
BitArray.prototype.zeroExceptMask = function(n, mask) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    if (mask.length > i) {
      if (this[i][n] & ~ mask[i]) return false
    }
    else if (this[i][n]) return false
  return true
}
// Checks that only the specified bit is set for the given index
BitArray.prototype.only = function(n, offset, one) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    if (this[i][n] != (i === offset ? one : 0))
      return false
  return true
}
// Checks that only the specified bit is set for the given index except for a mask
// Mask is of the same format as the subarrays
BitArray.prototype.onlyExceptMask = function(n, offset, one, mask) {
  for (let i = 0, len = this.subarrays; i < len; ++i)
    if (mask.length > i) {
      if ((this[i][n] & ~ mask[i]) != (i === offset ? one : 0))
        return false
    }
    else if (this[i][n] != (i === offset ? one : 0))
      return false
  return true
}

// Checks that only the specified bit is set for the given index except for possibly one other
BitArray.prototype.onlyExcept = function(n, offset, zero, onlyOffset, onlyOne) {
  for (let i = 0, len = this.subarrays; i < len; ++i) {
    let mask = this[i][n]
    if (i === offset) mask &= zero
    if (mask != (i === onlyOffset ? onlyOne : 0))
      return false
  }
  return true
}

module.exports = {
  array8, array16, array32, lengthen, widen, BitArray
}