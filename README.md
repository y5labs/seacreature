# Sea Creature

## [Seacreature Flow](https://github.com/tcoats/seacreature/tree/master/flow)
Transient event processing inspired by [Riemann](http://riemann.io). The API is similar to the [Riemann streams API](http://riemann.io/api/riemann.streams.html) and [Riemann streams source](https://github.com/riemann/riemann/blob/master/src/riemann/streams.clj).

Late beta.

`require('seacreature/flow')`

## [Seacreature Analytics](https://github.com/tcoats/seacreature/tree/master/analytics)

[OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing) style multi-dimenensional business analysis inspired by [crossfilter](https://github.com/crossfilter/crossfilter) and [PowerBI](https://powerbi.microsoft.com/).

Early beta.

`require('seacreature/analytics/cube') ...etc`

## [Seacreature Transactional](https://github.com/tcoats/seacreature/tree/master/transactional)

Double entry, batched transactions with auto calculating dimension hierarchy. Inspired by accounting systems and [ERPs](https://en.wikipedia.org/wiki/Enterprise_resource_planning).

Alpha.

`require('seacreature/transactional/dimensions') ...etc`


# Todo
- [ ] Does analytics live updating work?
- [ ] Should we consider PowerBI's 'highlight' functionality?
- [ ] Update documentation to include analytics
- [ ] Update documentation to include transactional
- [ ] A real website for this project?

## Development Notes

# Performance
`node --prof ./scratch.js`
`node --prof-process --preprocess -j isolate*.log | flamebearer`



