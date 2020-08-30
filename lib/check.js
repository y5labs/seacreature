module.exports = spec => x => {
  const res = { isvalid: true }
  for (const [subject, tests] of Object.entries(spec)) {
    for (const [message, test] of Object.entries(tests)) {
      if (test(x)) continue
      res.isvalid = false
      if (!res[subject]) res[subject] = []
      res[subject].push(message)
    }
  }
  return res
}
