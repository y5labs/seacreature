(async () => {

const level = require('level-mem')
const db = level('data/scratch')
const links = require('seacreature/transactional/links')
const link = links(db, 'link')

const dump = () => new Promise((resolve, reject) => {
  const result = []
  db.createKeyStream()
    .on('data', key => { result.push(key) })
    .on('end', () => resolve(result))
})

await db.batch(link.batch({
  put: [
    ['C', 'A'], ['D', 'A'], ['E', 'A'],
    ['F', 'B'], ['G', 'B'],
    ['H', 'E'], ['I', 'E'], ['J', 'E'], ['K', 'E'],
    ['L', 'H'], ['M', 'H']
  ]
}).operations)

console.log(await dump())

console.log(await link.children('A'))



})()