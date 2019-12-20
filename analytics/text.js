const stopwords = require('./stopwords')
const default_trim = s => s.replace(/^\W+/, '').replace(/\W+$/, '')
const default_stopword = s => !stopwords.has(s)
const default_nullcheck = s => s != null && s != ''
const default_split = /[\s\-]+/
const default_process = s => s
  .split(default_split)
  .filter(default_nullcheck)
  .map(default_trim)
  .filter(default_nullcheck)
  .filter(default_stopword)

module.exports = {
  default_trim,
  default_split,
  default_stopword,
  default_nullcheck,
  default_process
}
