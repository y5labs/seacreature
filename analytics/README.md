# Seacreature Analytics

## Todo

- [ ] Work out a good strategy for null links. Auto off when any filters are present. Auto on when filters are removed?
- [x] Auto generate backward_link
- [ ] Auto update backward_link when del or put.

Can we use the same data structure for backward_link? Yes but need to calculate diff.

# Performance

`node --prof ./scratch.js`

`node --prof-process --preprocess -j isolate*.log | flamebearer`