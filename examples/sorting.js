const Cube = require('../analytics/cube')
const data = [
  { id: 1, name: 'Brenda', age: null },
  { id: 2, name: 'Justin', age: 42 },
  { id: 3, name: 'Brent', age: 9 }
]

;(async () => {
  const cube = Cube(x => x.id)
  const name = cube.range_single(x => x.name)
  const age = cube.range_single(x => x.age)

  const diff = await cube.batch({ put: data })
  await cube.batch_calculate_link_change(diff.link_change)
  await cube.batch_calculate_selection_change(diff.selection_change)

  console.log(Array.from(age.filtered(Infinity)))
  console.log(Array.from(age.filtered(-Infinity)))
})()