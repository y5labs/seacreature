module.exports = () => {
  let current = null
  return async fn => {
    if (current) return await current
    current = fn()
    const res = await current
    current = null
    return res
  }
}