// Flow aims to provide a comprehensive set of widely applicable,
// combinable tools for building complex streams.
// Streams are functions which accept events or in some cases, lists of events.
// Streams typically do one or more of the following.
// - Filter events.
// - Transform events.
// - Combine events over time.
// - Apply events to other streams.
// - Forward events to other services.

// Each stream function generally returns a function that can be called
// to register a child stream. Two methods are available:
// - emit(event or events)
// - copy() used to duplicate stream trees

// apply a sequence of functions
const flow = (...args) => {
  if (args.length === 0) return stream()
  if (args.length === 1 && Array.isArray(args[0])) args = args[0]
  let res = args[args.length - 1]
  let iterate = args[args.length - 1]
  for (let i = args.length - 2; i >= 0; i--) iterate = args[i](iterate)
  return res
}
flow.compose = flow

// helpers to calculate ttl
flow.now = () => new Date().valueOf()
flow.milliseconds = flow.ms = n => n
flow.seconds = flow.s = n => 1000 * flow.ms(n)
flow.minutes = flow.m = n => 60 * flow.s(n)
flow.hours = flow.h = n => 60 * flow.m(n)
flow.days = flow.d = n => 24 * flow.h(n)
flow.weeks = flow.w = n => 7 * flow.d(n)

// helper for building new functions
flow.unit = params => {
  let kids = []
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => params.emit(e, e => {
    for (let k of kids) k.emit(e)
  })
  if (params.copy == null) {
    res.copy = () => {
      let twin = flow.unit(params)
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

// create a new stream source
flow.stream = () => flow.unit({ emit: (e, next) => next(e) })

// test events and only let certain ones through
flow.filter = test => flow.unit({ emit: (e, next) => { if (test(e)) next(e) }})

// test events and only let ones through that match provided tag
flow.tagged = tag => flow.unit({ emit: (e, next) => {
  if (e.tags == null) return
  for (let t of e.tags) {
    if (t !== tag) continue
    return next(e)
  }
}})

// test events and only let ones through that match any of the provided tags
flow.taggedany = tags => {
  const tagmap = {}
  for (let t of e.tags) tagmap[t] = true
  return flow.unit({
    emit: (e, next) => {
      if (e.tags == null) return
      for (let t of e.tags) {
        if (!tagmap[t]) continue
        return next(e)
      }
    }
  })
}

// test events and only let ones through that match all of the provided tags
flow.taggedall = tags => {
  const tagmap = {}
  for (let t of e.tags) tagmap[t] = true
  return flow.unit({
    emit: (e, next) => {
      if (e.tags == null) return
      count = 0
      for (let t of e.tags) if (tagmap[t]) count++
      if (tags.length === count) next(e)
    }
  })
}

// run a function for each event
flow.each = fn => flow.unit({ emit: (e, next) => {
  fn(e)
  next(e)
}})

// make a copy of each passed event
flow.copy = flow.unit({ emit: (e, next) => next(Object.assign({}, e))})

// run a function to change each passed event
flow.map = fn => flow.unit({ emit: (e, next) => next(fn(e)) })

// run a function on a set of events reducing to a single event
flow.reduce = fn => flow.unit({ emit: (events, next) => {
  let current = null
  for (let item of events) {
    if (item == null) continue
    if (current == null) current = Object.assign({}, item)
    current = fn(current, item)
  }
  if (current != null) next(current)
}})

// from a set of events find the max based on a selector
flow.max = selector => flow.reduce((current, e) =>
  selector(e) > selector(current) ? e : current)

// from a set of events find the min based on a selector
flow.min = selector => flow.reduce((current, e) =>
  selector(e) < selector(current) ? e : current)

// from a set of events sum based on a selector, saved as metric
flow.sum = selector => flow.reduce((current, e) => {
  if (e.metric == null) e.metric = 0
  e.metric += selector(e)
  return e
})

// from a set of events count the number of events
flow.count = flow.reduce((current, e) => {
  if (e.metric == null) e.metric = 0
  e.metric++
  return e
})

// reduce a set of events to a single event with statistics based on selector
flow.stats = selector => flow.unit({ emit: (events, next) => {
  events = events.filter(e => e != null)
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
  next(Object.assign({}, events[events.length - 1], {
    time: flow.now(),
    count: events.length,
    sum: sum,
    average: sum / events.length,
    min: min,
    max: max
  }))
}})

// emit a rolling set of events based on a time window of events
flow.contexttime = ms => {
  let context = []
  return flow.unit({
    emit: (e, next) => {
      if (!e.time) e.time = flow.now()
      const events = []
      context = context.filter((item) => {
        if ((e.time - item.time) > ms) return false
        events.push(item)
        return true
      })
      context.push(e)
      next(events)
    },
    copy: () => flow.contexttime(ms)
  })
}

// emit a rolling set of events based on a window of n events
flow.contextcount = count => {
  const events = []
  return flow.unit({
    emit: (e, next) => {
      events.push(e)
      next(events)
      if (events.length >= count) events.shift()
    },
    copy: () => flow.contextcount(count)
  })
}

// group events by time
flow.grouptime = ms => {
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
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (handle == null) {
      events = [e]
      handle = setTimeout(drain, ms)
    } else events.push(e)
  }
  res.copy = () => {
    const twin = flow.grouptime(ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// group events by count
flow.groupcount = count => {
  let events = []
  return flow.unit({
    emit: (e, next) => {
      events.push(e)
      if (events.length === count) {
        next(events)
        events = []
      }
    },
    copy: () => flow.groupcount(count)
  })
}

// group by count or time, whichever is smallest
flow.batch = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    if (handle != null) clearTimeout(handle)
    if (events.length > 0) {
      for (let k of kids) k.emit(events)
      events = []
      handle = setTimeout(drain, ms)
    } else handle = null
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (handle == null) {
      events = [e]
      handle = setTimeout(drain, ms)
    } else events.push(e)
    if (events.length === count) drain()
  }
  res.copy = () => {
    twin = flow.batch(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// sample at most one event over a time period
flow.sampletime = ms => {
  let last = null
  return flow.unit({
    emit: (e, next) => {
      if (!e.time) e.time = flow.now()
      if (last == null) return last = e.time
      if (e.time - last > ms) {
        next(e)
        last = e.time
      }
    },
    copy: () => flow.sampletime(ms)
  })
}

// sample an event every n events
flow.samplecount = count => {
  let index = 0
  return flow.unit({
    emit: (e, next) => {
      index++
      if (index === count) {
        next(e)
        index = 0
      }
    },
    copy: () => flow.samplecount(count)
  })
}

// only emit events if a selector changes value
flow.changed = (selector, initial) => {
  let previous = initial
  return flow.unit({
    emit: (e, next) => {
      const current = selector(e)
      if (previous !== current) next(e)
      previous = current
    },
    copy: () => flow.changed(selector, initial)
  })
}

// wait until no events for a time to emit the last event
flow.settle = ms => {
  const kids = []
  let handle = null
  let event = null
  const drain = () => {
    for (let k of kids) k.emit(event)
    event = null
    handle = null
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (handle != null) clearTimeout(handle)
    event = e
    handle = setTimeout(drain, ms)
  }
  res.copy = () => {
    const twin = flow.settle(ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// wait until no changes to a selector for a given time before emit event
flow.stable = (ms, selector, initial) => {
  let previous = initial
  const kids = []
  let event = null
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (!e.time) e.time = flow.now()
    if (event != null && e.time - event.time > ms) event = null
    if (event === null) {
      event = e
      previous = selector(e)
      return
    }
    current = selector(e)
    if (previous === current) for (let k of kids) k.emit(e)
    previous = current
    event = e
  }
  res.copy = () => {
    const twin = flow.stable(ms, selector)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// wait ms between events, ignoring others
flow.debounce = ms => {
  let kids = []
  let handle = null
  let lastevent = null
  let lasttime = null
  const next = e => { for (let k of kids) k.emit(e) }
  const drain = () => {
    handle = null
    lasttime = flow.now()
    next(lastevent)
    lastevent = null
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    const now = flow.now()
    if (handle) {
      clearTimeout(handle)
      handle = null
    }
    if (lasttime == null || (now - lasttime > ms)) {
      lasttime = now
      next(e)
    } else {
      lastevent = e
      handle = setTimeout(drain, ms - (now - lasttime))
    }
  }
  res.copy = () => flow.debounce(ms)
  return res
}

// pull multiple streams into one
flow.combine = streams => {
  const kids = []
  for (let s of streams) s({ emit: e => res.emit(e) })
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => { for (let k of kids) k.emit(e) }
  res.copy = () => {
    const twin = flow.combine(streams)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// split a stream into multiple streams based on a selector
flow.split = selector => {
  const kids = []
  const streams = {}
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    const value = selector(e)
    if (streams[value] == null) streams[value] = kids.map(k => k.copy())
    for (let k of streams[value]) k.emit(e)
  }
  res.copy = () => {
    const twin = flow.split(selector)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// reverse order of combine
flow.pipe = sequence => {
  if (sequence.length === 0) return stream
  let res = sequence[0]
  for (let i = 1; i < sequence.length; i++) res = sequence[i](res)
  return res
}

// call each function with events
flow.every = kids => {
  kids = kids.slice()
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => { for (let k of kids) k.emit(e) }
  res.copy = () => {
    const twin = flow.every([])
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// collect all events unique for selector
// emit expired events if time and ttl expires
// query the lake
flow.coalesce = (selector, ms) => {
  if (!ms) ms = 1000
  const kids = []
  let handle = null
  const lake = {}
  const drain = () => {
    const current = flow.now()
    const events = []
    for (key in lake) {
      e = lake[key]
      if (e.time + e.ttl < current) {
        events.push(Object.assign({}, e, { state: 'expired' }))
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
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (e != null && e.state != null && e.state === 'expired') return
    if (!e.time) e.time = flow.now()
    if (!e.ttl) e.ttl = flow.minutes(1)
    lake[selector(e)] = e
    if (handle == null) handle = setTimeout(drain, ms)
  }
  res.all = () => lake
  res.copy = () => {
    const twin = flow.coalesce(selector, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// match events against each predicate and emit an array respecting ttl
flow.project = predicates => {
  const kids = []
  let events = predicates.map((predicate) => null)
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (!e.time) e.time = flow.now()
    for (let predicate of predicates) if (predicate(e)) events[index] = e
    for (let k of kids) k.emit(events)
    events = events.map((item) => {
      if (item == null || item.ttl == null) return null
      if (item.time + item.ttl < e.time) return null
      return item
    })
  }
  res.copy = () => {
    const twin = flow.project(predicates)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// emit the first n events in a time, waiting for expiry to output the rest
flow.rollup = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    for (let k of kids) k.emit(events)
    events = []
    handle = null
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (!e.time) e.time = flow.now()
    if (handle != null) returnevents.push(e)
    events.push(e)
    events = events.filter((i) => (e.time - i.time) < ms)
    if (events.length <= count) {
      for (let k of kids) k.emit([e])
      return
    }
    handle = setTimeout(drain, ms + events[0].time - e.time)
  }
  res.copy = () => {
    const twin = flow.rollup(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// output apdex max every ms use issatisfied and istolerated selectors
flow.apdex = (issatisfied, istolerated, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    if (events.length === 0) return handle = null
    const e = {}
    e.time = flow.now()
    e.satisfied = 0
    e.tolerated = 0
    for (let item of events) {
      if (issatisfied(item)) e.satisfied++
      else if (istolerated(item)) e.tolerated++
    }
    e.apdex = (e.satisfied + e.tolerated / 2) / events.length
    for (let k of kids) k.emit(e)
    events = []
    handle = setTimeout(drain, ms)
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (e != null && e.state != null && e.state === 'expired') return
    events.push(e)
    if (handle == null) handle = setTimeout(drain, ms)
  }
  res.copy = () => {
    const twin = flow.apdex(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// turn a set of events into individual events
flow.flatten = () => flow.unit({
  emit: (events, next) => {
    if (!Array.isArray(events)) return next(events)
    for (let e of events) next(e)
  }
})

// pass on at most n events every ms
flow.throttle = (count, ms) => {
  const kids = []
  let handle = null
  let events = []
  const drain = () => {
    events = []
    handle = null
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (!e.time) e.time = flow.now()
    if (handle != null) return events.push(e)
    events.push(e)
    events = events.filter((item) => (e.time - item.time) < ms)
    if (events.length <= count) {
      for (let k of kids) k.emit(e)
      return
    }
    handle = setTimeout(drain, ms + events[0].time - e.time)
  }
  res.copy = () => {
    const twin = flow.throttle(count, ms)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// calculate the change in a selector over time, saved as metric
flow.ddt = selector => {
  let last = null
  return flow.unit({
    emit: (e, next) => {
      if (!e.time) e.time = flow.now()
      if (!last) last = e
      const valuediff = selector(e) - selector(last)
      const timediff = e.time - last.time
      next(Object.assign({}, e, { metric: valuediff != 0 && timediff != 0
        ? valuediff / timediff : 0}))
      last = e
    },
    copy: () => flow.ddt(selector)
  })
}

// calculate exponential weighted moving average, saved as metric
// does not take into account the time between events
// r is the ratio of current event value to average of previous events
// 1 = only use the latest value, 1/2 = 1/2n + 1/4(n - 1), 1/8(n - 2) ...
flow.ewmatimeless = (selector, r) => {
  let current = null
  return flow.unit({
    emit: (e, next) => {
      const value = selector(e)
      if (!current) current = value
      current = value * r + current * (1 - r)
      next(Object.assign({}, e, { metric: current }))
    },
    copy: () => flow.ewmatimeless(selector, r)
  })
}

// calculate exponential weighted moving average, saved as metric
// takes into account the time between events
// h is half-life (in ms)
// 1 = only use the latest value, 1/2 = 1/2n + 1/4(n - 1), 1/8(n - 2) ...
flow.ewma = (selector, h) => {
  let current = null
  let lasttime = null
  return flow.unit({
    emit: (e, next) => {
      if (!e.time) e.time = flow.now()
      const value = selector(e)
      if (!lasttime) {
        current = value
        lasttime = e.time
      }
      const timediff = e.time - lasttime
      const r = Math.exp(-1.0 * (timediff / h))
      current = (1.0 - r) * value + r * current
      lasttime = e.time
      next(Object.assign({}, e, { metric: current }))
    },
    copy: () => flow.ewma(selector, h)
  })
}

// calculate the per ms value of a selector over time, saved as metric
// executes on a set of events over ms timeframe
flow.rate = (selector, ms) => flow.unit({
  emit: (events, next) => {
    if (events.length == 0) return
    const metric = events.reduce((sum, e) => sum + selector(e))
    const e = events[events.length - 1]
    next(Object.assign({}, e, { metric: current / ms }))
  },
  copy: () => flow.rate(selector, ms)
})

// given a set of points, output selected events that match for each
// e.g. 1 = top, 0 = bottom, 0.5 = median...
// executes on a set of events, outputs a set of events
// appends the points to the name of each event
flow.percentiles = (selector, points) => flow.unit({
  emit: (events, next) => {
    if (events.length == 0) return
    const values = events.map(e => { return {
      value: selector(e),
      event: e
    }})
    values.sort((a, b) => a.value - b.value)
    next(points.map((p) => {
      let index = Math.round(p * value.length - 0.5)
      index = Math.min(Math.max(index, 0), value.length - 1)
      let e = values[index]
      if (e.name) e = Object.assign({}, e, { name: `${e.name} ${p}` })
      return e
    }))
  },
  copy: () => flow.percentiles(selector, points)
})

// repeat last event every ms if no events are coming through
// continue until ttl on the last event expires
// use the generate function if supplied or duplicate the event and update time
flow.fillin = (ms, generate) => {
  const kids = []
  let handle = null
  let last = null
  const drain = () => {
    handle = null
    const now = flow.now()
    if (last.time + last.ttl < now) return last = null
    const e = generate
      ? generate(last)
      : Object.assign({}, last, { time: now })
    for (let k of kids) k.emit(e)
    handle = setTimeout(drain, ms)
  }
  const res = k => {
    kids.push(k)
    return res
  }
  res.emit = e => {
    if (!e.time) e.time = flow.now()
    if (!e.ttl) e.ttl = flow.minutes(1)
    if (handle != null) {
      clearTimeout(handle)
      handle = null
    }
    last = e
    for (let k of kids) k.emit(e)
    handle = setTimeout(drain, ms)
  }
  res.copy = () => {
    const twin = flow.fillin(ms, generate)
    for (let k of kids) twin(k.copy())
    return twin
  }
  return res
}

// log events as they pass through
flow.log = flow.unit({
  emit: (e, next) => {
    console.log(e)
    next(e)
  }
})

// error events as they pass through
flow.error = flow.unit({
  emit: (e, next) => {
    console.error(e)
    next(e)
  }
})

// trace events as they pass through
flow.trace = flow.unit({
  emit: (e, next) => {
    console.trace(e)
    next(e)
  }
})

module.exports = flow
