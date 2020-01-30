const VueLoaderPlugin = require('vue-loader/lib/plugin')
const HtmlPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  entry: ['./frontend.js'],
  output: {
    publicPath: '/seacreature/',
    path: path.resolve(__dirname, '../../../docs'),
    filename: '[name].[hash].bundle.js'
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      {
        test: /\.styl$/,
        use: [
          'style-loader',
          'css-loader',
          'stylus-loader'
        ]
      }]
  },
  plugins: [
    new HtmlPlugin({ template: './resources/index.html', chunksSortMode: 'dependency' }),
    new VueLoaderPlugin()
  ]
}
