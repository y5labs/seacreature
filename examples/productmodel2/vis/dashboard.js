import component from '../lib/component'

const byvaluedesc = (a, b) =>
  a.value > b.value ? -1
  : a.value < b.value ? 1
  : 0

const byvalueasc = (a, b) => byvaluedesc(b, a)

const bykeydesc = (a, b) =>
  a.key > b.key ? -1
  : a.key < b.key ? 1
  : 0

const bykeyasc = (a, b) => bykeydesc(b, a)

const sorted = (obj, sort = byvaluedesc) => {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  const rows = Object.keys(obj)
    .map(key => {
      const value = obj[key]
      max = Math.max(max, value)
      min = Math.min(min, value)
      sum += value
      return { key, value }
    })
    .sort(sort)
  return { rows, max, min, sum, avg: sum / rows.length }
}

export default component({
  name: 'dasboard',
  module,
  query: ({ hub, props }) => hub.emit('load cube'),
  render: (h, { props, hub, state, route, router }) => {
    const supplier_countries = sorted(state.cube.supplier_country_count)
    console.log(supplier_countries)
    return h('div', [
      h('ul', Object.keys(state.cube.counts).map(name =>
        h('li', `${name}: ${state.cube.counts[name]}`))),
      h('ul', supplier_countries.rows.map(s =>
          h('li', `${s.key}: ${(s.value / supplier_countries.sum * 100).toFixed(0)}%`)))
    ])
  }
})
