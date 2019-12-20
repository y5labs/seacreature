module.exports = {
  data1: [
    { id: 'I4', ts: 100, name: 'Michael Smith', children: ['I1', 'I2'] },
    { id: 'I3', ts: 200, name: 'Bruce McSweeny', children: [] },
    { id: 'I2', ts: 800, name: 'Mandy Smith', children: [] },
    { id: 'I1', ts: 800, name: 'Derrick Smith', children: [] }
  ],
  data2: [
    { id: 'I6', ts: 200, name: 'Sally McSweeny', children: [] },
    { id: 'I5', ts: 300, name: 'Tiger Woods', children: [] },
    { id: 'I8', ts: 900, name: 'Tania McSweeny', children: ['I4', 'I3', 'I6'] },
    { id: 'I7', ts: 900, name: 'Pony Horse', children: ['I5'] },
    { id: 'I9', ts: 900, name: 'Matt McSweeny', children: ['I4', 'I3', 'I6'] }
  ]
}