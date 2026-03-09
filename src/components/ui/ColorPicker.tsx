import { useState, useRef, useEffect, useCallback } from 'react'
import { useClickOutside } from '@/lib/hooks/use-click-outside'

export const COLOR_PRESETS = [
  '#55EFC4', '#81ECEC', '#74B9FF', '#A29BFE', '#DFE6E9',
  '#00B894', '#00CEC9', '#0984E3', '#6C5CE7', '#B2BEC3',
  '#FFEAA7', '#FAB1A0', '#FF7675', '#FD79A8', '#636E72',
  '#FDCB6E', '#E17055', '#D63031', '#E84393', '#2D3436',
]

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h, s, l]
}

export function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) {
    const v = Math.round(l * 255)
    return '#' + [v, v, v].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, h) * 255)
  const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [baseHsl, setBaseHsl] = useState<[number, number, number] | null>(null)
  const [hexInput, setHexInput] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  const handleCloseOutside = useCallback(() => {
    setIsOpen(false)
    setBaseHsl(null)
    setHexInput('')
  }, [])
  useClickOutside(containerRef, handleCloseOutside, isOpen)

  // Posicionar o picker para não sair da tela
  useEffect(() => {
    if (!isOpen || !pickerRef.current) return
    const rect = pickerRef.current.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      pickerRef.current.style.left = 'auto'
      pickerRef.current.style.right = '0px'
    }
    if (rect.bottom > window.innerHeight) {
      pickerRef.current.style.top = 'auto'
      pickerRef.current.style.bottom = '100%'
      pickerRef.current.style.marginBottom = '4px'
    }
  }, [isOpen])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    const hsl = hexToHsl(value)
    setBaseHsl(hsl)
    setHexInput(value.replace('#', ''))
  }, [value])

  const handleApply = useCallback((color: string) => {
    onChange(color)
    setIsOpen(false)
    setBaseHsl(null)
    setHexInput('')
  }, [onChange])

  const adjustedColor = baseHsl ? hslToHex(baseHsl[0], baseHsl[1], baseHsl[2]) : value
  const sliderGradient = baseHsl
    ? `linear-gradient(to right, ${hslToHex(baseHsl[0], baseHsl[1], 0.1)}, ${hslToHex(baseHsl[0], baseHsl[1], 0.5)}, ${hslToHex(baseHsl[0], baseHsl[1], 0.9)})`
    : undefined

  return (
    <div ref={containerRef} className="relative">
      {/* Swatch button */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-8 h-8 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-gray-400 transition-colors shrink-0"
        style={{ backgroundColor: value }}
        title={value}
      />

      {/* Dropdown picker */}
      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute z-[9999] mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3"
          style={{ width: 260 }}
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).tagName === 'INPUT') return
            e.preventDefault()
          }}
        >
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Escolha uma cor
          </div>
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                className={`w-8 h-8 rounded-lg border-2 transition-colors hover:scale-110 ${
                  baseHsl && hslToHex(hexToHsl(color)[0], hexToHsl(color)[1], baseHsl[2]) === adjustedColor
                    ? 'border-gray-600 ring-1 ring-gray-400'
                    : 'border-transparent hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  const hsl = hexToHsl(color)
                  setBaseHsl(hsl)
                  setHexInput(hslToHex(hsl[0], hsl[1], hsl[2]).replace('#', ''))
                }}
                title={color}
              />
            ))}
          </div>

          {/* Slider de intensidade */}
          {baseHsl && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Intensidade</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded border border-gray-300"
                    style={{ backgroundColor: adjustedColor }}
                  />
                  <span className="text-[10px] font-mono text-gray-500">{adjustedColor}</span>
                </div>
              </div>
              <div className="relative h-6 flex items-center">
                <div
                  className="absolute inset-x-0 h-3 rounded-full"
                  style={{ background: sliderGradient }}
                />
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={Math.round(baseHsl[2] * 100)}
                  onChange={(e) => {
                    const l = parseInt(e.target.value) / 100
                    setBaseHsl([baseHsl[0], baseHsl[1], l])
                    setHexInput(hslToHex(baseHsl[0], baseHsl[1], l).replace('#', ''))
                  }}
                  className="relative w-full h-3 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-400 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
                />
              </div>
              <div className="relative h-4 mt-0.5 mx-0.5">
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(v => (
                  <div
                    key={v}
                    className="absolute flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${((v - 10) / 80) * 100}%` }}
                  >
                    <div className="w-px h-1 bg-gray-300" />
                    <span className="text-[7px] text-gray-400 leading-none mt-px">{v}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: adjustedColor }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleApply(adjustedColor)
                }}
              >
                Aplicar {adjustedColor}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">#</span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6)
                setHexInput(val)
                if (val.length === 6) {
                  setBaseHsl(hexToHsl('#' + val.toUpperCase()))
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && hexInput.length === 6) {
                  e.preventDefault()
                  const color = baseHsl ? hslToHex(baseHsl[0], baseHsl[1], baseHsl[2]) : '#' + hexInput.toUpperCase()
                  handleApply(color)
                }
              }}
              placeholder="RRGGBB"
              className="flex-1 text-xs font-mono border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
              maxLength={6}
            />
            {hexInput.length === 6 && !baseHsl && (
              <button
                type="button"
                className="w-6 h-6 rounded border border-gray-200"
                style={{ backgroundColor: '#' + hexInput }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleApply('#' + hexInput.toUpperCase())
                }}
                title="Aplicar cor"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
