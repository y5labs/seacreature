module.exports = spec => async x => {
  const res = { isvalid: true }
  for (const [subject, tests] of Object.entries(spec)) {
    for (const [message, test] of Object.entries(tests)) {
      try {
        if (await test(x)) continue
      }
      catch (e) { }
      res.isvalid = false
      if (!res[subject]) res[subject] = []
      res[subject].push(message)
    }
  }
  return res
}
