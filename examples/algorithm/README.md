# Product Model Seacreature Example

Filters on a cube kick off propagation.
Puts and dels update reference counts.
Anything above zero does not alter the link BitArray.
A link going from one to zero filters the link BitArray.
A link going from zero to one unfilters the link BitArray.


1. Fix link_multiple. Needs to count against each key, then update the index count, then update the bitindex
2. Create refcount dimension for link reference counts


