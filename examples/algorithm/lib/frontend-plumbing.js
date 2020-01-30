import Vue from 'vue'
import Router from 'vue-router'
import Hub from 'seacreature/lib/hub'
import inject from 'seacreature/lib/inject'

;(async () => {

Vue.config.devtools = false
Vue.config.productionTip = false

// Routes
Vue.use(Router)
const router = new Router({
  mode: 'history',
  scrollBehaviour: (to, from, savedPosition) => {
    if (to.hash) return { selector: to.hash }
    if (savedPosition) return savedPosition
    return { x: 0, y: 0 }
  },
  base: process.env.BASE_URL
})

// TODO: Support CSRF with Express
// // Setup axios with CSRF protection
// import axios from 'axios'
// axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
// const token = document.head.querySelector('meta[name="csrf-token"]')
// if (token) axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content
// else console.error('CSRF token not found: https://laravel.com/docs/csrf#csrf-x-csrf-token')

// Setup event bus hub and state
const hub = Hub()
const state = {}
Vue.use({
  install: (Vue, options) => {
    Vue.mixin({
      beforeCreate: function () {
        const options = this.$options
        if (options.hub) this.$hub = options.hub
        else if (options.parent && options.parent.$hub)
          this.$hub = options.parent.$hub
        if (options.state) this.$state = options.state
        else if (options.parent && options.parent.$state)
          this.$state = options.parent.$state
      }
    })
  }
})


// launch Vue
const props = {}
const scene = new Vue({
  router, state, hub, render: h => h('router-view', { props: props })
})

// Unidirectional data flow
hub.on('update', (p) => {
  Object.assign(props, p)
  return scene.$forceUpdate()
})
hub.on('reset', (p) => {
  for (let k of Object.keys(props)) delete props[k]
  return hub.emit('update')
})
// an opportunity for functional components to query
router.beforeResolve((route, from, next) => {
  const queryctx = {
    route,
    hub,
    state,
    props,
    router
  }

  Promise.all(route.matched
    .filter(m => m.components.default && m.components.default.query != null)
    .map(m => m.components.default.query(queryctx)))
    .then(next)
})
// clear props (transient state) after link navigation
router.afterEach((to, from) => hub.emit('reset'))

// Dispatch to many pods
const podctx = { router, hub, state, scene, props }
for (let pod of inject.many('pod')) await pod(podctx)
// unidirectional data flow - router does not pass through
// it's props so we have to inject them

inject('route', { path: '/notfound', component: () => import('../resources/notfound.vue')})
inject('route', { path: '/*', redirect: '/notfound' })
router.addRoutes(inject.many('route').map(r => {
  const p = r.props || (() => {})
  r.props = (route) => ({ ...props, ...p() })
  return r
}))

hub.emit('init').then(() => scene.$mount('#root'))

})()