extend = require 'extend'
now = -> new Date().valueOf()

unit = (params) ->
  kids = []
  res = (k) ->
    kids.push k
    res
  res.emit = (e) -> params.emit e, (e) ->
    k.emit e for k in kids
    null
  if !params.copy? #stateless
    res.copy = ->
      twin = unit params
      twin k.copy() for k in kids
      twin
  else
    res.copy = ->
      twin = params.copy()
      twin k.copy() for k in kids
      twin
  res

# identity
stream = -> unit emit: (e, next) ->
  next e
# where
filter = (test) -> unit emit: (e, next) ->
  next e if test e
tagged = (tag) -> unit emit: (e, next) ->
  return if !e.tags?
  for t in e.tags when t is tag
    next e
    return
taggedany = (tags) ->
  tagmap = {}
  tagmap[t] = yes for t in tags
  unit emit: (e, next) ->
    return if !e.tags?
    for t in e.tags when tagmap[t]
      next e
      return
taggedall = (tags) ->
  tagmap = {}
  tagmap[t] = yes for t in tags
  unit emit: (e, next) ->
    return if !e.tags?
    count = 0
    count++ for t in e.tags when tagmap[t]
    next e if tags.length is count
    null
each = (fn) -> unit emit: (e, next) ->
  fn e
  next e
copy = unit emit: (e, next) ->
  next extend yes, {}, e
map = (fn) -> unit emit: (e, next) ->
  next fn e
run = (fn) ->
  emit: (e) -> fn e
  copy: -> run fn

reduce = (fn) -> unit emit: (events, next) ->
  current = null
  for item in events
    continue if !item?
    current = extend {}, item if !current?
    current = fn current, item
  next current if current?
max = (selector) -> reduce (current, e) ->
  return e if selector(e) > selector(current)
  current
min = (selector) -> reduce (current, e) ->
  return e if selector(e) < selector(current)
  current
sum = (selector) -> reduce (current, e) ->
  e.metric ?= 0
  e.metric += selector(e)
  e
count = reduce (current, e) ->
  e.metric ?= 0
  e.metric++
  e

# emit events with events for last ms
contexttime = (ms) ->
  context = []
  unit
    emit: (e, next) ->
      events = []
      context = context.filter (item) ->
        return no if (e.time - item.time) > ms
        events.push item
        yes
      context.push e
      next events
    copy: -> contexttime(ms)
# emit events with up to count last events
contextcount = (count) ->
  events = []
  unit
    emit: (e, next) ->
      events.push e
      next events
      events.shift() if events.length > count
    copy: -> contextcount count
# (debounce) emit events every ms from first event
grouptime = (ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    if events.length > 0
      k.emit events for k in kids
      events = []
      handle = setTimeout drain, ms
    else
      handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    if !handle?
      events = [e]
      handle = setTimeout drain, ms
    else
      events.push e
    null
  res.copy = ->
    twin = grouptime ms
    twin k.copy() for k in kids
    twin
  res
# emit every count events
groupcount = (count) ->
  events = []
  unit
    emit: (e, next) ->
      events.push e
      if events.length is count
        next events
        events = []
    copy: -> groupcount count
# wait for ms or count whichever is earliest
batch = (count, ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    clearTimeout handle if handle?
    if events.length > 0
      k.emit events for k in kids
      events = []
      handle = setTimeout drain, ms
    else
      handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    if !handle?
      events = [e]
      handle = setTimeout drain, ms
    else
      events.push e
    drain() if events.length is count
    null
  res.copy = ->
    twin = batch count, ms
    twin k.copy() for k in kids
    twin
  res
# emit events at least ms apart
sampletime = (ms) ->
  last = null
  unit
    emit: (e, next) ->
      if !last?
        last = e.time
        return
      if e.time - last > ms
        next e
        last = e.time
    copy: -> sampletime ms
# only emit every count events
samplecount = (count) ->
  index = 0
  unit
    emit: (e, next) ->
      index++
      if index is count
        next e
        index = 0
    copy: -> samplecount count
# rate of change
# ddt = (selector, ms) ->
#   kids = []
#   handle = null
#   events = []
#   drain = ->
#     if events.length > 0
#       k.emit events for k in kids
#       events = []
#       handle = setTimeout drain, ms
#     else
#       handle = null
#   res = (k) ->
#     kids.push k
#     res
#   res.emit = (e) ->
#     if !handle?
#       events = [e]
#       handle = setTimeout drain, ms
#     else
#       events.push e
#     null
#   res.copy = ->
#     twin = ddt selector, ms
#     twin k.copy() for k in kids
#     twin
#   res
# emit only when selected value changes from event to event
changed = (selector, initial) ->
  previous = initial
  unit
    emit: (e, next) ->
      current = selector e
      next e if previous isnt current
      previous = current
    copy: -> changed selector, initial
# wait until no events for ms before emitting last event seen
settle = (ms) ->
  kids = []
  handle = null
  event = null
  drain = ->
    k.emit event for k in kids
    event = null
    handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    clearTimeout handle if handle?
    event = e
    handle = setTimeout drain, ms
    null
  res.copy = ->
    twin = settle ms
    twin k.copy() for k in kids
    twin
  res
# wait until no changes to selected value for ms before emitting events
stable = (ms, selector, initial) ->
  previous = initial
  kids = []
  event = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    if event? and e.time - event.time > ms
      event = null
    if event is null
      event = e
      previous = selector e
      return
    current = selector e
    if previous is current
      k.emit e for k in kids
      return
    previous = current
    event = e
    return
  res.copy = ->
    twin = stable ms, selector
    twin k.copy() for k in kids
    twin
  res
# wait for ms after last event before allowing more events
debounce = (ms) ->
  last = null
  unit
    emit: (e, next) ->
      if !last?
        last = e.time
        next e
      else if e.time - last > ms
        last = e.time
        next e
    copy: -> debounce ms

# join streams
combine = (streams) ->
  kids = []
  for s in streams
    s emit: (e) -> res.emit e
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    k.emit e for k in kids
    null
  res.copy = ->
    twin = combine streams
    twin k.copy() for k in kids
    twin
  res
# create separate instances of streams for each value of selector
split = (selector) ->
  kids = []
  streams = {}
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    value = selector e
    if !streams[value]?
      streams[value] = kids.map (k) -> k.copy()
    k.emit e for k in streams[value]
    null
  res.copy = ->
    twin = split selector
    twin k.copy() for k in kids
    twin
  res
# remember last event by selector, honor ttl, emit every ms
coalesce = (selector, ms) ->
  kids = []
  handle = null
  lake = {}
  drain = ->
    current = now()
    events = []
    for key, e of lake
      # has it expired?
      if !e.ttl? or e.time + e.ttl < current
        events.push extend {}, e, state: 'expired'
        delete lake[key]
        continue
      events.push e
    if events.length > 0
      k.emit events for k in kids
      handle = setTimeout drain, ms
    else
      handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    lake[selector e] = e
    handle = setTimeout drain, ms if !handle?
    null
  res.copy = ->
    twin = coalesce selector, ms
    twin k.copy() for k in kids
    twin
  res
# remember last event by vector of selectors, honor ttl, emit as events come in
project = (predicates) ->
  kids = []
  events = predicates.map (predicate) -> null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    for predicate, index in predicates
      events[index] = e if predicate e
    k.emit events for k in kids
    events = events.map (item) ->
      return null if !item? or !item.ttl? or item.time + item.ttl < e.time
      item
    null
  res.copy = ->
    twin = project predicates
    twin k.copy() for k in kids
    twin
  res
# emit first count events within ms, if more emit all after ms since first event
rollup = (count, ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    k.emit events for k in kids
    events = []
    handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    if handle?
      events.push e
      return
    events.push e
    events = events.filter (item) ->
      (e.time - item.time) < ms
    if events.length <= count
      k.emit [e] for k in kids
      return
    handle = setTimeout drain, ms + events[0].time - e.time
    null
  res.copy = ->
    twin = rollup count, ms
    twin k.copy() for k in kids
    twin
  res
# https://en.wikipedia.org/wiki/Apdex
apdex = (issatisfied, istolerated, ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    if events.length is 0
      handle = null
      return
    e = extend {}, events[events.length - 1]
    e.time = now()
    e.satisfied = 0
    e.tolerated = 0
    for item in events
      if issatisfied item
        e.satisfied++
      else if istolerated
        e.tolerated++
    e.apdex = (e.satisfied + e.tolerated / 2) / events.length
    k.emit e for k in kids
    events = []
    handle = setTimeout drain, ms
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    return if e?.state is 'expired'
    events.push e
    handle = setTimeout drain, ms if !handle?
    null
  res.copy = ->
    twin = apdex count, ms
    twin k.copy() for k in kids
    twin
  res
# emit first count events within ms, if more ignore all after ms since first event
throttle = (count, ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    events = []
    handle = null
  res = (k) ->
    kids.push k
    res
  res.emit = (e) ->
    if handle?
      events.push e
      return
    events.push e
    events = events.filter (item) ->
      (e.time - item.time) < ms
    if events.length <= count
      k.emit e for k in kids
      return
    handle = setTimeout drain, ms + events[0].time - e.time
    null
  res.copy = ->
    twin = throttle count, ms
    twin k.copy() for k in kids
    twin
  res

log =
  emit: (e) -> console.log e
  copy: -> log

error =
  emit: (e) -> console.error e
  copy: -> error

result = stream

# util
result.extend = extend
result.unit = unit
result.log = log
result.error = error

# time
result.now = now
result.seconds = (n) -> n * 1000
result.minutes = (n) -> n * 60000
result.hours = (n) -> n * 360000
result.days = (n) -> n * 8640000

# item
result.stream = stream
result.filter = filter
result.tagged = tagged
result.taggedany = taggedany
result.taggedall = taggedall
result.each = each
result.copy = copy
result.map = map
result.run = run

# fold
result.reduce = reduce
result.max = max
result.min = min
result.sum = sum
result.count = count

# group
result.contexttime = contexttime
result.contextcount = contextcount
result.grouptime = grouptime
result.groupcount = groupcount
result.batch = batch
result.coalesce = coalesce
result.project = project
result.rollup = rollup
result.apdex = apdex

# flow
result.sampletime = sampletime
result.samplecount = samplecount
#result.ddt = ddt
#result.ddttime = ddttime
result.changed = changed
result.settle = settle
result.stable = stable
result.debounce = debounce
result.throttle = throttle

# control
result.combine = combine
result.split = split


module.exports = result
