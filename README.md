# Seacreature

Seacreature aims to be an end-to-end framework to represent some of the hardest business problems including:

- Live analytic dashboards for multi-dimensional analysis of rapidly updating data.
- Distributed margin, rate and forecast tracking for bulk products.

This is a developer friendly framework and includes libraries that can used in a solution. There is no UI.

**[Flow](https://github.com/tcoats/seacreature/tree/master/flow)** — Transient event processing inspired by [Riemann](http://riemann.io). The API is similar to the [Riemann streams API](http://riemann.io/api/riemann.streams.html) and [Riemann streams source](https://github.com/riemann/riemann/blob/master/src/riemann/streams.clj). Nearly production ready.

**[Analytics](https://github.com/tcoats/seacreature/tree/master/analytics)** — [OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing) style multi-dimenensional business analysis inspired by [crossfilter](https://github.com/crossfilter/crossfilter) and [PowerBI](https://powerbi.microsoft.com/). Early beta.

**[Transactional](https://github.com/tcoats/seacreature/tree/master/transactional)** — Double entry, batched transactions with auto calculating dimension hierarchy. Inspired by accounting systems and [ERPs](https://en.wikipedia.org/wiki/Enterprise_resource_planning). Early functionality available.


# Todo
- Seacreature Analytics — Auto generate backward link from same data as the forward link and use this backward link to publish change for the other cube when inserting data. This may need to record what was changed and publish later.
- Seacreature Analytics — Get live updating to work
- Seacreature Analytics — Convert Seacreature to https://volument.com/baretest
- Seacreature Analytics — Vue power components for analytics
- Seacreature Analytics — http://compromise.cool
- Should we consider PowerBI's 'highlight' functionality?
- Update documentation to include analytics
- Update documentation to include transactional
- A real website for this project?
- Seacreature Dashboards — https://github.com/monitoror/monitoror
- Seacreature ERP — table/index/key/columnName
- Seacreature ERP — https://deno.land/