// module.exports = ({ start = 0, end, incr = 1, delay = 1000 }) => {
//   let is_aborted = false
//   let value = start
//   return {
//     value: () => value,
//     is_aborted: () => is_aborted,
//     abort: () => is_aborted = true,
//     [Symbol.asyncIterator]: () => ({
//       next: async () => {
//         if (is_aborted || value > end)
//           return { done: true }
//         if (value == start) {
//           value += incr
//           return { value: start, done: false }
//         }
//         await sleep(delay)
//         const result = value
//         value += incr
//         return { value: result, done: false }
//       }
//     })
//   }
// }

module.exports = ({ start = 0, end, incr = 1, delay = 1000 }) => {
  let is_aborted = false
  let value = start
  async function * fn() {
    yield value
    while (!is_aborted && value + incr <= end) {
      await sleep(delay)
      if (is_aborted) break
      value += incr
      yield value
    }
  }
  const result = fn()
  result.value = () => value
  result.is_aborted = () => is_aborted
  result.abort = () => is_aborted = true
  return result
}