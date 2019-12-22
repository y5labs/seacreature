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
  put: p.put.map(cube.identity).reduce(intoobject, {}),
  del: p.del.map(cube.identity).reduce(intoobject, {})
}))
const name = cube.range_single(d => d.name)
const indicies = await cube.batch({ put: data1 })
await cube.batch_calculate_selection_change(indicies)
await name('Michael Smith')

})()
