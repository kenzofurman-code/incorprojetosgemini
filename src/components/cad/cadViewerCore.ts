/**
 * cadViewerCore.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Módulo de inicialização e controle do visualizador DWG/DXF.
 *
 * ESCOPO: apenas lógica e inicialização do canvas — sem JSX, sem layout,
 * sem estilos do projeto. Expõe uma API imperativa simples que o componente
 * React (CADViewer.tsx) ou qualquer outro consumer pode chamar.
 *
 * Dependência: @mlightcad/cad-simple-viewer (MIT, framework-agnostic)
 * Workers necessários em /public/cad-workers/ (copiados automaticamente
 * durante o setup — veja vite.config.ts ou o script copy-workers).
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  AcApDocManager,
  AcEdOpenMode,
  type AcApDocManagerOptions,
  type AcApWebworkerFiles,
} from '@mlightcad/cad-simple-viewer'

// ─── Worker URLs ──────────────────────────────────────────────────────────────
// Os três workers precisam estar acessíveis via URL pública.
// No Vite, arquivos em /public são servidos na raiz — daí o prefixo /cad-workers/.
// Em produção (Vercel) esses arquivos ficam no CDN automaticamente.
const WORKER_URLS: AcApWebworkerFiles = {
  dxfParser:   new URL('/cad-workers/dxf-parser-worker.js',    import.meta.url),
  dwgParser:   new URL('/cad-workers/libredwg-parser-worker.js', import.meta.url),
  mtextRender: new URL('/cad-workers/mtext-renderer-worker.js', import.meta.url),
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Coordenadas locais do canvas retornadas no evento de clique. */
export interface CADCanvasClickEvent {
  /** X em pixels relativos ao canto superior-esquerdo do canvas */
  screenX: number
  /** Y em pixels relativos ao canto superior-esquerdo do canvas */
  screenY: number
  /** X no espaço de coordenadas do modelo CAD */
  worldX: number
  /** Y no espaço de coordenadas do modelo CAD */
  worldY: number
  /** Evento DOM original, útil para detectar modificadores (shift, ctrl) */
  originalEvent: MouseEvent
}

export type CADClickHandler = (event: CADCanvasClickEvent) => void

export interface CADViewerInstance {
  /** Carrega um ArrayBuffer de arquivo DWG ou DXF */
  loadFile: (fileName: string, buffer: ArrayBuffer) => Promise<boolean>
  /** Ativa o modo Pan (arrastar para mover) */
  setPan: () => void
  /** Ativa o modo Zoom window (clicar para zoom retangular) */
  setZoom: () => void
  /** Zoom para encaixar todo o desenho no canvas */
  zoomToFit: () => void
  /** Zoom in passo a passo */
  zoomIn: () => void
  /** Zoom out passo a passo */
  zoomOut: () => void
  /** Registra um handler para cliques no canvas */
  onClick: (handler: CADClickHandler) => () => void
  /** Força um redimensionamento do canvas para o tamanho atual do container */
  resize: () => void
  /** Destrói o viewer e libera todos os recursos */
  dispose: () => void
  /** Referência ao AcApDocManager, para acesso avançado quando necessário */
  manager: AcApDocManager
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export interface CADViewerInitOptions {
  /** Elemento HTML que vai conter o canvas WebGL */
  container: HTMLElement
  /**
   * Cor de fundo em hexadecimal numérico.
   * @default 0x1C2B3A  (surface-card do design system do IncorProjetos)
   */
  background?: number
  /**
   * Se true, o canvas redimensiona automaticamente quando o container muda.
   * @default true
   */
  autoResize?: boolean
  /**
   * URL base para carregar fontes e templates do viewer.
   * Se omitida, usa a URL pública padrão do pacote.
   */
  baseUrl?: string
}

/**
 * Inicializa o visualizador CAD no container informado.
 *
 * @example
 * ```ts
 * const viewer = await initCADViewer({ container: divRef.current! })
 * viewer.loadFile('planta.dwg', arrayBuffer)
 * viewer.onClick(({ screenX, screenY, worldX, worldY }) => {
 *   console.log('Clique em tela:', screenX, screenY)
 *   console.log('Coordenadas CAD:', worldX, worldY)
 * })
 * ```
 */
export async function initCADViewer(opts: CADViewerInitOptions): Promise<CADViewerInstance> {
  const {
    container,
    background = 0x1c2b3a,
    autoResize = true,
  } = opts

  // ── 1. Verificar que os workers estão acessíveis antes de criar o manager ──
  // HEAD request leve (não baixa o worker de 13MB desnecessariamente)
  const workersOk = await AcApDocManager.checkWebworkerReadiness(WORKER_URLS)
  if (!workersOk) {
    throw new Error(
      '[CADViewer] Workers não encontrados em /cad-workers/. ' +
      'Verifique se os arquivos estão na pasta public/cad-workers/ e que o Vite está servindo-os.'
    )
  }

  // ── 2. Criar o manager (singleton que controla o ciclo de vida do documento) ─
  const managerOptions: AcApDocManagerOptions = {
    container,
    autoResize,
    webworkerFileUrls: WORKER_URLS,
    // Não instalamos o diálogo de abertura embutido — o controle de arquivo
    // fica no nosso próprio FileReader / input[type=file]
    builtinOpenFileDialog: false,
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const manager = AcApDocManager.createInstance(managerOptions)!
  if (!manager) {
    throw new Error('[CADViewer] AcApDocManager.createInstance() retornou undefined.')
  }

  // ── 3. Aplicar cor de fundo ao canvas ───────────────────────────────────────
  // O canvas é adicionado ao container pelo manager; esperamos um tick para
  // que ele esteja no DOM antes de acessar o curView.
  await nextTick()
  const view = manager.curView
  if (view) {
    // background é uma sysvar interna; acesso via canvas style é mais seguro
    // para o caso de o sysvar name mudar entre versões
    if (view.canvas) {
      view.canvas.style.background = `#${background.toString(16).padStart(6, '0')}`
    }
  }

  // ── 4. Click handler com conversão screen → world ──────────────────────────
  // Usamos um Set de handlers para suportar múltiplos registros
  const clickHandlers = new Set<CADClickHandler>()

  function handleCanvasClick(e: MouseEvent) {
    const canvas = manager.curView?.canvas
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    // Converte coordenadas de tela para o sistema de coordenadas do modelo CAD
    let worldX = screenX
    let worldY = screenY
    const currentView = manager.curView
    if (currentView?.screenToWorld) {
      try {
        const world = currentView.screenToWorld({ x: screenX, y: screenY })
        worldX = world.x
        worldY = world.y
      } catch {
        // screenToWorld pode falhar antes do documento estar carregado — silencia
      }
    }

    const event: CADCanvasClickEvent = { screenX, screenY, worldX, worldY, originalEvent: e }
    clickHandlers.forEach(h => h(event))
  }

  // Registra no container em vez do canvas para capturar mesmo antes de carregar arquivo
  container.addEventListener('click', handleCanvasClick)

  // ── 5. Scroll para zoom (nativo do viewer via sendStringToExecute não tem
  //     scroll binding fácil; usamos wheel event para chamar zoom step) ────────
  function handleWheel(e: WheelEvent) {
    e.preventDefault()
    // Zoom in/out: delta negativo = zoom in (scroll pra cima)
    const cmd = e.deltaY < 0 ? 'zoomin' : 'zoomout'
    try {
      manager.sendStringToExecute(cmd)
    } catch {
      // silencia se não houver documento carregado
    }
  }
  container.addEventListener('wheel', handleWheel, { passive: false })

  // ── 6. API pública ────────────────────────────────────────────────────────

  async function loadFile(fileName: string, buffer: ArrayBuffer): Promise<boolean> {
    // Extract original extension (.dwg or .dxf)
    const isDxf = fileName.toLowerCase().endsWith('.dxf')
    const virtualFileName = isDxf ? 'model.dxf' : 'model.dwg'

    const doc = manager.curDocument
    let lastError: string | null = null

    const handleProgress = (args: any) => {
      console.log(`[CADProgress] Stage: ${args.stage}, SubStage: ${args.subStage}, Status: ${args.subStageStatus}, %: ${args.percentage}, Data:`, args.data)
      if (args.subStageStatus === 'ERROR') {
        lastError = args.data || 'Erro interno desconhecido na decodificação do desenho.'
      }
    }

    // Register progress listener to capture internal errors
    if (doc?.database?.events?.openProgress?.addEventListener) {
      doc.database.events.openProgress.addEventListener(handleProgress)
    }

    try {
      // Pass a safe ASCII virtual name to bypass Emscripten/LibreDWG WASM filesystem 
      // crashes on accented or special unicode characters (like Á, É, Ç)
      const success = await manager.openDocument(virtualFileName, buffer, {
        mode: AcEdOpenMode.Read,
        progressiveRendering: true,
      })

      if (!success && lastError) {
        throw new Error(lastError)
      }
      return success
    } finally {
      // Always cleanup event listener
      if (doc?.database?.events?.openProgress?.removeEventListener) {
        doc.database.events.openProgress.removeEventListener(handleProgress)
      }
    }
  }

  function setPan() {
    try { manager.sendStringToExecute('pan') } catch { /* nenhum doc ainda */ }
  }

  function setZoom() {
    try { manager.sendStringToExecute('zoom') } catch { /* nenhum doc ainda */ }
  }

  function zoomToFit() {
    try { manager.sendStringToExecute('zoom e') } catch { /* nenhum doc ainda */ }
  }

  function zoomIn() {
    try { manager.sendStringToExecute('zoomin') } catch { /* nenhum doc ainda */ }
  }

  function zoomOut() {
    try { manager.sendStringToExecute('zoomout') } catch { /* nenhum doc ainda */ }
  }

  function onClick(handler: CADClickHandler): () => void {
    clickHandlers.add(handler)
    return () => clickHandlers.delete(handler)   // retorna cleanup function
  }

  function resize() {
    // autoResize: true já cuida do redimensionamento via ResizeObserver interno.
    // Este método existe para compatibilidade com a interface pública; é no-op
    // quando autoResize está ativo, mas pode ser usado para forçar um redraw.
    try {
      const view = manager.curView
      if (view) view.isDirty = true
    } catch { /* silencia */ }
  }

  function dispose() {
    container.removeEventListener('click', handleCanvasClick)
    container.removeEventListener('wheel', handleWheel)
    clickHandlers.clear()
    try { manager.destroy?.() } catch { /* silencia */ }
  }

  return { loadFile, setPan, setZoom, zoomToFit, zoomIn, zoomOut, onClick, resize, dispose, manager }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextTick(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}
