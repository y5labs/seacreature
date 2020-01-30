const inject = require('seacreature/lib/inject')
const path = require('path')
const express = require('express')

inject('pod', ({ app }) => {
  app.use('/seacreature/data', express.static(path.join(__dirname, '../../../', 'docs', 'data')))
  app.use('/public', express.static(path.join(__dirname, '../', 'public')))
})