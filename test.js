const ƒ = require('./flow')
// const flow = require('seacreature/flow')
// const tls = require('seacreature/tls')
// const tcp = require('seacreature/tcp')

// create a source of events
const stream = ƒ.stream()
// const stream = tls.server({ port: 8125, cert: 'xxx', key: 'yyy' })
// const stream = tcp.server({ port: 8125, cert: 'xxx', key: 'yyy' })

// event lake
const index = ƒ.coalesce((e) => e.name)
// setInterval(() => console.log(index.all()), 1000)

ƒ([
  stream,
  ƒ.debounce(ƒ.s(5)),
  ƒ.each(console.log)
])

setInterval(() => {
  stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e1', value: 1 })
}, 4000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e2', value: 2 })
  }, 4000),
1000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e1', value: 3 })
  }, 4000),
2000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e2', value: 4 })
  }, 4000),
3000)
