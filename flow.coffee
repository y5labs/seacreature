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
      next extend {}, e, _events: events
    copy: -> contexttime(ms)
# emit events with up to count last events
contextcount = (count) ->
  events = []
  unit
    emit: (e, next) ->
      events.push e
      next extend {}, e, _events: events
      events.shift() if events.length > count
    copy: -> contextcount count
# (debounce) emit events every ms from first event
grouptime = (ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    if events.length > 0
      e = extend {}, events[events.length - 1], _events: events
      k.emit e for k in kids
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
        next extend {}, events[events.length - 1], _events: events
        events = []
    copy: -> groupcount count
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
# emit only when selected value changes from event to event
changed = (selector, initial) ->
  previous = initial
  unit
    emit: (e, next) ->
      current = selector e
      if previous isnt current
        next extend {}, e, _previous: previous, _current: current
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
# emit first count events within ms, if more emit all after ms since first event
rollup = (count, ms) ->
  kids = []
  handle = null
  events = []
  drain = ->
    e = extend {}, events[events.length - 1], _events: events
    k.emit e for k in kids
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
    twin = rollup count, ms
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
result.extend = extend
result.now = now
result.seconds = (n) -> n * 1000
result.minutes = (n) -> n * 60000
result.hours = (n) -> n * 360000
result.days = (n) -> n * 8640000
result.unit = unit
result.stream = stream
result.filter = filter
result.tagged = tagged
result.taggedany = taggedany
result.taggedall = taggedall
result.each = each
result.copy = copy
result.map = map
result.run = run
result.contexttime = contexttime
result.contextcount = contextcount
result.grouptime = grouptime
result.groupcount = groupcount
result.sampletime = sampletime
result.samplecount = samplecount
result.changed = changed
result.settle = settle
result.debounce = debounce
result.combine = combine
result.split = split
result.rollup = rollup
result.throttle = throttle
result.log = log
result.error = error

module.exports = result
