const extend = require('extend')

const now = () => new Date().valueOf()

const unit = (params) => {
  let kids = []
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => params.emit(e, (e) => {
    for (let k of kids) k.emit(e)
  })
  if (params.copy == null) {
    res.copy = () => {
      let twin = unit(params)
      for (let k of kids) twin(k.copy())
      return twin
    }
  } else {
    res.copy = () => {
      let twin = params.copy()
      for (let k of kids) twin(k.copy())
      return twin
    }
  }
  return res
}

const stream = () => {
  return unit({
    emit: (e, next) => next(e)
  })
}

const filter = (test) => {
  return unit({
    emit: (e, next) => {
      if (test(e)) next(e)
    }
  })
}

const tagged = (tag) => {
  return unit({
    emit: (e, next) => {
      if (e.tags == null) return
      for (let t of e.tags) {
        if (t !== tag) continue
        next(e)
        return
      }
    }
  })
}

const taggedany = (tags) => {
  const tagmap = {}
  for (let t of e.tags) tagmap[t] = true
  return unit({
    emit: (e, next) => {
      if (e.tags == null) return
      for (let t of e.tags) {
        if (!tagmap[t]) continue
        next(e)
        return
      }
    }
  })
}

const taggedall = (tags) => {
  const tagmap = {}
  for (let t of e.tags) tagmap[t] = true
  return unit({
    emit: (e, next) => {
      if (e.tags == null) return
      count = 0
      for (let t of e.tags) if (tagmap[t]) count++
      if (tags.length === count) next(e)
    }
  })
}

const each = (fn) => {
  return unit({
    emit: (e, next) => {
      fn(e)
      next(e)
    }
  })
}

const copy = unit({
  emit: (e, next) => {
    next(extend(true, {}, e))
  }
})

const map = (fn) => {
  return unit({
    emit: (e, next) => next(fn(e))
  })
}

const run = (fn) => {
  return {
    emit: (e) => {
      fn(e)
    },
    copy: () => {
      return run(fn)
    }
  }
}

const reduce = (fn) => {
  return unit({
    emit: (events, next) => {
      let current = null
      for (let item of events) {
        if (item == null) continue
        if (current == null) current = extend({}, item, { time: now() })
        current = fn(current, item)
      }
      if (current != null) next(current)
    }
  })
}

const max = (selector) => {
  return reduce((current, e) => {
    if (selector(e) > selector(current)) return e
    return current
  })
}

const min = (selector) => {
  return reduce((current, e) => {
    if (selector(e) < selector(current)) return e
    return current
  })
}

const sum = (selector) => {
  return reduce((current, e) => {
    if (e.metric == null) e.metric = 0
    e.metric += selector(e)
    return e
  })
}

const count = reduce((current, e) => {
  if (e.metric == null) e.metric = 0
  e.metric++
  return e
})

const stats = (selector) => {
  return unit({
    emit: (events, next) => {
      events = events.filter((e) => e != null)
      if (events.length === 0) return
      let value = selector(events[0])
      let sum = 0
      let min = value
      let max = value
      for (let e of events) {
        value = selector(e)
        sum += value
        min = Math.min(min, value)
        max = Math.max(max, value)
      }
      next(extend({}, e, {
        time: now(),
        count: events.length,
        sum: sum,
        average: sum / events.length,
        min: min,
        max: max
      }))
    }
  })
}

const statstime = (ms, selector) => {
  let events = []
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  const add = (e) => {
    events.push(e)
    const value = selector(e)
    sum += value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  const remove = (values) => {
    let recalcmin = false
    let recalcmax = false
    for (let value of values) {
      sum -= value
      if (value === min) recalcmin = true
      if (value === max) recalcmax = true
    }
    if (recalcmin) {
      min = Number.MAX_VALUE
      for (let e of events) min = Math.min(min, selector(e))
    }
    if (recalcmin) {
      max = Number.MIN_VALUE
      for (let e of events) max = Math.max(max, selector(e))
    }
  }
  return unit({
    emit: (e, next) => {
      const current = events.slice()
      events = []
      const toremove = []
      for (let item of current) {
        if ((e.time - item.time) > ms) {
          toremove.push(item)
        } else {
          events.push(item)
        }
      }
      remove(toremove.map(selector))
      add(e)
      next(extend({}, e, {
        time: now(),
        count: events.length,
        sum: sum,
        average: sum / events.length,
        min: min,
        max: max
      }))
    },
    copy: () => statstime(ms, selector)
  })
}

const statscount = (count, selector) => {
  let events = []
  let sum = 0
  let min = Number.MAX_VALUE
  let max = Number.MIN_VALUE
  const add = (e) => {
    events.push(e)
    const value = selector(e)
    sum += value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  const remove = (values) => {
    let recalcmin = false
    let recalcmax = false
    for (let value of values) {
      sum -= value
      if (value === min) recalcmin = true
      if (value === max) recalcmax = true
    }
    if (recalcmin) {
      min = Number.MAX_VALUE
      for (let e of events) min = Math.min(min, selector(e))
    }
    if (recalcmin) {
      max = Number.MIN_VALUE
      for (let e of events) max = Math.max(max, selector(e))
    }
  }
  return unit({
    emit: (e, next) => {
      const toremove = events.splice(0, events.length - count)
      remove(toremove.map(selector))
      add(e)
      next(extend({}, e, {
        time: now(),
        count: events.length,
        sum: sum,
        average: sum / events.length,
        min: min,
        max: max
      }))
    },
    copy: () => statstime(ms, selector)
  })
}

const contexttime = (ms) => {
  let context = []
  return unit({
    emit: (e, next) => {
      const events = []
      context = context.filter((item) => {
        if ((e.time - item.time) > ms) return false
        events.push(item)
        return true
      })
      context.push(e)
      next(events)
    },
    copy: () => contexttime(ms)
  })
}

const contextcount = (count) => {
  const events = []
  return unit({
    emit: (e, next) => {
      events.push(e)
      next(events)
      if (events.length > count) events.shift()
    },
    copy: () => contextcount(count)
  })
}

const grouptime = (ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    if (events.length > 0) {
      for (let k of kids) k.emit(events)
      events = []
      handle = setTimeout(drain, ms)
    } else {
      handle = null
    }
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (handle == null) {
      events = [e]
      handle = setTimeout(drain, ms)
    } else {
      events.push(e)
    }
  }
  res.copy = () => {
    const twin = grouptime(ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const groupcount = (count) => {
  let events = []
  return unit({
    emit: (e, next) => {
      events.push(e)
      if (events.length === count) {
        next(events)
        events = []
      }
    },
    copy: () => groupcount(count)
  })
}

const batch = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    if (handle != null) clearTimeout(handle)
    if (events.length > 0) {
      for (let k of kids) k.emit(events)
      events = []
      handle = setTimeout(drain, ms)
    } else {
      handle = null
    }
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (handle == null) {
      events = [e]
      handle = setTimeout(drain, ms)
    } else {
      events.push(e)
    }
    if (events.length === count) drain()
  }
  res.copy = () => {
    twin = batch(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const sampletime = (ms) => {
  let last = null
  return unit({
    emit: (e, next) => {
      if (last == null) {
        last = e.time
        return
      }
      if (e.time - last > ms) {
        next(e)
        last = e.time
      }
    },
    copy: () => sampletime(ms)
  })
}

const samplecount = (count) => {
  let index = 0
  return unit({
    emit: (e, next) => {
      index++
      if (index === count) {
        next(e)
        index = 0
      }
    },
    copy: () => samplecount(count)
  })
}

const changed = (selector, initial) => {
  let previous = initial
  return unit({
    emit: (e, next) => {
      const current = selector(e)
      if (previous !== current) next(e)
      previous = current
    },
    copy: () => changed(selector, initial)
  })
}

const settle = (ms) => {
  const kids = []
  let handle = null
  let event = null
  const drain = () => {
    for (let k of kids) k.emit(event)
    event = null
    handle = null
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (handle != null) clearTimeout(handle)
    event = e
    handle = setTimeout(drain, ms)
  }
  res.copy = () => {
    const twin = settle(ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const stable = (ms, selector, initial) => {
  let previous = initial
  const kids = []
  let event = null
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (event != null && e.time - event.time > ms) event = null
    if (event === null) {
      event = e
      previous = selector(e)
      return
    }
    current = selector(e)
    if (previous === current) {
      for (let k of kids) k.emit(e)
    }
    previous = current
    event = e
  }
  res.copy = () => {
    const twin = stable(ms, selector)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// TODO: timeout?
const debounce = (ms) => {
  let last = null
  return unit({
    emit: (e, next) => {
      if (last == null) {
        last = e.time
        next(e)
      } else if (e.time - last > ms) {
        last = e.time
        next(e)
      }
    },
    copy: () => debounce(ms)
  })
}

const combine = (streams) => {
  const kids = []
  for (let s of streams) s({ emit: (e) => res.emit(e) })
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    for (let k of kids) k.emit(e)
  }
  res.copy = () => {
    const twin = combine(streams)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const split = (selector) => {
  const kids = []
  const streams = {}
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    const value = selector(e)
    if (streams[value] == null) {
      streams[value] = kids.map((k) => k.copy())
    }
    for (let k of streams[value]) k.emit(e)
  }
  res.copy = () => {
    const twin = split(selector)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const compose = (sequence) => {
  if (sequence.length === 0) {
    return stream
  }
  let res = sequence[sequence.length - 1]
  for (let i = sequence.length - 2; i >= 0; i--) res = sequence[i](res)
  return res
}

const pipe = (sequence) => {
  if (sequence.length === 0) {
    return stream
  }
  let res = sequence[0]
  for (let i = 1; i < sequence.length; i++) res = sequence[i](res)
  return res
}

const every = (kids) => {
  kids = kids.slice()
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    for (let k of kids) k.emit(e)
  }
  res.copy = () => {
    const twin = every([])
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const coalesce = (selector, ms) => {
  const kids = []
  let handle = null
  const lake = {}
  const drain = () => {
    const current = now()
    const events = []
    for (key in lake) {
      e = lake[key]
      if (e.ttl == null || e.time + e.ttl < current) {
        events.push(extend({}, e, { state: 'expired' }))
        delete lake[key]
        continue
      }
      events.push(e)
    }
    if (events.length > 0) {
      for (let k of kids) k.emit(events)
      handle = setTimeout(drain, ms)
    } else {
      handle = null
    }
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (e != null && e.state != null && e.state === 'expired') return
    lake[selector(e)] = e
    if (handle == null) handle = setTimeout(drain, ms)
  }
  res.get = (key) => lake[key]
  res.each = (fn) => {
    const results = []
    for (key in lake) {
      e = lake[key]
      results.push(fn(e))
    }
    return results
  }
  res.copy = () => {
    const twin = coalesce(selector, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const project = (predicates) => {
  const kids = []
  let events = predicates.map((predicate) => null)
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    for (let predicate of predicates) {
      if (predicate(e)) events[index] = e
    }
    for (let k of kids) k.emit(events)
    events = events.map((item) => {
      if (item == null || item.ttl == null) return null
      if (item.time + item.ttl < e.time) return null
      return item
    })
  }
  res.copy = () => {
    const twin = project(predicates)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const rollup = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    for (let k of kids) k.emit(events)
    events = []
    handle = null
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (handle != null) {
      events.push(e)
      return
    }
    events.push(e)
    events = events.filter((item) => (e.time - item.time) < ms)
    if (events.length <= count) {
      for (let k of kids) k.emit([e])
      return
    }
    handle = setTimeout(drain, ms + events[0].time - e.time)
  }
  res.copy = () => {
    const twin = rollup(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const apdex = (issatisfied, istolerated, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    if (events.length === 0) {
      handle = null
      return
    }
    const e = extend({}, events[events.length - 1])
    e.time = now()
    e.satisfied = 0
    e.tolerated = 0
    for (let item of events) {
      if (issatisfied(item))
        e.satisfied++
      else if (istolerated)
        e.tolerated++
    }
    e.apdex = (e.satisfied + e.tolerated / 2) / events.length
    for (let k of kids) k.emit(e)
    events = []
    handle = setTimeout(drain, ms)
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (e != null && e.state != null && e.state === 'expired') return
    events.push(e)
    if (handle == null) handle = setTimeout(drain, ms)
  }
  res.copy = () => {
    const twin = apdex(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const flatten = unit({
  emit: (events, next) => {
    if (!Array.isArray(events)) {
      next(events)
      return
    }
    for (let e of events) next(e)
  }
})

const throttle = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    events = []
    handle = null
  }
  const res = (k) => {
    kids.push(k)
    return res
  }
  res.emit = (e) => {
    if (handle != null) {
      events.push(e)
      return
    }
    events.push(e)
    events = events.filter((item) => (e.time - item.time) < ms)
    if (events.length <= count) {
      for (let k of kids) k.emit(e)
      return
    }
    handle = setTimeout(drain, ms + events[0].time - e.time)
  }
  res.copy = () => {
    const twin = throttle(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

const log = unit({
  emit: (e, next) => {
    console.log(e)
    next(e)
  }
})

const error = unit({
  emit: (e, next) => {
    console.error(e)
    next(e)
  }
})

result = compose
result.extend = extend
result.unit = unit
result.log = log
result.error = error
result.now = now
result.milliseconds = result.ms = (n) => n
result.seconds = result.s = (n) => 1000 * result.ms(n)
result.minutes = result.m = (n) => 60 * result.m(n)
result.hours = result.h = (n) => 60 * result.m(n)
result.days = result.d = (n) => 24 * result.h(n)
result.stream = stream
result.filter = filter
result.tagged = tagged
result.taggedany = taggedany
result.taggedall = taggedall
result.each = each
result.copy = copy
result.map = map
result.run = run
result.reduce = reduce
result.max = max
result.min = min
result.sum = sum
result.count = count
result.stats = stats
result.statstime = statstime
result.statscount = statscount
result.contexttime = contexttime
result.contextcount = contextcount
result.grouptime = grouptime
result.groupcount = groupcount
result.batch = batch
result.coalesce = coalesce
result.project = project
result.rollup = rollup
result.apdex = apdex
result.flatten = flatten
result.sampletime = sampletime
result.samplecount = samplecount
result.changed = changed
result.settle = settle
result.stable = stable
result.debounce = debounce
result.throttle = throttle
result.combine = combine
result.split = split
result.compose = compose
result.pipe = pipe
result.every = every

module.exports = result
