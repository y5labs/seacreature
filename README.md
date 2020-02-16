# Sea Creature

## [Seacreature Flow](https://github.com/tcoats/seacreature/tree/master/flow)
Transient event processing inspired by [Riemann](http://riemann.io).

The API is similar to the [Riemann streams API](http://riemann.io/api/riemann.streams.html) and [Riemann streams source](https://github.com/riemann/riemann/blob/master/src/riemann/streams.clj).

`require('seacreature/flow')`

## [Seacreature Analytics](https://github.com/tcoats/seacreature/tree/master/analytics)

## [Seacreature Transactional](https://github.com/tcoats/seacreature/tree/master/transactional)


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



