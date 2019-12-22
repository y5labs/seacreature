const Cube = require('../analytics/cube')
const { data1, data2 } = require('./test_data.js')

test('before batch', async () => {
  const cube = Cube(d => d.id)
  const children = cube.range_multiple(d => d.children.map(id => cube.id2d(id).name))
  await cube.batch({ put: data1 })
  expect(Array.from(children.filtered(Infinity), d => d[0]))
    .toEqual(['Derrick Smith', 'Mandy Smith', null, null, null])
})

test('changes', async () => {
  const cube = Cube(d => d.id)
  const children = cube.range_multiple(d => d.children.map(id => cube.id2d(id).name))
  await cube.batch({ put: data1 })
  await cube.batch({ put: data2 })
  expect(Array.from(children.filtered(Infinity), d => d[0]))
    .toEqual([
      'Bruce McSweeny',
      'Bruce McSweeny',
      'Derrick Smith',
      'Mandy Smith',
      'Michael Smith',
      'Michael Smith',
      'Sally McSweeny',
      'Sally McSweeny',
      'Tiger Woods',
      null,
      null,
      null,
      null,
      null,
    ])
})

test('deletes', async () => {
  const cube = Cube(d => d.id)
  const children = cube.range_multiple(d => d.children
    .filter(id => cube.id2d(id))
    .map(id => cube.id2d(id).name))
  await cube.batch({ put: data1 })
  await cube.batch({ put: data2, del: data1 })
  expect(Array.from(children.filtered(Infinity), d => d[0]))
    .toEqual([
      'Derrick Smith',
      'Mandy Smith',
      'Sally McSweeny',
      'Sally McSweeny',
      'Tiger Woods',
      null,
      null,
    ])
})
