export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function toCSV(rows) {
  if (!rows?.length) return ''
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n')
}

export function exportCSV(rows, filename) {
  downloadBlob(new Blob(['\ufeff' + toCSV(rows)], { type: 'text/csv;charset=utf-8' }), filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

/** Excel export via HTML-table workbook trick (opens natively in Excel/Sheets) */
export function exportXLS(rows, filename, title) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body>
  <table border="1"><caption>${title || ''}</caption><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${r[h] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
  downloadBlob(new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' }), filename.endsWith('.xls') ? filename : `${filename}.xls`)
}

export function exportJSON(data, filename) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename.endsWith('.json') ? filename : `${filename}.json`)
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsText(file)
  })
}

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsDataURL(file)
  })
}
