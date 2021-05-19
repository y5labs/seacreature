module.exports = (total, n, ms, count) => {
  const rate_ms = ms / count
  const remaining_count = total - n
  const remaining_ms = remaining_count * rate_ms
  const remaining_hr = Math.floor(remaining_ms / 1000 / 60 / 60)
  const remaining_min = Math.floor(remaining_ms / 1000 / 60 - remaining_hr * 60)
  const remaining_sec = Math.floor(remaining_ms / 1000 - remaining_min * 60)
  const remaining_fmt =
    remaining_hr ? `${remaining_hr}h ${remaining_min.toString().padStart(2, '0')}m`
    : remaining_min ? `${remaining_min}m ${remaining_sec.toString().padStart(2, '0')}s`
    : `${remaining_sec}s`

  return {
    rate_ms,
    remaining_count,
    remaining_ms,
    remaining_min,
    remaining_sec,
    remaining_fmt
  }
}