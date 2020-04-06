# Seacreature Analytics

## Todo

- [ ] Auto generate backward link from same data as the forward link
- [ ] Use this backward link to publish change for the other cube when inserting data. Need to record what was changed perhaps?
- [ ] Auto update backward_link when del or put.

Can we use the same data structure for backward_link? Yes but need to calculate diff.

# Performance

`node --prof ./scratch.js`

`node --prof-process --preprocess -j isolate*.log | flamebearer`