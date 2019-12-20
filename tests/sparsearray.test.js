const SparseArray = require('../analytics/sparsearray')

test('batch del missing', async () => {
  const index = new SparseArray()
  const result1 = index.batch({ put: ['One', 'Two', 'Three'] })
  expect(result1).toEqual({ del: [], put: [0, 1, 2] })
  const result2 = index.batch({ del: ['Four'] })
  expect(result2).toEqual({ del: [null], put: [] })
})

test('batch put and del', async () => {
  const index = new SparseArray()
  const result1 = index.batch({ put: ['One', 'Two', 'Three'] })
  const result2 = index.batch({ put: ['Four'], del: ['Two'] })
  expect(result2).toEqual({ del: [1], put: [1] })
})