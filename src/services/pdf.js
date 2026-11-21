import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { downloadBlob } from '../utils/files'

export const PAPER_SIZES = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
  Letter: { w: 215.9, h: 279.4 },
}

export function paperDims(paper = 'A4', orientation = 'portrait') {
  const s = PAPER_SIZES[paper] || PAPER_SIZES.A4
  return orientation === 'landscape' ? { w: s.h, h: s.w } : { w: s.w, h: s.h }
}

/** Find the always-present, exact-size export root rendered by the preview. */
function getExportRoot() {
  const el = document.getElementById('invix-export-root') || document.getElementById('invix-preview-root')
  if (!el) throw new Error('Invoice preview not found. Open the builder first.')
  return el.firstElementChild || el
}

const CAPTURE_Z = '2147483647'

const HOST_STYLE = {
  position: 'fixed',
  left: '0px',
  top: '0px',
  right: 'auto',
  bottom: 'auto',
  zIndex: CAPTURE_Z,
  visibility: 'visible',
  opacity: '1',
  display: 'block',
  transform: 'none',
}

function revealHost(host) {
  if (!host) return () => {}
  const props = Object.keys(HOST_STYLE)
  const previous = Object.fromEntries(props.map((p) => [p, host.style[p]]))
  Object.assign(host.style, HOST_STYLE)
  return () => props.forEach((p) => { host.style[p] = previous[p] })
}

function baseOptions(el, scale) {
  return {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: el.scrollWidth || 794,
    windowHeight: el.scrollHeight || el.offsetHeight || 1123,
  }
}

/** Downsample and check for a nearly all-white canvas (html2canvas sometimes returns one for hidden roots). */
function canvasLooksBlank(canvas) {
  try {
    const probe = document.createElement('canvas')
    probe.width = 48
    probe.height = 48
    const ctx = probe.getContext('2d', { willReadFrequently: true })
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, probe.width, probe.height)
    ctx.drawImage(canvas, 0, 0, probe.width, probe.height)
    const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data
    let min = 255
    let max = 0
    for (let i = 0; i < pixels.length; i += 4) {
      const v = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
      if (v < min) min = v
      if (v > max) max = v
    }
    return max - min < 12
  } catch {
    return false
  }
}

async function renderCanvas(el, { scale = 2 } = {}) {
  const host = el.closest?.('#invix-export-root, #invix-preview-root') || null
  const opts = baseOptions(el, scale)

  // Preferred path: fix the *cloned* document html2canvas renders from, so the
  // live page never flashes and `visibility:hidden` / negative z-index cannot
  // produce a white page.
  let canvas = await html2canvas(el, {
    ...opts,
    onclone: (clonedDoc) => {
      const cloneHost = clonedDoc.getElementById('invix-export-root') || clonedDoc.getElementById('invix-preview-root')
      if (cloneHost) revealHost(cloneHost)
    },
  })
  if (!canvasLooksBlank(canvas)) return canvas

  // Fallback for browsers where the cloned host is still not rasterized:
  // briefly place the real export host above the page, capture, then restore.
  if (!host) return canvas
  const restore = revealHost(host)
  try {
    canvas = await html2canvas(el, opts)
  } finally {
    restore()
  }
  return canvas
}

/** Add a rendered invoice to a jsPDF document, paginating tall invoices. */
function addCanvasToPDF(pdf, canvas, w, h) {
  const imgH = (canvas.height * w) / canvas.width
  if (imgH <= h + 0.5) {
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, w, Math.min(imgH, h))
    return
  }
  const pxPerMM = canvas.width / w
  const pageHeightPx = h * pxPerMM
  let y = 0
  let first = true
  while (y < canvas.height - 2) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceHeight
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
    if (!first) pdf.addPage([w, h], w > h ? 'landscape' : 'portrait')
    pdf.addImage(slice.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, w, sliceHeight / pxPerMM)
    first = false
    y += sliceHeight
  }
}

export async function exportPDF({ filename = 'invoice.pdf', paper = 'A4', orientation = 'portrait', scale = 2.5 } = {}) {
  const el = getExportRoot()
  const canvas = await renderCanvas(el, { scale })
  const { w, h } = paperDims(paper, orientation)
  const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h], compress: true })
  addCanvasToPDF(pdf, canvas, w, h)
  pdf.save(filename)
  return pdf
}

export async function exportPNG({ filename = 'invoice.png', scale = 2.5 } = {}) {
  const el = getExportRoot()
  const canvas = await renderCanvas(el, { scale })
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  downloadBlob(blob, filename)
}

export async function printInvoice({ paper = 'A4', orientation = 'portrait' } = {}) {
  const el = getExportRoot()
  const canvas = await renderCanvas(el, { scale: 2 })
  const data = canvas.toDataURL('image/jpeg', 0.95)
  const { w, h } = paperDims(paper, orientation)
  const win = window.open('', '_blank')
  if (!win) throw new Error('Popup blocked — allow popups to print.')
  win.document.write(`<!doctype html><html><head><title>Print Invoice</title>
    <style>@page{size:${w}mm ${h}mm;margin:0}html,body{margin:0;padding:0}img{width:100%;display:block}</style>
    </head><body><img src="${data}" onload="window.focus();window.print()"/></body></html>`)
  win.document.close()
}

/** Returns a Blob of the rendered invoice (for cloud upload / email attach). */
export async function invoiceBlob({ paper = 'A4', orientation = 'portrait', scale = 2.5 } = {}) {
  const el = getExportRoot()
  const canvas = await renderCanvas(el, { scale })
  const { w, h } = paperDims(paper, orientation)
  const pdf = new jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'mm', format: [w, h] })
  addCanvasToPDF(pdf, canvas, w, h)
  return pdf.output('blob')
}

/** Data-URL thumbnail for template gallery cards */
export async function elementThumbnail(el, { width = 360 } = {}) {
  const canvas = await renderCanvas(el, { scale: 1 })
  const ratio = width / canvas.width
  const out = document.createElement('canvas')
  out.width = width
  out.height = Math.round(canvas.height * ratio)
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0, out.width, out.height)
  return out.toDataURL('image/jpeg', 0.8)
}
