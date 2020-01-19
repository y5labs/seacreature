import component from '../lib/component'

export default component({
  name: 'dasboard',
  module,
  // query: (ctx) => navigation.query(ctx),
  render: (h, { props, hub, state, route, router }) => {
    return h('div', 'HELLO')
  }
})