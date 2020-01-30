# Product Model Seacreature Example

Cube has BitArray for filters and another for Links
Links have a reference count SparseArray that is incremented when put and decremented when del. Propagates across the network.
Filters on a cube kick off propagation.
Puts and dels update reference counts.
Anything above zero does not alter the link BitArray.
A link going from one to zero filters the link BitArray.
A link going from zero to one unfilters the link BitArray.