const inject = require('seacreature/lib/inject')
const path = require('path')
const isDevelopment = process.env.NODE_ENV === 'development'

inject('pod', ({ app }) => {
  if (!isDevelopment) return
  app.get('*', (req, res) => {
    const outputPath = res.locals.webpackStats.toJson().outputPath
    res.send(res.locals.fs.readFileSync(path.join(outputPath, '/index.html'), 'utf8'))
  })
})