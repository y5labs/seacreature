module.exports = () => {
  const resolutions = []
  const api = {
    count: 0,
    retain: () => {
      api.count++
      let done = false
      return () => {
        if (done) return
        done = true
        api.count--
        if (api.count == 0) {
          const toresolve = resolutions.slice()
          resolutions.length = 0
          for (const resolve of toresolve) resolve()
        }
      }
    },
    released: () => new Promise(resolve => {
      if (api.count == 0) resolve()
      else resolutions.push(resolve)
    })
  }
  return api
}
