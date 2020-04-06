module.exports = stream =>
  new Promise((resolve, reject) => {
    const result = []
    let hasended = false
    stream
      .on('data', key => { result.push(key) })
      .on('error', err => {
        if (hasended) return
        hasended = true
        reject(err)
      })
      .on('end', () => {
        if (hasended) return
        hasended = true
        resolve(result)
      })
  })