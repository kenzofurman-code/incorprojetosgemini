import * as pdfjsLib from 'pdfjs-dist'

// Set worker source using unpkg CDN to avoid local bundling errors
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

const documents = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

function loadDocument(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
  const existing = documents.get(url)
  if (existing) return existing
  const loading = pdfjsLib.getDocument({ url }).promise
  documents.set(url, loading)
  return loading
}

export interface RenderedPdfPage {
  canvas: HTMLCanvasElement
  pageCount: number
  textItemsRemoved: number
}

export async function renderPdfPage(url: string, pageNumber: number, hideText: boolean): Promise<RenderedPdfPage> {
  const pdf = await loadDocument(url)
  const safePage = Math.min(Math.max(pageNumber, 1), pdf.numPages)
  const page = await pdf.getPage(safePage)
  const viewport = page.getViewport({ scale: 2.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas não disponível neste navegador.')

  await page.render({ canvas, canvasContext: context, viewport }).promise

  let textItemsRemoved = 0
  if (hideText) {
    const textContent = await page.getTextContent()
    context.save()
    context.fillStyle = '#ffffff'
    for (const rawItem of textContent.items) {
      if (!('transform' in rawItem) || !('width' in rawItem)) continue
      // Use Util.transform from pdfjsLib if available, else standard fallback
      let transform = rawItem.transform
      if (pdfjsLib.Util?.transform) {
        transform = pdfjsLib.Util.transform(viewport.transform, rawItem.transform)
      } else {
        // Fallback standard transformation matrix multiplication
        const m = viewport.transform
        const t = rawItem.transform
        transform = [
          m[0] * t[0] + m[2] * t[1],
          m[1] * t[0] + m[3] * t[1],
          m[0] * t[2] + m[2] * t[3],
          m[1] * t[2] + m[3] * t[3],
          m[0] * t[4] + m[2] * t[5] + m[4],
          m[1] * t[4] + m[3] * t[5] + m[5]
        ]
      }
      const height = Math.max(2, Math.hypot(transform[2], transform[3]))
      const width = Math.max(2, rawItem.width * viewport.scale)
      context.fillRect(transform[4] - 1, transform[5] - height * 1.05, width + 2, height * 1.25)
      textItemsRemoved += 1
    }
    context.restore()
  }

  return { canvas, pageCount: pdf.numPages, textItemsRemoved }
}

export function tintDrawing(source: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const output = document.createElement('canvas')
  output.width = source.width
  output.height = source.height
  const context = output.getContext('2d')
  const sourceContext = source.getContext('2d', { willReadFrequently: true })
  if (!context || !sourceContext) return source

  const sourceData = sourceContext.getImageData(0, 0, source.width, source.height)
  const outputData = context.createImageData(source.width, source.height)
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)

  for (let index = 0; index < sourceData.data.length; index += 4) {
    const luminance =
      sourceData.data[index] * 0.2126 +
      sourceData.data[index + 1] * 0.7152 +
      sourceData.data[index + 2] * 0.0722
    const ink = Math.max(0, Math.min(255, (245 - luminance) * 2.2))
    outputData.data[index] = red
    outputData.data[index + 1] = green
    outputData.data[index + 2] = blue
    outputData.data[index + 3] = ink
  }
  context.putImageData(outputData, 0, 0)
  return output
}

export function createDifferenceCanvas(first: HTMLCanvasElement, second: HTMLCanvasElement, threshold: number): HTMLCanvasElement {
  const width = Math.max(first.width, second.width)
  const height = Math.max(first.height, second.height)
  const normalized = [first, second].map((source) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(source, 0, 0, width, height)
    return context.getImageData(0, 0, width, height)
  })

  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const context = output.getContext('2d')!
  const result = context.createImageData(width, height)
  for (let index = 0; index < result.data.length; index += 4) {
    const firstLuminance = (normalized[0].data[index] + normalized[0].data[index + 1] + normalized[0].data[index + 2]) / 3
    const secondLuminance = (normalized[1].data[index] + normalized[1].data[index + 1] + normalized[1].data[index + 2]) / 3
    const difference = Math.abs(firstLuminance - secondLuminance)
    const base = Math.round((firstLuminance + secondLuminance) / 2)
    if (difference >= threshold) {
      result.data[index] = 239
      result.data[index + 1] = 68
      result.data[index + 2] = 68
      result.data[index + 3] = Math.min(255, 130 + difference)
    } else {
      result.data[index] = base
      result.data[index + 1] = base
      result.data[index + 2] = base
      result.data[index + 3] = 90
    }
  }
  context.putImageData(result, 0, 0)
  return output
}
