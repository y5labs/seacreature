# Seacreature Analytics

## Cube

A cube represents a table of data. It's a coordinator and most of it's API is internal to support other data structures.

```javascript
import Cube from 'seacreature/analytics/cube'

;(async () => {

// Create a cube with an identity function
const cube = Cube(x => x.id)

// Data is an array of objects
const data = [
  { id: 1, name: 'Alice' age: 34 },
  { id: 2, name: 'Bob' age: 29 },
  { id: 3, name: 'Charles' age: 42 }
]

// Multiple steps for adding data to work with multiple cubes
const diff = await cube.batch({ put: data })
await cube.batch_calculate_link_change(diff.link_change)
await cube.batch_calculate_selection_change(diff.selection_change)

console.log(cube.length()) // 3
console.log(Array.from(cube.filtered(Infinity))) // === data
console.log(Array.from(cube.unfiltered(Infinity))) // === data

})
```

### Cube(identity) => new cube

Create a new cube with an identity function to return a unique value per row of data.

### cube.length() => int

Returns the number of rows in the data set.

### _async_ cube.batch({ put, del }) => { selection\_change, link\_change }

Called first.

Start the process of adding or removing data from a cube. Returns an object with two properties used in the next two method calls to continue the process of calculating the changes needed to integrate changes to the underlying data. These need to be coordinated across multiple linked cubes. All `batch` methods called together, all `batch\_calculate\_link\_change` methods and all `batch_calculate_selection_change` methods.

### _async_ cube.batch\_calculate\_link\_change(link\_change)

Called second

Apply changes needed to keep links up to date when integrating data changes (put or del).

### _async_ cube.batch\_calculate\_selection\_change(selection\_change)

Called third.

Apply changes needed to keep selections up to date when integrating data changes (put or del).

### cube.filtered(n) => iterate through VISIBLE rows

When `n` is positive return the first `n` visible rows. When `n` is negative return the last `n` visible rows. This has no guaranteed order. It's recommended to use the same method on a dimension instead.

### cube.unfiltered(n) => iterate through ALL rows

When `n` is positive return the first `n` rows. When `n` is negative return the last `n` rows. This has no guaranteed order. It's recommended to use the same method on a dimension instead.

## Range Single

Range single is a single value per row that you want to sort and filter alphabetically or numerically. It also supports nulls.

```javascript
// Create a cube
const cube = Cube(x => x.id)

// Setup dimensions BEFORE data is added
const byage = cube.range_single(x => x.age)

// ...batch changes

await byage(34, null) // age >= 34
await byage(null, 34) // age <= 34
await byage(34, 37) // 34 <= age <= 37
await byage(null) // clear filter
await byage.hidenulls() // hide rows where age === null
await byage.shownulls() // show rows where age === null

console.log(Array.from(byage.highlighted(Infinity)))
console.log(Array.from(byage.filtered(Infinity)))
console.log(Array.from(byage.context(Infinity)))
console.log(Array.from(byage.unfiltered(Infinity)))

;
```

### cube.range\_single(map) => new range\_single

Create a new dimension of type range single.

### _async_ range\_single(lo, hi)

Filter this dimension between `lo` (or null) and `hi` (or null). Passing a single value will filter both `lo` and `hi` by that value. Passing null will reset the filter on this dimension.

### range\_single.highlighted(n)
### range\_single.filtered(n)
### range\_single.unfiltered(n)


## Issues
- Delete isn't working because the sparse array can't get smaller. Which is fine it just means we need an alternate measure of size?
- cube.request_assets.selectnone() not working
- Ignore empty put.
- https://github.com/flumedb/flumedb

## Questions
- How can the seacreature analytics codebase be more testable and discoverable?
- Should bit indicies be created for dimensions rather than created themselves?
- Should communications from dimensions back to cubes be duplex and single channel?
- Can a test harness for the new link relationships manager be created?
- Need testing around things going from null to available and back again.

# Performance
`node --prof ./scratch.js`
`node --prof-process --preprocess -j isolate*.log | flamebearer`
