const Cube = require('../analytics/cube')
const { data1, data2 } = require('./test_data.js')

test('nothing', async () => {
  const cube = Cube(d => d.id)
  expect(cube.index.length()).toBe(0)
})

test('batch changes', async () => {
  const cube = Cube(d => d.id)
  await cube.batch({ put: data1 })
  expect(cube.index.length()).toBe(data1.length)
  await cube.batch({ put: data2 })
  expect(cube.index.length()).toBe(data1.length + data2.length)
  await cube.batch({ del: data1 })
  expect(cube.index.length()).toBe(data2.length)
})

test('simultanious put and del', async () => {
  const cube = Cube(d => d.id)
  await cube.batch({ put: data1 })
  expect(cube.index.length()).toBe(data1.length)
  await cube.batch({ del: data1, put: data2 })
  expect(cube.index.length()).toBe(data2.length)
})

const sort = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0
const intoobject = (result, item) => {
  result[item] = true
  return result
}

test('cube batch', async () => {
  const cube = Cube(d => d.id)
  const diff = jest.fn()
  cube.on('selection changed', p => {
    const payload = {
      ...p,
      put: p.put.map(cube.identity).reduce(intoobject, {}),
      del: p.del.map(cube.identity).reduce(intoobject, {})
    }
    console.log(payload)
    return diff(payload)
  })
  const name = cube.range_single(d => d.name)
  const indicies = await cube.batch({ put: data1 })
  await cube.batch_calculate_selection_change(indicies)
  await name('Michael Smith')
  expect(diff.mock.calls[0][0]).toEqual({
    put: data1.map(cube.identity).reduce(intoobject, {}),
    del: {}
  })
  expect(diff.mock.calls[1][0]).toEqual({
    bitindex: { offset: 0, one: 1 },
    put: {},
    del: data1
      .filter(d => d.name != 'Michael Smith')
      .map(cube.identity)
      .reduce(intoobject, {})
  })
})
