# Seacreature Analytics

## Todo

- [ ] Work out a good strategy for null links. Auto off when any filters are present. Auto on when filters are removed?
- [ ] Auto generate backward_link
- [ ] Auto update backward_link when del or put.

# Performance

`node --prof ./scratch.js`

`node --prof-process --preprocess -j isolate*.log | flamebearer`