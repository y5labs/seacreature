import inject from 'seacreature/lib/inject'

inject('route', { path: '/', component: () => import('./dashboard.js')})

import './cube'
