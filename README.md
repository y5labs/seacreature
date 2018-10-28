# Sea Creature

Node.js transient event processing inspired by [Riemann](http://riemann.io).

# API

## flow.compose([source, modifier1, ...])


# TODO:
# Destinations: email, txt, alert, pagerduty, storage
# Dashboard

# http://riemann.io/api/riemann.streams.html

# ddt
# ddttime
# fillin
# ewma
# ewmatimeless
# percentiles
# stats

```javascript
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

// 
flow.run(fn)

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

// log events as they pass through
flow.log()

// error events as they pass through
flow.error()
```
