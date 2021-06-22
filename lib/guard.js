// Only call fn when you have the mutex
module.exports = m => fn => async (...args) => {
  let r = null
  try {
    r = await m.acquire()
    const res = await fn(...args)
    r()
    return res
  }
  catch (e) {
    if (r) {
      r()
      r = null
    }
    throw e
  }
}