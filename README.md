# Sea Creature

- [ ] Something is wrong with set_single filtering?

## Todo

- [ ] Update documentation to include analytics
- [ ] Update documentation to include persistence
- [ ] Update documentation to include core
- [ ] A real website for this project?
- [ ] Tests for persistence

## Questions

- [ ] Is kinesalite a good stream technology to use with seacreature?

Node.js transient event processing inspired by [Riemann](http://riemann.io).

The API is similar to the [Riemann streams API](http://riemann.io/api/riemann.streams.html) and [Riemann streams source](https://github.com/riemann/riemann/blob/master/src/riemann/streams.clj).

Link to WAMP?

```javascript
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
const flow = require('seacreature/flow')

// apply a sequence of functions
flow(args)
flow.compose(args)

// current ms
flow.now()

// helper functions to calculate ttl
flow.milliseconds(n)
flow.ms(n)
flow.seconds(n)
flow.s(n)
flow.minutes(n)
flow.m(n)
flow.hours(n)
flow.h(n)
flow.days(n)
flow.d(n)

// helper for building new functions
flow.unit(params)

// create a new stream source
flow.stream()

// test events and only let certain ones through
flow.filter(test)

// test events and only let ones through that match provided tag
flow.tagged(tag)

// test events and only let ones through that match any of the provided tags
flow.taggedany(tags)

// test events and only let ones through that match all of the provided tags
flow.taggedall(tags)

// run a function for each event
flow.each(fn)

// make a copy of each passed event
flow.copy()

// run a function to change each passed event
flow.map(fn)

// run a function on a set of events reducing to a single event
flow.reduce(fn)

// from a set of events find the max based on a selector
flow.max(selector)

// from a set of events find the min based on a selector
flow.min(selector)

// from a set of events sum based on a selector, saved as metric
flow.sum(selector)

// from a set of events count the number of events
flow.count()

// reduce a set of events to a single event with statistics based on selector
flow.stats(selector)

// emit a rolling set of events based on a time window of events
flow.contexttime(ms)

// emit a rolling set of events based on a window of n events
flow.contextcount(count)

// group events by time
flow.grouptime(ms)

// group events by count
flow.groupcount(count)

// group by count or time, whichever is smallest
flow.batch(count, ms)

// sample at most one event over a time period
flow.sampletime(ms)

// sample an event every n events
flow.samplecount(count)

// only emit events if a selector changes value
flow.changed(selector, [initial])

// wait until no events for a time to emit the last event
flow.settle(ms)

// wait until no changes to a selector for a given time before emit event
flow.stable(ms, selector, initial)

// wait ms between events, ignoring others
flow.debounce(ms)

// pull multiple streams into one
flow.combine(streams)

// split a stream into multiple streams based on a selector
flow.split(selector)

// reverse order of combine
flow.pipe(sequence)

// call each function with events
flow.every(kids)

// collect all events unique for selector
// emit expired events if time and ttl expires
// query the lake
flow.coalesce(selector, ms)

// match events against each predicate and emit an array respecting ttl
flow.project(predicates)

// emit the first n events in a time, waiting for expiry to output the rest
flow.rollup(count, ms)

// output apdex max every ms use issatisfied and istolerated selectors
flow.apdex(issatisfied, istolerated, ms)

// turn a set of events into individual events
flow.flatten()

// pass on at most n events every ms
flow.throttle(count, ms)

// calculate the change in a selector over time, saved as metric
flow.ddt(selector)

// calculate exponential weighted moving average, saved as metric
// does not take into account the time between events
// r is the ratio of current event value to average of previous events
// 1 = only use the latest value, 1/2 = 1/2n + 1/4(n - 1), 1/8(n - 2) ...
flow.ewmatimeless(selector, r)

// calculate exponential weighted moving average, saved as metric
// takes into account the time between events
// h is half-life (in ms)
// 1 = only use the latest value, 1/2 = 1/2n + 1/4(n - 1), 1/8(n - 2) ...
flow.ewma(selector, h)

// calculate the per ms value of a selector over time, saved as metric
// executes on a set of events over ms timeframe
flow.rate(selector, ms)

// given a set of points, output selected events that match for each
// e.g. 1 = top, 0 = bottom, 0.5 = median...
// executes on a set of events, outputs a set of events
// appends the points to the name of each event
flow.percentiles(selector, points)

// repeat last event every ms if no events are coming through
// continue until ttl on the last event expires
// use the generate function if supplied or duplicate the event and update time
flow.fillin(ms, generate)

// log events as they pass through
flow.log()

// error events as they pass through
flow.error()
```

```
const ƒ = require('./flow')
// const flow = require('seacreature/flow')
// const tls = require('seacreature/tls')
// const tcp = require('seacreature/tcp')

// create a source of events
const stream = ƒ.stream()
// const stream = tls.server({ port: 8125, cert: 'xxx', key: 'yyy' })
// const stream = tcp.server({ port: 8125, cert: 'xxx', key: 'yyy' })

// event lake
const index = ƒ.coalesce((e) => e.name)
// setInterval(() => console.log(index.all()), 1000)

ƒ([
  stream,
  ƒ.debounce(ƒ.s(5)),
  ƒ.each(console.log)
])

setInterval(() => {
  stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e1', value: 1 })
}, 4000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e2', value: 2 })
  }, 4000),
1000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e1', value: 3 })
  }, 4000),
2000)

setTimeout(() =>
  setInterval(() => {
    stream.emit({ time: ƒ.now(), ttl: ƒ.m(1), name: 'e2', value: 4 })
  }, 4000),
3000)

```