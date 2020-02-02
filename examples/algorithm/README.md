# Product Model Seacreature Example

Batch changes into the first links to set thresholds.

Puts follow open links to adjust refcount?
Dels follow closed links to adjust refcount?

Cube index changes that cause a visiblity change kick off a unique propagation.


I think the algorithm for link_multiple is working.
I don't know if the algorithm for batch should be the same as the one for visiblilty change.
I don't know if internal filters should could as a dere



Perhaps I should think of filters as references instead. E.g. the number of times something has been filtered is important.



Partial mark and sweep


<https://en.wikipedia.org/wiki/Tracing_garbage_collection>

del / filtering is easy - propagate the graph.
put / unfiltering is hard - need to reference count to see if still filtered.