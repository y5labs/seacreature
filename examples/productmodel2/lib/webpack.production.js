const base = require('./webpack.base.js')
const merge = require('webpack-merge')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = merge(base, {
  mode: 'production',
  plugins: [
    new CleanWebpackPlugin()
  ]
})