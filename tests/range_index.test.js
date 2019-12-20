const RangeIndex = require('../analytics/range_index')

test('batch2', async () => {
  const range = [
    [ 100, 'Hello' ],
    [ 200, 'Hi' ],
    [ 200, 'Hi2' ],
    [ 300, 'Bye' ]
  ]
  const result1 = RangeIndex.batch2(range, { put: [[100, 'Yo']] })
  expect(result1).toEqual([
    [ 100, 'Hello' ],
    [ 100, 'Yo' ],
    [ 200, 'Hi' ],
    [ 200, 'Hi2' ],
    [ 300, 'Bye' ]
  ])
  const result2 = RangeIndex.batch2(result1, { put: [[100, 'Yo2']], del: [[200, 'Hi2']] })
  expect(result2).toEqual([
    [ 100, 'Hello' ],
    [ 100, 'Yo' ],
    [ 100, 'Yo2' ],
    [ 200, 'Hi' ],
    [ 300, 'Bye' ]
  ])
})

test('update', async () => {
  const range = [
    [ 'Bruce McSweeny', 1 ],
    [ 'Derrick Smith', 3 ],
    [ 'Mandy Smith', 2 ],
    [ 'Michael Smith', 0 ]
  ]
  const indicies = RangeIndex.update(range, [ null, null ], [0, 3], 'Michael Smith', 'Michael Smith')
  expect(indicies).toEqual([3, 3])
})

const test_range = [[1], [1], [2], [3], [4], [4], [9]]

test('bisect_right 1', async () => {
  expect(RangeIndex.bisect_right(
    test_range, 4, 0, 6
  )).toBe(5)
})

test('bisect_right 2', async () => {
  expect(RangeIndex.bisect_right(
    test_range, 9, 0, 6
  )).toBe(6)
})

test('bisect_right 3', async () => {
  expect(RangeIndex.bisect_right(
    test_range, -2, 0, 6
  )).toBe(0)
})

test('bisect_left 1', async () => {
  expect(RangeIndex.bisect_left(
    test_range, 4, 0, 6
  )).toBe(4)
})

test('bisect_left 2', async () => {
  expect(RangeIndex.bisect_left(
    test_range, 9, 0, 6
  )).toBe(6)
})

test('bisect_left 2', async () => {
  expect(RangeIndex.bisect_left(
    test_range, 14, 0, 6
  )).toBe(6)
})
