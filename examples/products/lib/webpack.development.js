const { HotModuleReplacementPlugin } = require('webpack')
const base = require('./webpack.base.js')
const merge = require('webpack-merge')

module.exports = merge(base, {
  mode: 'development',
  entry: ['webpack-hot-middleware/client'],
  plugins: [
    new HotModuleReplacementPlugin()
  ]
})
