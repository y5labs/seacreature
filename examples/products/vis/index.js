import inject from 'seacreature/lib/inject'

inject('route', { path: '/', component: () => import('./dashboard.js')})
inject('route', { path: '/seacreature/', component: () => import('./dashboard.js')})

import './cube'
import './actions'
import './projections'
