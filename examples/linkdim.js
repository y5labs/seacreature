(async () => {

const Cube = require('../analytics/cube')
const data = [
  { Id: 'Bob', Likes: ['Beer'] },
  { Id: 'Bruce', Likes: ['Beer', 'Apples'] },
  { Id: 'Mary', Likes: ['Oranges'] },
  { Id: 'Sue', Likes: ['Apples'] }
]

const people = Cube(o => o.Id)
const people_byid = people.range_single(o => o.Id)
const likes = people.link_multiple(o => o.Likes)

const people_indicies = await people.batch({ put: data })
await people.batch_calculate_selection_change(people_indicies)

const print = msg => {
  console.log(
    Array.from(people),
    likes.filter,
    msg)
}

await likes({ del: ['Beer'] })
print('Filtered once')
await likes({ del: ['Beer'] })
print('Filtered twice')
await likes({ put: ['Beer'] })
print('Undo once')
await likes({ put: ['Beer'] })
print('Undo twice')

})()