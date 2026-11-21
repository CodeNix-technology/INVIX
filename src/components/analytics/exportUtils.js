import { exportCSV, exportXLS } from '../../utils/files'

const safeName = (s) => String(s || 'export').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export'

/** Serialize a rendered chart's SVG into a PNG data URL. */
export async function chartToPNG(node, background = '#ffffff') {
  const svg = node?.querySelector?.('svg.recharts-surface') || node?.querySelector?.('svg')
  if (!svg) throw new Error('Chart is not ready for export')
  const clone = svg.cloneNode(true)
  const box = svg.getBoundingClientRect()
  const width = Math.max(320, Math.round(box.width || 800))
  const height = Math.max(220, Math.round(box.height || 360))
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const source = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Unable to render chart image'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function downloadDataURL(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = safeName(filename)
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function exportChartPNG(node, title) {
  downloadDataURL(await chartToPNG(node), `${title}.png`)
}

export async function exportChartPDF(node, title) {
  const [{ jsPDF }, dataUrl] = await Promise.all([
    import('jspdf'),
    chartToPNG(node),
  ])
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, pageW, pageH, 'F')
  pdf.setTextColor(30, 41, 59)
  pdf.setFontSize(16)
  pdf.text(title, 40, 38)
  const img = pdf.getImageProperties(dataUrl)
  const maxW = pageW - 80
  const maxH = pageH - 90
  const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
  const w = img.width * ratio
  const h = img.height * ratio
  pdf.addImage(dataUrl, 'PNG', (pageW - w) / 2, 55, w, h)
  pdf.save(`${safeName(title)}.pdf`)
}

export function exportRowsCSV(rows, filename) {
  if (!rows?.length) throw new Error('No data to export')
  exportCSV(rows, `${safeName(filename)}.csv`)
}

export function exportRowsXLS(rows, filename, title) {
  if (!rows?.length) throw new Error('No data to export')
  exportXLS(rows, `${safeName(filename)}.xls`, title || filename)
}

/** Lightweight paged table export; avoids extra dependencies. */
export async function exportRowsPDF(rows, title, currency = 'INR') {
  if (!rows?.length) throw new Error('No data to export')
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const margin = 36
  let y = 44
  const headers = Object.keys(rows[0])
  const fmt = (v) => {
    if (typeof v === 'number') {
      try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v) } catch { return String(v) }
    }
    return String(v ?? '')
  }
  const drawHeader = (page) => {
    pdf.setFillColor(79, 70, 229)
    pdf.rect(margin, y - 14, pageW - margin * 2, 22, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(9)
    let x = margin + 6
    headers.forEach((h) => {
      pdf.text(String(h).toUpperCase(), x, y)
      x += Math.max(80, (pageW - margin * 2) / headers.length)
    })
    y += 24
    pdf.setTextColor(30, 41, 59)
    if (page > 1) pdf.setFontSize(11)
  }
  drawHeader(1)
  pdf.setFontSize(9)
  rows.forEach((row, i) => {
    if (y > pdf.internal.pageSize.getHeight() - 45) {
      pdf.addPage()
      y = 44
      drawHeader(pdf.getNumberOfPages())
      pdf.setFontSize(9)
    }
    let x = margin + 6
    headers.forEach((h) => {
      const value = fmt(row[h])
      pdf.text(value.length > 34 ? `${value.slice(0, 33)}…` : value, x, y)
      x += Math.max(80, (pageW - margin * 2) / headers.length)
    })
    y += 16
    if (i === rows.length - 1) {
      pdf.setFontSize(8)
      pdf.setTextColor(120, 130, 150)
      pdf.text(`Generated with Invix · ${new Date().toLocaleString('en-IN')}`, margin, pdf.internal.pageSize.getHeight() - 20)
    }
  })
  pdf.save(`${safeName(title)}.pdf`)
}
