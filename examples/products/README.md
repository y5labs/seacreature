# Product Model Seacreature Example

Reference counting.
Each cube gets a sparse array of ref counts.
Batches add to the ref counts.

Filtering needs to come with the weight of reference counts against the filtered field?

node --prof ./scratch.js
node --prof-process --preprocess -j isolate*.log | flamebearer