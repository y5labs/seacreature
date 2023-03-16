export default ms => {
  let is_cancelled = false
  let reject = null
  const complete = new Promise(async (resolve, rej) => {
    reject = rej
    await sleep(ms)
    if (!is_cancelled) resolve(false)
  })
  return {
    complete,
    cancel: () => {
      if (!is_cancelled) {
        is_cancelled = true
        reject()
      }
    }
  }
}
