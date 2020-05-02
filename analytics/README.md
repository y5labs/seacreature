# Seacreature Analytics

## Questions
- How can the seacreature analytics codebase be more testable and discoverable?
- Should bit indicies be created for dimensions rather than created themselves?
- Should communications from dimensions back to cubes be duplex and single channel?
- Can a test harness for the new link relationships manager be created?

# Performance
`node --prof ./scratch.js`
`node --prof-process --preprocess -j isolate*.log | flamebearer`
