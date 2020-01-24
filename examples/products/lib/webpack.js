const inject = require('seacreature/lib/inject')
const isDevelopment = process.env.NODE_ENV === 'development'

inject('pod', ({ app }) => {
  if (!isDevelopment) return
  const webpack = require('webpack')
  const devmiddleware = require('webpack-dev-middleware')
  const hotmiddleware = require('webpack-hot-middleware')
  const config = require('./webpack.development')
  const compiler = webpack(config)
  app.use(devmiddleware(compiler, {
    publicPath: config.output.publicPath,
    serverSideRender: true
  }))
  app.use(hotmiddleware(compiler))
})
