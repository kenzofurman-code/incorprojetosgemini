import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ZoomIn, ZoomOut, Loader2, Info, Check, Trash2,
  Ruler, Layout, Edit, Compass, Maximize, Square, Type, Magnet
} from 'lucide-react'
import { Card, Button, DataSourceBadge } from '../../components/ui'
import { getDrawing } from '../../lib/queries'
import { renderPdfPage, type RenderedPdfPage } from '../../lib/pdf-comparison'
import * as pdfjsLib from 'pdfjs-dist'
import type { Drawing } from '../../types'

// Set worker source using unpkg CDN (same as comparison)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

interface CalibratedScale {
  scaleFactor: number // meters per pixel
  realDistance: number
  pixelDistance: number
  pointA: { x: number; y: number }
  pointB: { x: number; y: number }
}

interface SavedLine {
  id: string
  points: { x: number; y: number }[]
  lengthReal: number
}

interface SavedArea {
  id: string
  points: { x: number; y: number }[]
  areaReal: number
}

interface ExtractedTextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

interface SavedTextGroup {
  id: string
  label: string
  count: number
  bounds: { xMin: number; yMin: number; xMax: number; yMax: number }
}

type QuantificationTool = 'navigate' | 'calibrate' | 'linear' | 'area' | 'text'

export default function Quantificacao() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [drawing, setDrawing] = useState<Drawing | null>(null)
  const [renderedPage, setRenderedPage] = useState<RenderedPdfPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfTextItems, setPdfTextItems] = useState<ExtractedTextItem[]>([])

  // Tools & States
  const [tool, setTool] = useState<QuantificationTool>('navigate')
  const [calibration, setCalibration] = useState<CalibratedScale | null>(null)
  const [calibrationInputShow, setCalibrationInputShow] = useState(false)
  const [tempCalibrationPoints, setTempCalibrationPoints] = useState<{ x: number; y: number }[]>([])
  const [realDistanceInput, setRealDistanceInput] = useState('')

  // Linear measure
  const [activeLinePoints, setActiveLinePoints] = useState<{ x: number; y: number }[]>([])
  const [savedLines, setSavedLines] = useState<SavedLine[]>([])

  // Area measure
  const [activeAreaPoints, setActiveAreaPoints] = useState<{ x: number; y: number }[]>([])
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>([])

  // Text Selection box
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null)
  const [boxCurrent, setBoxCurrent] = useState<{ x: number; y: number } | null>(null)
  const [savedTexts, setSavedTexts] = useState<SavedTextGroup[]>([])

  // Zoom & Pan states
  const [scale, setScale] = useState(1)
  const [renderedScale, setRenderedScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // CAD Snapping states
  const [snapPoints, setSnapPoints] = useState<{ x: number; y: number }[]>([])
  const [activeSnapPoint, setActiveSnapPoint] = useState<{ x: number; y: number } | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  // Debounce scale updates to avoid lagging during zoom wheel
  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderedScale(scale)
    }, 250)
    return () => clearTimeout(timer)
  }, [scale])

  // Fit to screen on initial load
  useEffect(() => {
    if (!renderedPage || !containerRef.current) return
    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight
    const pageWidth = renderedPage.canvas.width / renderedScale
    const pageHeight = renderedPage.canvas.height / renderedScale

    if (containerWidth > 0 && containerHeight > 0) {
      const scaleX = containerWidth / pageWidth
      const scaleY = containerHeight / pageHeight
      const newScale = Math.min(scaleX, scaleY) * 0.95
      const newOffsetX = (containerWidth - pageWidth * newScale) / 2
      const newOffsetY = (containerHeight - pageHeight * newScale) / 2

      setScale(newScale)
      setRenderedScale(newScale)
      setOffset({ x: newOffsetX, y: newOffsetY })
    }
  }, [drawing?.pdfUrl])

  const dimensions = renderedPage
    ? { width: renderedPage.canvas.width / renderedScale, height: renderedPage.canvas.height / renderedScale }
    : { width: 800, height: 600 }

  // Load Drawing metadata from Supabase
  useEffect(() => {
    if (!id) return
    getDrawing(id).then(d => {
      if (d) setDrawing(d)
      else setError('Prancha não encontrada.')
    }).catch(err => {
      console.error('[Quantificacao] Error loading drawing:', err)
      setError('Erro ao carregar prancha do Supabase.')
    })
  }, [id])

  // Load PDF and extract texts
  useEffect(() => {
    if (!drawing?.pdfUrl) return
    let active = true
    setLoading(true)
    setError(null)

    // Render scale 2.5 for crisp details
    const renderScale = 2.5
    const targetScale = 2.5 * renderedScale

    renderPdfPage(drawing.pdfUrl, 1, false, targetScale)
      .then(async page => {
        if (!active) return

        setRenderedPage(page)

        // Load texts
        try {
          const loadingTask = pdfjsLib.getDocument({ url: drawing.pdfUrl! })
          const pdfDoc = await loadingTask.promise
          const pdfPage = await pdfDoc.getPage(1)
          const viewport = pdfPage.getViewport({ scale: renderScale })
          const textContent = await pdfPage.getTextContent()

          const items: ExtractedTextItem[] = textContent.items.map((item: any) => {
            let transform = item.transform
            if (pdfjsLib.Util?.transform) {
              transform = pdfjsLib.Util.transform(viewport.transform, item.transform)
            } else {
              const m = viewport.transform
              const t = item.transform
              transform = [
                m[0] * t[0] + m[2] * t[1],
                m[1] * t[0] + m[3] * t[1],
                m[0] * t[2] + m[2] * t[3],
                m[1] * t[2] + m[3] * t[3],
                m[0] * t[4] + m[2] * t[5] + m[4],
                m[1] * t[4] + m[3] * t[5] + m[5]
              ]
            }
            const h = Math.hypot(transform[2], transform[3])
            return {
              str: item.str,
              x: transform[4],
              y: transform[5] - h, // Shift to top-left
              width: item.width * renderScale,
              height: h
            }
          })
          setPdfTextItems(items)
          // Load vector vertices for CAD snapping
          try {
            const ops = await pdfPage.getOperatorList()
            const vertices: { x: number; y: number }[] = []
            const OPS = (pdfjsLib as any).OPS || {}

            let CTM = [1, 0, 0, 1, 0, 0]
            const CTMStack: number[][] = []

            for (let i = 0; i < ops.fnArray.length; i++) {
              const fn = ops.fnArray[i]
              const args = ops.argsArray[i]

              if (fn === OPS.save) {
                CTMStack.push([...CTM])
              } else if (fn === OPS.restore) {
                CTM = CTMStack.pop() || [1, 0, 0, 1, 0, 0]
              } else if (fn === OPS.transform) {
                const t = args // [a, b, c, d, e, f]
                CTM = [
                  CTM[0] * t[0] + CTM[2] * t[1],
                  CTM[1] * t[0] + CTM[3] * t[1],
                  CTM[0] * t[2] + CTM[2] * t[3],
                  CTM[1] * t[2] + CTM[3] * t[3],
                  CTM[0] * t[4] + CTM[2] * t[5] + CTM[4],
                  CTM[1] * t[4] + CTM[3] * t[5] + CTM[5]
                ]
              } else if (fn === OPS.constructPath) {
                const pathOps = args[0]
                const pathArgs = args[1]
                let argIdx = 0

                for (const op of pathOps) {
                  if (op === OPS.moveTo || op === OPS.lineTo) {
                    const px = pathArgs[argIdx++]
                    const py = pathArgs[argIdx++]
                    const tx = CTM[0] * px + CTM[2] * py + CTM[4]
                    const ty = CTM[1] * px + CTM[3] * py + CTM[5]
                    const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                    vertices.push({ x: vx, y: vy })
                  } else if (op === OPS.curveTo) {
                    argIdx += 4
                    const px = pathArgs[argIdx++]
                    const py = pathArgs[argIdx++]
                    const tx = CTM[0] * px + CTM[2] * py + CTM[4]
                    const ty = CTM[1] * px + CTM[3] * py + CTM[5]
                    const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                    vertices.push({ x: vx, y: vy })
                  } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
                    argIdx += 2
                    const px = pathArgs[argIdx++]
                    const py = pathArgs[argIdx++]
                    const tx = CTM[0] * px + CTM[2] * py + CTM[4]
                    const ty = CTM[1] * px + CTM[3] * py + CTM[5]
                    const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                    vertices.push({ x: vx, y: vy })
                  } else if (op === OPS.rectangle) {
                    const px = pathArgs[argIdx++]
                    const py = pathArgs[argIdx++]
                    const w = pathArgs[argIdx++]
                    const h = pathArgs[argIdx++]
                    const corners = [
                      { x: px, y: py },
                      { x: px + w, y: py },
                      { x: px + w, y: py + h },
                      { x: px, y: py + h }
                    ]
                    for (const pt of corners) {
                      const tx = CTM[0] * pt.x + CTM[2] * pt.y + CTM[4]
                      const ty = CTM[1] * pt.x + CTM[3] * pt.y + CTM[5]
                      const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                      vertices.push({ x: vx, y: vy })
                    }
                  }
                }
              } else if (fn === OPS.moveTo || fn === OPS.lineTo) {
                const px = args[0]
                const py = args[1]
                const tx = CTM[0] * px + CTM[2] * py + CTM[4]
                const ty = CTM[1] * px + CTM[3] * py + CTM[5]
                const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                vertices.push({ x: vx, y: vy })
              } else if (fn === OPS.rectangle) {
                const px = args[0]
                const py = args[1]
                const w = args[2]
                const h = args[3]
                const corners = [
                  { x: px, y: py },
                  { x: px + w, y: py },
                  { x: px + w, y: py + h },
                  { x: px, y: py + h }
                ]
                for (const pt of corners) {
                  const tx = CTM[0] * pt.x + CTM[2] * pt.y + CTM[4]
                  const ty = CTM[1] * pt.x + CTM[3] * pt.y + CTM[5]
                  const [vx, vy] = viewport.convertToViewportPoint(tx, ty)
                  vertices.push({ x: vx, y: vy })
                }
              }
            }

            // Deduplicate
            const seen = new Set<string>()
            const uniqueVertices: { x: number; y: number }[] = []
            for (const v of vertices) {
              const key = `${v.x.toFixed(1)},${v.y.toFixed(1)}`
              if (!seen.has(key)) {
                seen.add(key)
                uniqueVertices.push(v)
              }
            }
            setSnapPoints(uniqueVertices)
          } catch (snapErr) {
            console.warn('[Quantificacao] Failed to extract snap points:', snapErr)
          }
        } catch (txtErr) {
          console.warn('[Quantificacao] Failed to extract text content/snap points:', txtErr)
        }

        setLoading(false)
      })
      .catch(err => {
        if (active) {
          console.error('[Quantificacao] PDF render error:', err)
          setError('Erro ao abrir desenho PDF.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [drawing, renderedScale])

  // Draw rendered page to canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !renderedPage) return
    canvas.width = renderedPage.canvas.width
    canvas.height = renderedPage.canvas.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(renderedPage.canvas, 0, 0)
    }
  }, [renderedPage])

  // Load takeoffs from LocalStorage
  useEffect(() => {
    if (!id) return
    const saved = localStorage.getItem(`quantification-${id}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.calibration) setCalibration(data.calibration)
        if (data.savedLines) setSavedLines(data.savedLines)
        if (data.savedAreas) setSavedAreas(data.savedAreas)
        if (data.savedTexts) setSavedTexts(data.savedTexts)
      } catch (e) {
        console.error('[Quantificacao] Failed parsing saved takeoffs:', e)
      }
    }
  }, [id])

  // Prevent browser window zoom on Ctrl + Wheel inside the viewport
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const handleWheelPrevent = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault()
    }
    viewport.addEventListener('wheel', handleWheelPrevent, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', handleWheelPrevent)
    }
  }, [renderedPage])

  // Keyboard listener for Spacebar pan
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(true)
        e.preventDefault()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const zoomFactor = 1.15
      const nextScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor
      const clampedScale = Math.min(Math.max(nextScale, 0.25), 8)

      const rect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const dx = mouseX - offset.x
      const dy = mouseY - offset.y

      setOffset({
        x: mouseX - dx * (clampedScale / scale),
        y: mouseY - dy * (clampedScale / scale),
      })
      setScale(clampedScale)
    }
  }

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!renderedPage) return { x: 0, y: 0 }
    const rect = e.currentTarget.getBoundingClientRect()
    const xOnViewport = e.clientX - rect.left
    const yOnViewport = e.clientY - rect.top

    const x = (xOnViewport - offset.x) / scale
    const y = (yOnViewport - offset.y) / scale
    return { x, y }
  }, [offset, scale, renderedPage])

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const isMiddleButton = e.button === 1
    const isRightButton = e.button === 2
    const forcePan = spacePressed || isMiddleButton || isRightButton || tool === 'navigate'

    if (forcePan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
      e.preventDefault()
      return
    }

    if (e.button === 0 && renderedPage) {
      const coords = (snapEnabled && activeSnapPoint) ? activeSnapPoint : getCanvasCoords(e)

      if (tool === 'calibrate') {
        if (tempCalibrationPoints.length < 2) {
          const newPts = [...tempCalibrationPoints, coords]
          setTempCalibrationPoints(newPts)
          if (newPts.length === 2) {
            setCalibrationInputShow(true)
          }
        }
      } else if (tool === 'linear') {
        setActiveLinePoints(prev => [...prev, coords])
      } else if (tool === 'area') {
        setActiveAreaPoints(prev => [...prev, coords])
      } else if (tool === 'text') {
        setBoxStart(coords)
        setBoxCurrent(coords)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
      return
    }

    const coords = getCanvasCoords(e)
    setMousePos(coords)

    // Calculate CAD snapping to vector endpoints
    if (snapEnabled && snapPoints.length > 0 && (tool === 'linear' || tool === 'area' || tool === 'calibrate')) {
      let closest: { x: number; y: number } | null = null
      let minDist = 15 / scale // Screen-space threshold (15 screen pixels)

      for (const p of snapPoints) {
        const d = Math.hypot(p.x - coords.x, p.y - coords.y)
        if (d < minDist) {
          minDist = d
          closest = p
        }
      }
      setActiveSnapPoint(closest)
    } else {
      setActiveSnapPoint(null)
    }

    if (tool === 'text' && boxStart) {
      setBoxCurrent(coords)
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsPanning(false)

    if (tool === 'text' && boxStart && boxCurrent) {
      // Finalize text selection box
      const coords = getCanvasCoords(e)
      const xMin = Math.min(boxStart.x, coords.x)
      const xMax = Math.max(boxStart.x, coords.x)
      const yMin = Math.min(boxStart.y, coords.y)
      const yMax = Math.max(boxStart.y, coords.y)

      const width = xMax - xMin
      const height = yMax - yMin

      if (width > 5 && height > 5) {
        // Query text items inside the box
        const found = pdfTextItems.filter(item => {
          return (
            item.x >= xMin &&
            item.x + item.width <= xMax &&
            item.y >= yMin &&
            item.y + item.height <= yMax
          )
        })

        // Filter out empty lines or pure whitespace
        const tokens = found.map(f => f.str.trim()).filter(Boolean)
        if (tokens.length > 0) {
          // Group repeating tokens
          const counts: Record<string, number> = {}
          tokens.forEach(t => { counts[t] = (counts[t] || 0) + 1 })

          // Create a saved text group for each unique token found
          const newGroups: SavedTextGroup[] = Object.entries(counts).map(([label, count]) => ({
            id: `txt-${Date.now()}-${Math.random()}`,
            label,
            count,
            bounds: { xMin, yMin, xMax, yMax }
          }))

          setSavedTexts(prev => [...prev, ...newGroups])
        } else {
          alert('Nenhum texto vetorial encontrado nesta caixa de seleção. Verifique se o desenho é vetorial.')
        }
      }

      setBoxStart(null)
      setBoxCurrent(null)
    }
  }

  // Double click finishes linear or area measurements
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (tool === 'linear' && activeLinePoints.length > 1) {
      // Calculate length
      let pixelsDist = 0
      for (let i = 0; i < activeLinePoints.length - 1; i++) {
        const p1 = activeLinePoints[i]
        const p2 = activeLinePoints[i + 1]
        pixelsDist += Math.hypot(p2.x - p1.x, p2.y - p1.y)
      }

      const lengthReal = calibration ? pixelsDist * calibration.scaleFactor : 0
      const newLine: SavedLine = {
        id: `line-${Date.now()}`,
        points: activeLinePoints,
        lengthReal
      }
      setSavedLines(prev => [...prev, newLine])
      setActiveLinePoints([])
    } else if (tool === 'area' && activeAreaPoints.length > 2) {
      // Calculate area via Shoelace formula
      let sum = 0
      const n = activeAreaPoints.length
      for (let i = 0; i < n; i++) {
        const p1 = activeAreaPoints[i]
        const p2 = activeAreaPoints[(i + 1) % n]
        sum += p1.x * p2.y - p2.x * p1.y
      }
      const areaPixels = Math.abs(sum) / 2
      const areaReal = calibration ? areaPixels * Math.pow(calibration.scaleFactor, 2) : 0

      const newArea: SavedArea = {
        id: `area-${Date.now()}`,
        points: activeAreaPoints,
        areaReal
      }
      setSavedAreas(prev => [...prev, newArea])
      setActiveAreaPoints([])
    }
  }

  // Complete calibration
  function confirmCalibration() {
    if (tempCalibrationPoints.length !== 2) return
    const p1 = tempCalibrationPoints[0]
    const p2 = tempCalibrationPoints[1]
    const pixelDistance = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const realDistance = parseFloat(realDistanceInput)

    if (isNaN(realDistance) || realDistance <= 0) {
      alert('Digite uma dimensão real válida e maior que zero.')
      return
    }

    const scaleFactor = realDistance / pixelDistance
    const newCalibration: CalibratedScale = {
      scaleFactor,
      realDistance,
      pixelDistance,
      pointA: p1,
      pointB: p2
    }

    setCalibration(newCalibration)

    // Update existing measurements if scale changes
    setSavedLines(prev => prev.map(line => {
      let lenPix = 0
      for (let i = 0; i < line.points.length - 1; i++) {
        lenPix += Math.hypot(line.points[i+1].x - line.points[i].x, line.points[i+1].y - line.points[i].y)
      }
      return { ...line, lengthReal: lenPix * scaleFactor }
    }))

    setSavedAreas(prev => prev.map(area => {
      let sum = 0
      const n = area.points.length
      for (let i = 0; i < n; i++) {
        sum += area.points[i].x * area.points[(i + 1) % n].y - area.points[(i + 1) % n].x * area.points[i].y
      }
      const areaPix = Math.abs(sum) / 2
      return { ...area, areaReal: areaPix * Math.pow(scaleFactor, 2) }
    }))

    // Reset calibration placement state
    setTempCalibrationPoints([])
    setRealDistanceInput('')
    setCalibrationInputShow(false)
    setTool('navigate')
  }

  function handleSaveTakeoffs() {
    if (!id) return
    setSaving(true)
    const payload = {
      calibration,
      savedLines,
      savedAreas,
      savedTexts
    }
    localStorage.setItem(`quantification-${id}`, JSON.stringify(payload))
    setTimeout(() => {
      setSaving(false)
      alert('Medições de quantificação salvas localmente com sucesso!')
    }, 500)
  }

  const [saving, setSaving] = useState(false)

  // Clear all
  function handleClearAll() {
    if (confirm('Tem certeza que deseja apagar todas as medições desta prancha?')) {
      setSavedLines([])
      setSavedAreas([])
      setSavedTexts([])
      setCalibration(null)
      setActiveLinePoints([])
      setActiveAreaPoints([])
      setTempCalibrationPoints([])
      localStorage.removeItem(`quantification-${id}`)
    }
  }

  // Calculate totals
  const totalLength = useMemo(() => {
    return savedLines.reduce((sum, l) => sum + l.lengthReal, 0)
  }, [savedLines])

  const totalArea = useMemo(() => {
    return savedAreas.reduce((sum, a) => sum + a.areaReal, 0)
  }, [savedAreas])

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <DataSourceBadge usingMockData={false} />
        <div className="p-4 rounded-xl text-sm" style={{ background: '#EF444422', color: '#EF4444', border: '1px solid #EF444444' }}>
          {error}
        </div>
        <Button variant="ghost" onClick={() => navigate('/projetos')}>
          <ArrowLeft size={14} /> Voltar para Projetos
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => navigate('/projetos')}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--slate)' }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Ruler size={16} style={{ color: 'var(--orange)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--white)' }}>
              Módulo de Quantificação & Medições
            </span>
          </div>
          <div className="text-xs font-mono mt-0.5" style={{ color: 'var(--slate)' }}>
            {drawing?.code} · {drawing?.title}
          </div>
        </div>

        {/* Toolbar */}
        <div className="ml-auto flex items-center gap-1 bg-surface-mid rounded-lg p-1 border border-surface-border">
          <button
            onClick={() => { setTool('navigate'); setTempCalibrationPoints([]) }}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 ${
              tool === 'navigate' ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
            }`}
            style={{ color: tool === 'navigate' ? 'white' : 'var(--slate)' }}
            title="Pan & Zoom"
          >
            <Compass size={14} /> Navegar
          </button>
          <button
            onClick={() => { setTool('calibrate'); setTempCalibrationPoints([]) }}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 ${
              tool === 'calibrate' ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
            }`}
            style={{ color: tool === 'calibrate' ? 'white' : 'var(--slate)' }}
            title="Calibrar Escala"
          >
            <Maximize size={14} /> Calibrar
          </button>
          <button
            onClick={() => { setTool('linear'); setTempCalibrationPoints([]) }}
            disabled={!calibration}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 disabled:opacity-30 ${
              tool === 'linear' ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
            }`}
            style={{ color: tool === 'linear' ? 'white' : 'var(--slate)' }}
            title="Medir Comprimento Linhas"
          >
            <Ruler size={14} /> Rodapés / Linhas
          </button>
          <button
            onClick={() => { setTool('area'); setTempCalibrationPoints([]) }}
            disabled={!calibration}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 disabled:opacity-30 ${
              tool === 'area' ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
            }`}
            style={{ color: tool === 'area' ? 'white' : 'var(--slate)' }}
            title="Medir Áreas"
          >
            <Square size={14} /> Pisos / Áreas
          </button>
          <button
            onClick={() => { setTool('text'); setTempCalibrationPoints([]) }}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 ${
              tool === 'text' ? 'bg-orange-500 text-white' : 'hover:bg-white/10'
            }`}
            style={{ color: tool === 'text' ? 'white' : 'var(--slate)' }}
            title="Selecionar e extrair códigos de texto"
          >
            <Type size={14} /> Mapear Textos
          </button>
          
          <div className="h-4 w-px bg-slate-800 self-center mx-1" />
          
          <button
            onClick={() => { setSnapEnabled(!snapEnabled); setActiveSnapPoint(null) }}
            className={`p-1.5 rounded transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer ${
              snapEnabled ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40' : 'hover:bg-white/10'
            }`}
            style={{ color: snapEnabled ? '#22C55E' : 'var(--slate)' }}
            title="Snap CAD (Atrair para vértices de linhas do desenho)"
          >
            <Magnet size={14} /> Snap {snapEnabled ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={handleClearAll} style={{ color: '#EF4444' }}>
          <Trash2 size={14} /> Limpar
        </Button>
      </div>

      {/* Main Body Grid */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Hand: PDF Canvas Drawing Viewport */}
        <div
          ref={viewportRef}
          className={`flex-1 relative rounded-xl border overflow-hidden bg-[#0d1825] select-none ${
            isPanning || spacePressed ? 'cursor-grabbing' : tool === 'navigate' ? 'cursor-grab' : 'cursor-crosshair'
          }`}
          style={{ borderColor: 'var(--surface-border)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={(e) => {
            handleMouseUp(e)
            setActiveSnapPoint(null)
            setMousePos(null)
          }}
          onDoubleClick={handleDoubleClick}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="absolute inset-0 bg-[#0d1825]/85 flex flex-col items-center justify-center gap-3 z-30">
              <Loader2 className="animate-spin text-orange-500" size={32} />
              <span className="text-xs text-slate-400">Carregando prancha vetorial de alta definição...</span>
            </div>
          )}

          {renderedPage && (
            <div
              ref={containerRef}
              className="absolute origin-top-left"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isPanning ? 'none' : 'transform 0.08s ease-out',
              }}
            >
              {/* PDF Canvas */}
              <canvas ref={canvasRef} className="block w-full h-full shadow-2xl" />

              {/* SVG vector measurement overlays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* Visual Snap Cursor Indicator (Green CAD target square scaled for constant screen size) */}
                {snapEnabled && activeSnapPoint && (
                  <g>
                    <rect
                      x={activeSnapPoint.x - 6 / scale}
                      y={activeSnapPoint.y - 6 / scale}
                      width={12 / scale}
                      height={12 / scale}
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth={2 / scale}
                    />
                    <circle
                      cx={activeSnapPoint.x}
                      cy={activeSnapPoint.y}
                      r={1.5 / scale}
                      fill="#22C55E"
                    />
                  </g>
                )}

                {/* Rubber-band previews for interactive drawings */}
                {(() => {
                  const currentInteractivePt = (snapEnabled && activeSnapPoint) ? activeSnapPoint : mousePos
                  if (!currentInteractivePt) return null
                  return (
                    <>
                      {/* Temp calibration line rubber-band preview */}
                      {tool === 'calibrate' && tempCalibrationPoints.length === 1 && (
                        <line
                          x1={tempCalibrationPoints[0].x}
                          y1={tempCalibrationPoints[0].y}
                          x2={currentInteractivePt.x}
                          y2={currentInteractivePt.y}
                          stroke="#EF4444"
                          strokeWidth={2 / scale}
                          strokeDasharray={`${4 / scale} ${4 / scale}`}
                        />
                      )}
                      {/* Linear path drawing rubber-band preview */}
                      {tool === 'linear' && activeLinePoints.length > 0 && (
                        <line
                          x1={activeLinePoints[activeLinePoints.length - 1].x}
                          y1={activeLinePoints[activeLinePoints.length - 1].y}
                          x2={currentInteractivePt.x}
                          y2={currentInteractivePt.y}
                          stroke="#3B82F6"
                          strokeWidth={2 / scale}
                          strokeDasharray={`${4 / scale} ${4 / scale}`}
                        />
                      )}
                      {/* Area path drawing rubber-band preview */}
                      {tool === 'area' && activeAreaPoints.length > 0 && (
                        <>
                          {/* Segment to cursor */}
                          <line
                            x1={activeAreaPoints[activeAreaPoints.length - 1].x}
                            y1={activeAreaPoints[activeAreaPoints.length - 1].y}
                            x2={currentInteractivePt.x}
                            y2={currentInteractivePt.y}
                            stroke="#22C55E"
                            strokeWidth={2 / scale}
                            strokeDasharray={`${4 / scale} ${4 / scale}`}
                          />
                          {/* Closing segment to first point */}
                          <line
                            x1={currentInteractivePt.x}
                            y1={currentInteractivePt.y}
                            x2={activeAreaPoints[0].x}
                            y2={activeAreaPoints[0].y}
                            stroke="#22C55E"
                            strokeWidth={1.5 / scale}
                            strokeDasharray={`${2 / scale} ${4 / scale}`}
                            opacity="0.6"
                          />
                        </>
                      )}
                    </>
                  )
                })()}

                {/* 1. Scale Calibration lines */}
                {calibration && (
                  <>
                    <line
                      x1={calibration.pointA.x}
                      y1={calibration.pointA.y}
                      x2={calibration.pointB.x}
                      y2={calibration.pointB.y}
                      stroke="#EF4444"
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                    />
                    <circle cx={calibration.pointA.x} cy={calibration.pointA.y} r="5" fill="#EF4444" />
                    <circle cx={calibration.pointB.x} cy={calibration.pointB.y} r="5" fill="#EF4444" />
                  </>
                )}
                {/* Temp calibration line */}
                {tempCalibrationPoints.map((p, idx) => (
                  <circle key={idx} cx={p.x} cy={p.y} r="6" fill="#EF4444" className="animate-pulse" />
                ))}
                {tempCalibrationPoints.length === 2 && (
                  <line
                    x1={tempCalibrationPoints[0].x}
                    y1={tempCalibrationPoints[0].y}
                    x2={tempCalibrationPoints[1].x}
                    y2={tempCalibrationPoints[1].y}
                    stroke="#EF4444"
                    strokeWidth="2"
                  />
                )}

                {/* 2. Render Saved Linear Paths */}
                {savedLines.map(line => {
                  let pathStr = ''
                  line.points.forEach((p, idx) => {
                    pathStr += `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y} `
                  })
                  // Calculate midpoint for text label
                  const midIdx = Math.floor(line.points.length / 2)
                  const labelPt = line.points[midIdx]
                  return (
                    <g key={line.id}>
                      <path d={pathStr} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {line.points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#3B82F6" />
                      ))}
                      {labelPt && (
                        <text
                          x={labelPt.x}
                          y={labelPt.y - 8}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          className="bg-navy-dark px-1.5"
                          style={{ paintOrder: 'stroke', stroke: '#0d1825', strokeWidth: '3px' }}
                        >
                          {line.lengthReal.toFixed(2)} m
                        </text>
                      )}
                    </g>
                  )
                })}
                {/* Active line path */}
                {activeLinePoints.length > 0 && (
                  <g>
                    {activeLinePoints.map((p, idx) => (
                      <circle key={idx} cx={p.x} cy={p.y} r="4.5" fill="#3B82F6" className="animate-pulse" />
                    ))}
                    {activeLinePoints.map((p, idx) => {
                      if (idx === 0) return null
                      const prev = activeLinePoints[idx - 1]
                      return (
                        <line
                          key={idx}
                          x1={prev.x}
                          y1={prev.y}
                          x2={p.x}
                          y2={p.y}
                          stroke="#3B82F6"
                          strokeWidth="2.5"
                          strokeDasharray="2 2"
                        />
                      )
                    })}
                  </g>
                )}

                {/* 3. Render Saved Polygons (Areas) */}
                {savedAreas.map(area => {
                  let pointsStr = area.points.map(p => `${p.x},${p.y}`).join(' ')
                  // Calculate centroid for label
                  const centroid = area.points.reduce((acc, p) => {
                    acc.x += p.x / area.points.length
                    acc.y += p.y / area.points.length
                    return acc
                  }, { x: 0, y: 0 })
                  return (
                    <g key={area.id}>
                      <polygon points={pointsStr} fill="rgba(34, 197, 94, 0.18)" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" />
                      {area.points.map((p, idx) => (
                        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#22C55E" />
                      ))}
                      <text
                        x={centroid.x}
                        y={centroid.y}
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        style={{ paintOrder: 'stroke', stroke: '#0d1825', strokeWidth: '3px' }}
                      >
                        {area.areaReal.toFixed(2)} m²
                      </text>
                    </g>
                  )
                })}
                {/* Active area polygon */}
                {activeAreaPoints.length > 0 && (
                  <g>
                    {activeAreaPoints.map((p, idx) => (
                      <circle key={idx} cx={p.x} cy={p.y} r="4.5" fill="#22C55E" className="animate-pulse" />
                    ))}
                    {activeAreaPoints.map((p, idx) => {
                      if (idx === 0) return null
                      const prev = activeAreaPoints[idx - 1]
                      return (
                        <line
                          key={idx}
                          x1={prev.x}
                          y1={prev.y}
                          x2={p.x}
                          y2={p.y}
                          stroke="#22C55E"
                          strokeWidth="2.5"
                          strokeDasharray="2 2"
                        />
                      )
                    })}
                  </g>
                )}
              </svg>

              {/* Text select drag overlay */}
              {tool === 'text' && boxStart && boxCurrent && (
                <div
                  className="absolute border border-orange-500 bg-orange-500/10 pointer-events-none z-20"
                  style={{
                    left: `${Math.min(boxStart.x, boxCurrent.x)}px`,
                    top: `${Math.min(boxStart.y, boxCurrent.y)}px`,
                    width: `${Math.abs(boxCurrent.x - boxStart.x)}px`,
                    height: `${Math.abs(boxCurrent.y - boxStart.y)}px`
                  }}
                />
              )}

              {/* Render Saved Mapped Text Bounding Boxes */}
              {savedTexts.map(grp => (
                <div
                  key={grp.id}
                  className="absolute border border-dashed border-orange-500/40 bg-orange-500/5 pointer-events-none flex items-center justify-center text-[7px] text-orange-400 font-bold"
                  style={{
                    left: `${grp.bounds.xMin}px`,
                    top: `${grp.bounds.yMin}px`,
                    width: `${grp.bounds.xMax - grp.bounds.xMin}px`,
                    height: `${grp.bounds.yMax - grp.bounds.yMin}px`,
                  }}
                >
                  <span className="bg-[#0d1825] px-0.5 rounded whitespace-nowrap">{grp.label} ({grp.count}x)</span>
                </div>
              ))}
            </div>
          )}

          {/* Floating Instructions Banner */}
          {renderedPage && (
            <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none flex justify-center">
              <div className="bg-surface-mid border border-surface-border text-xs px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 max-w-md pointer-events-auto">
                <Info size={14} style={{ color: 'var(--orange)' }} />
                <span style={{ color: 'var(--slate)' }}>
                  {tool === 'navigate' && 'Navegue pelo desenho. Ctrl+Scroll para zoom.'}
                  {tool === 'calibrate' && (
                    tempCalibrationPoints.length === 0 ? 'Clique no ponto inicial de uma cota conhecida.' :
                    tempCalibrationPoints.length === 1 ? 'Clique no ponto final da cota conhecida.' :
                    'Defina o comprimento da cota para calibrar.'
                  )}
                  {tool === 'linear' && 'Clique nos cantos. Dê clique duplo no último ponto para finalizar a linha.'}
                  {tool === 'area' && 'Clique nos cantos do cômodo. Dê clique duplo no último ponto para calcular a área.'}
                  {tool === 'text' && 'Arraste uma caixa sobre textos da prancha (ex: PM2) para lê-los.'}
                </span>
              </div>
            </div>
          )}

          {/* Floating Calibration Input Modal overlay */}
          {calibrationInputShow && (
            <div className="absolute inset-0 bg-[#070e17]/80 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-auto">
              <Card className="p-5 max-w-sm space-y-4">
                <div className="text-sm font-semibold text-white">Calibração da Escala</div>
                <div className="text-xs" style={{ color: 'var(--slate)' }}>
                  Insira a dimensão real correspondente ao segmento demarcado na prancha (em metros).
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5.00 ou 1.20"
                  value={realDistanceInput}
                  onChange={e => setRealDistanceInput(e.target.value)}
                  className="w-full text-sm rounded px-3 py-2 outline-none"
                  style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'var(--white)' }}
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setCalibrationInputShow(false); setTempCalibrationPoints([]) }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={confirmCalibration}>
                    Confirmar
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Floating Zoom controls */}
          {renderedPage && (
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-surface-mid rounded-lg p-1 border border-surface-border">
              <button
                onClick={() => setScale(s => Math.max(s / 1.3, 0.25))}
                className="p-1 hover:bg-white/10 rounded"
                title="Zoom Out"
                style={{ color: 'var(--slate)' }}
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono px-1 w-12 text-center" style={{ color: 'var(--white)' }}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(s => Math.min(s * 1.3, 8))}
                className="p-1 hover:bg-white/10 rounded"
                title="Zoom In"
                style={{ color: 'var(--slate)' }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
                className="p-1 hover:bg-white/10 rounded text-[9px] font-semibold"
                style={{ color: 'var(--slate)' }}
              >
                1:1
              </button>
            </div>
          )}
        </div>

        {/* Right Hand: Sidebar Takeoffs List */}
        <div className="w-80 flex-shrink-0 flex flex-col space-y-4 overflow-y-auto">
          {/* Scale Status Card */}
          <Card className="p-4 space-y-2">
            <div className="text-xs font-semibold text-white">Calibração da Escala</div>
            {calibration ? (
              <div className="text-xs space-y-1" style={{ color: 'var(--slate)' }}>
                <div className="font-semibold text-green-400 flex items-center gap-1">
                  <Check size={12} /> Prancha Calibrada
                </div>
                <div>Cota: <span className="font-bold text-white font-mono">{calibration.realDistance.toFixed(2)} m</span></div>
                <div>Equivale a: <span className="font-mono">{Math.round(calibration.pixelDistance)} px</span></div>
                <div className="text-[10px] pt-1" style={{ borderTop: '1px solid var(--surface-border)' }}>
                  Fator: <span className="font-mono">{calibration.scaleFactor.toFixed(6)} m/px</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-yellow-400 space-y-2">
                <div>⚠️ Prancha sem calibração. Medições lineares e de áreas estarão indisponíveis.</div>
                <Button size="sm" variant="ghost" onClick={() => setTool('calibrate')} className="w-full text-center">
                  Calibrar Escala Agora
                </Button>
              </div>
            )}
          </Card>

          {/* Measurements List Card */}
          <Card className="p-4 flex-1 flex flex-col space-y-3 min-h-0">
            <div className="text-xs font-semibold text-white flex-shrink-0">Lista de Medições</div>

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs" style={{ color: 'var(--slate)' }}>
              {/* Lines segment */}
              {savedLines.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-semibold text-white" style={{ color: 'var(--slate)' }}>Caminhos Lineares ({savedLines.length})</div>
                  {savedLines.map((line, idx) => (
                    <div key={line.id} className="flex items-center justify-between p-2 rounded bg-surface-mid border border-surface-border">
                      <span className="font-semibold">Linha #{idx + 1}</span>
                      <span className="font-mono text-white font-bold">{line.lengthReal.toFixed(2)} m</span>
                      <button
                        onClick={() => setSavedLines(prev => prev.filter(l => l.id !== line.id))}
                        className="p-0.5 hover:bg-white/10 rounded text-red-500 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Areas segment */}
              {savedAreas.length > 0 && (
                <div className="space-y-1.5 pt-2" style={{ borderTop: savedLines.length > 0 ? '1px solid var(--surface-border)' : 'none' }}>
                  <div className="font-semibold text-white" style={{ color: 'var(--slate)' }}>Polígonos de Áreas ({savedAreas.length})</div>
                  {savedAreas.map((area, idx) => (
                    <div key={area.id} className="flex items-center justify-between p-2 rounded bg-surface-mid border border-surface-border">
                      <span className="font-semibold">Área #{idx + 1}</span>
                      <span className="font-mono text-white font-bold">{area.areaReal.toFixed(2)} m²</span>
                      <button
                        onClick={() => setSavedAreas(prev => prev.filter(a => a.id !== area.id))}
                        className="p-0.5 hover:bg-white/10 rounded text-red-500 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Extracted Texts segment */}
              {savedTexts.length > 0 && (
                <div className="space-y-1.5 pt-2" style={{ borderTop: savedLines.length > 0 || savedAreas.length > 0 ? '1px solid var(--surface-border)' : 'none' }}>
                  <div className="font-semibold text-white" style={{ color: 'var(--slate)' }}>Elementos Mapeados ({savedTexts.length})</div>
                  {savedTexts.map((grp) => (
                    <div key={grp.id} className="flex items-center justify-between p-2 rounded bg-surface-mid border border-surface-border">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-orange-400">{grp.label}</span>
                        <span className="text-[9px] text-slate-400">{grp.count} detectados na caixa</span>
                      </div>
                      <span className="font-bold text-white font-mono">{grp.count} un</span>
                      <button
                        onClick={() => setSavedTexts(prev => prev.filter(t => t.id !== grp.id))}
                        className="p-0.5 hover:bg-white/10 rounded text-red-500 ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {savedLines.length === 0 && savedAreas.length === 0 && savedTexts.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic">
                  Nenhuma medição realizada nesta prancha.
                </div>
              )}
            </div>

            {/* Totals Summary */}
            {(savedLines.length > 0 || savedAreas.length > 0) && (
              <div className="p-3 rounded-lg space-y-1.5 flex-shrink-0"
                style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)' }}>
                <div className="text-[10px] font-semibold uppercase text-slate-400">Resumo de Quantitativos</div>
                {savedLines.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Comp. Total:</span>
                    <span className="font-mono text-white font-bold">{totalLength.toFixed(2)} m</span>
                  </div>
                )}
                {savedAreas.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Área Total:</span>
                    <span className="font-mono text-white font-bold">{totalArea.toFixed(2)} m²</span>
                  </div>
                )}
              </div>
            )}

            {/* Save action */}
            <Button
              size="sm"
              onClick={handleSaveTakeoffs}
              disabled={saving}
              className="w-full text-center flex-shrink-0 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar Medições
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
