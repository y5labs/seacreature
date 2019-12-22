const flow = require('seacreature/flow')
const tcp = require('seacreature/flow/tcp')

const stream = flow.stream()
flow([ stream, flow.each(console.log) ])
const server = tcp.server({ port: 8125, address: 'localhost' })
flow([ server, stream ])

setTimeout(() => {
  const client = tcp.client({ port: 8125, address: 'localhost' })
  setInterval(() => {
    client.emit({ time: flow.now(), ttl: flow.m(1), name: 'e1', value: 1 })
  }, 1000)
}, 2000)
