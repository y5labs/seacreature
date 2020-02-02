# Product Model Seacreature Example

Anything that has been manually filtered is a 'root' in terms of mark and sweep style algorithms.

del / filtering is easy - propagate the graph turning things off.
put / unfiltering is hard - need to reference count to see if still filtered.
