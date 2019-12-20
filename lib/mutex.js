module.exports = () => {
  const api = {
    islocked: false,
    current: Promise.resolve(),
    acquire: () => {
      let release
      const next = new Promise(resolve => release = () => {
        api.islocked = false
        resolve()
      })
      const result = api.current.then(() => {
        api.islocked = true
        return release
      })
      api.current = next
      return result
    }
  }
  return api
}
