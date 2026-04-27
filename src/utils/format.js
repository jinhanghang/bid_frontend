export function formatDateTime(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ')
}

export function money(value) {
  if (value === null || value === undefined || value === '') return '-'
  const num = Number(value)
  if (Number.isNaN(num)) return value
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fileSize(size) {
  const n = Number(size || 0)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`
}

export function toJsonText(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (e) {
    return String(value)
  }
}

export function parseJsonLoose(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return fallback
  }
}
