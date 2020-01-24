const express = require('express')
const compression = require('compression')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const mutunga = require('http-mutunga')
const Hub = require('seacreature/lib/hub')
const inject = require('seacreature/lib/inject')
const pjson = require('../package.json')

;(async () => {

const app = express()
const httpServer = mutunga(app)
httpServer.setTimeout(5 * 60 * 1000)

app.use(compression())
app.use(cookieParser(process.env.COOKIE_SECRET))
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
app.use(bodyParser.json({ limit: '50mb' }))
app.set('json spaces', 2)

const hub = Hub()

const podctx = { app, hub }
for (let pod of inject.many('pod')) await pod(podctx)

httpServer.listen(8080, () => {
  const { address, port } = httpServer.address()
  console.log(`${pjson.name}@${pjson.version} ${address}:${port}`)
  let shuttingdown = false
  const shutdown = (method) => {
    if (shuttingdown) {
      if (method == 'SIGTERM') {
        console.log('SIGTERM – E noho rā!')
        process.exit(0)
      }
      return
    }
    shuttingdown = true
    process.stdout.write(`${method} – Ohākī... `)
    httpServer.close(() => {
      console.log('E noho rā!')
      process.exit(0)
    })
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
})

})()