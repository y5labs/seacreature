const Cube = require('../analytics/cube')
const { data1, data2 } = require('./test_data.js')

test('before batch', async () => {
  const cube = Cube(d => d.id)
  const ts = cube.range_single(d => d.ts)
  await cube.batch({ put: data1 })
  expect(Array.from(ts.filtered(Infinity), d => d[0]))
    .toEqual([100, 200, 800, 800])
})

test('after batch', async () => {
  const cube = Cube(d => d.id)
  await cube.batch({ put: data1 })
  const ts = cube.range_single(d => d.ts)
  expect(Array.from(ts.filtered(Infinity), d => d[0]))
    .toEqual([100, 200, 800, 800])
})

test('changes', async () => {
  const cube = Cube(d => d.id)
  const ts = cube.range_single(d => d.ts)
  await cube.batch({ put: data1 })
  await cube.batch({ put: data2 })
  expect(Array.from(ts.filtered(Infinity), d => d[0]))
    .toEqual([100, 200, 200, 300, 800, 800, 900, 900, 900])
})

test('deletes', async () => {
  const cube = Cube(d => d.id)
  const ts = cube.range_single(d => d.ts)
  await cube.batch({ put: data1 })
  await cube.batch({ put: data2, del: data1 })
  expect(Array.from(ts.filtered(Infinity), d => d[0]))
    .toEqual([200, 300, 900, 900, 900])
})
