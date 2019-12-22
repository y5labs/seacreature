const Cube = require('../analytics/cube')
const { data1, data2 } = require('./test_data.js')
const intoobject = (result, item) => {
  result[item] = true
  return result
}

;(async () => {

const cube = Cube(d => d.id)
cube.on('selection changed', p => console.log({
  ...p,
  put: p.put.map(cube.identity),
  del: p.del.map(cube.identity)
}))
const children = cube.range_multiple(d => d.children
  .filter(id => cube.id2d(id))
  .map(id => cube.id2d(id).name))
const indicies1 = await cube.batch({ put: data1 })
await cube.batch_calculate_selection_change(indicies1)
const indicies2 = await cube.batch({ put: data2, del: data1 })
await cube.batch_calculate_selection_change(indicies2)
console.log(Array.from(children.filtered(Infinity), d => d[0]))

})()
