// step -> only release once acquire has been called
// acquire -> only release once step has been called
module.exports = () => {
  const api = {
    step_current: null,
    step_release: null,
    acquire_current: null,
    acquire_release: null,
    acquire: async () => {
      if (api.acquire_current) return api.acquire_current
      api.step_release()
      api.step_current = null
      api.acquire_current = new Promise(release =>
        api.acquire_release = release)
      return api.acquire_current
    },
    step: async () => {
      if (api.step_current) return api.step_current
      api.acquire_release()
      api.acquire_current = null
      api.step_current = new Promise(release =>
        api.step_release = release)
      return api.step_current
    }
  }
  api.acquire_current = new Promise(release =>
    api.acquire_release = release)
  return api
}