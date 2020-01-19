import hyperscript from 'vue-hyperscript-terse'

// https://vuejs.org/v2/guide/render-function.html
export default ({name, query, render, module}) => {
  const result = {
    name: name,
    functional: true,
    query: query,
    render: (h, ctx) => {
      return render(hyperscript(h), {
        state: ctx.parent.$store.state,
        route: ctx.parent.$route,
        router: ctx.parent.$router,
        hub: ctx.props.hub || ctx.data.hub || ctx.parent.$hub,
        ...ctx
      })
    }
  }
  if (module && module.hot) {
    const api = require('vue-hot-reload-api')
    const Vue = require('vue')
    api.install(Vue)
    if (!api.compatible) throw new Error('vue-hot-reload-api is not compatible with the version of Vue you are using.')
    module.hot.accept()
    if (!module.hot.data) api.createRecord(name, result)
    else api.rerender(name, result)
  }
  return result
}
