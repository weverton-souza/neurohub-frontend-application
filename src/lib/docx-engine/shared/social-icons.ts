import type { ContactType } from '@/types'

const ICON_SIZE = 32
const ICON_COLOR = '#666666'

function createCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE)
  ctx.fillStyle = ICON_COLOR
  ctx.strokeStyle = ICON_COLOR
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { canvas, ctx }
}

function canvasToUint8Array(canvas: HTMLCanvasElement): Uint8Array {
  const dataUrl = canvas.toDataURL('image/png')
  const base64 = dataUrl.split(',')[1]
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

function drawInstagramIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  const r = s * 0.22
  const m = s * 0.12
  ctx.beginPath()
  ctx.moveTo(m + r, m)
  ctx.lineTo(s - m - r, m)
  ctx.quadraticCurveTo(s - m, m, s - m, m + r)
  ctx.lineTo(s - m, s - m - r)
  ctx.quadraticCurveTo(s - m, s - m, s - m - r, s - m)
  ctx.lineTo(m + r, s - m)
  ctx.quadraticCurveTo(m, s - m, m, s - m - r)
  ctx.lineTo(m, m + r)
  ctx.quadraticCurveTo(m, m, m + r, m)
  ctx.closePath()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s * 0.2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(s * 0.72, s * 0.28, s * 0.05, 0, Math.PI * 2)
  ctx.fill()
  return canvasToUint8Array(canvas)
}

function drawLinkedinIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  ctx.font = `bold ${s * 0.55}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('in', s / 2, s / 2 + 1)
  return canvasToUint8Array(canvas)
}

function drawFacebookIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  ctx.font = `bold ${s * 0.65}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('f', s / 2 + 1, s / 2 + 1)
  return canvasToUint8Array(canvas)
}

function drawWebsiteIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  const cx = s / 2, cy = s / 2, r = s * 0.38
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2)
  ctx.stroke()
  return canvasToUint8Array(canvas)
}

function drawPhoneIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(s * 0.2, s * 0.15)
  ctx.quadraticCurveTo(s * 0.15, s * 0.4, s * 0.3, s * 0.55)
  ctx.lineTo(s * 0.45, s * 0.7)
  ctx.quadraticCurveTo(s * 0.6, s * 0.85, s * 0.85, s * 0.8)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(s * 0.22, s * 0.18, s * 0.07, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(s * 0.82, s * 0.78, s * 0.07, 0, Math.PI * 2)
  ctx.fill()
  return canvasToUint8Array(canvas)
}

function drawEmailIcon(): Uint8Array {
  const { canvas, ctx } = createCanvas()
  const s = ICON_SIZE
  const mx = s * 0.12, my = s * 0.22
  const w = s - mx * 2, h = s - my * 2
  ctx.strokeRect(mx, my, w, h)
  ctx.beginPath()
  ctx.moveTo(mx, my)
  ctx.lineTo(s / 2, s / 2 + 1)
  ctx.lineTo(s - mx, my)
  ctx.stroke()
  return canvasToUint8Array(canvas)
}

const iconCache = new Map<ContactType, Uint8Array>()

const ICON_GENERATORS: Record<ContactType, () => Uint8Array> = {
  instagram: drawInstagramIcon,
  linkedin: drawLinkedinIcon,
  facebook: drawFacebookIcon,
  website: drawWebsiteIcon,
  phone: drawPhoneIcon,
  email: drawEmailIcon,
}

export function generateSocialIcon(type: ContactType): Uint8Array {
  const cached = iconCache.get(type)
  if (cached) return cached
  const generator = ICON_GENERATORS[type]
  const bytes = generator()
  iconCache.set(type, bytes)
  return bytes
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
