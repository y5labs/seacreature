(async () => {

const dataset = [
  ['C', 'A'], ['D', 'A'], ['E', 'A'],
  ['F', 'B'], ['G', 'B'],
  ['H', 'E'], ['I', 'E'], ['J', 'E'], ['K', 'E'],
  ['L', 'H'], ['M', 'H']
]

const bacon1 = require('seacreature/analytics/graph')
const graph1 = bacon1(dataset)

const level = require('level')
const db = level('data/scratch')
const bacon2 = require('seacreature/persistence/graph')
const graph2 = bacon2(db, 'graph')
await graph2.open()

console.log(graph1.del('H', 'E'))
console.log(await graph2.del('H', 'E'))

// graph1.apply({ del: graph1.del('H', 'E') })
// await graph2.apply({ del: await graph2.del('H', 'E') })

console.log(graph1.put('H', 'F'))
console.log(await graph2.put('H', 'F'))

// graph1.apply({ put: graph1.put('H', 'E') })
// await graph2.apply({ put: await graph2.put('H', 'E') })

// console.log(await graph2.read())

// console.log(graph._forward)
// console.log(graph._backward)

// console.log(graph1.descendants(['A']))
// console.log(await graph2.descendants(['A']))

// console.log(graph1.ancestors(['M']))
// console.log(await graph2.ancestors(['M']))

})()