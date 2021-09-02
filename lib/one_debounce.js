// Executes an async function at most one concurrently, debouncing more calls, executing them later
module.exports = fn => {
  let current = null
  let next = null
  let next_args = null
  let next_release = null
  const attempt = async (...args) => {
    if (current) {
      next_args = args
      if (next) return await next
      next = new Promise(resolve => next_release = r => { resolve(r) })
      return await next
    }
    current = fn(...args)
    const res = await current
    current = null
    if (next) {
      const now = next
      const now_args = next_args
      const now_release = next_release
      next = null
      next_args = null
      next_release = null
      attempt(...now_args).then(now_release)
    }
    return res
  }
  return attempt
}
