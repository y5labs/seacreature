const inject = require('seacreature/lib/inject')
const path = require('path')
const express = require('express')
const isDevelopment = process.env.NODE_ENV === 'development'

inject('pod', ({ app }) => {
  if (isDevelopment) return
  const oneDay = 1000 * 60 * 60 * 24
  app.use('/dist', [express.static(path.join(__dirname, '../', 'dist'), { maxAge: oneDay })])
  app.get('/*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')))
})