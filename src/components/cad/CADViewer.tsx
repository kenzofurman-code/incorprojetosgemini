/**
 * CADViewer.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Wrapper React modular sobre cadViewerCore.ts.
 *
 * Responsabilidades deste componente:
 *  - Gerenciar o ciclo de vida do viewer (init / dispose) via useEffect
 *  - Expor via ref imperativa (useImperativeHandle) os métodos do core
 *  - Tratar o FileReader para converter File → ArrayBuffer e passar ao core
 *  - Não possuir nem redefinir nenhum layout ou estilo do projeto pai
 *
 * O componente pai é responsável por definir o tamanho do container
 * (width/height, flex, etc.). Este componente preenche 100% do espaço
 * que receber.
 *
 * Uso:
 * ```tsx
 * const ref = useRef<CADViewerHandle>(null)
 *
 * <CADViewer
 *   ref={ref}
 *   onFileLoaded={(name) => console.log('carregou', name)}
 *   onCanvasClick={({ screenX, screenY, worldX, worldY }) => {
 *     // screenX/Y: pixel no canvas; worldX/Y: coordenada do modelo CAD
 *   }}
 * />
 *
 * // Controles externos (botões da toolbar do projeto pai):
 * ref.current?.setPan()
 * ref.current?.setZoom()
 * ref.current?.zoomToFit()
 * ref.current?.loadFile(file)   // File do input ou drag-and-drop
 * ```
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
  useCallback,
} from 'react'
import {
  initCADViewer,
  type CADViewerInstance,
  type CADCanvasClickEvent,
} from './cadViewerCore'

// ─── Public handle (exposto via ref ao componente pai) ───────────────────────

export interface CADViewerHandle {
  /** Carrega um File DWG ou DXF via FileReader → ArrayBuffer */
  loadFile: (file: File) => Promise<boolean>
  setPan: () => void
  setZoom: () => void
  zoomToFit: () => void
  zoomIn: () => void
  zoomOut: () => void
  /** Acesso direto ao AcApDocManager para uso avançado */
  getManager: () => CADViewerInstance['manager'] | null
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CADViewerProps {
  /**
   * Chamado quando um arquivo termina de carregar com sucesso.
   * Recebe o nome do arquivo.
   */
  onFileLoaded?: (fileName: string) => void
  /**
   * Chamado quando o usuário clica no canvas.
   * Recebe coordenadas de tela (pixels) e do modelo CAD.
   */
  onCanvasClick?: (event: CADCanvasClickEvent) => void
  /**
   * Chamado quando o carregamento de arquivo falha.
   */
  onLoadError?: (error: Error, fileName: string) => void
  /**
   * Cor de fundo do canvas em hexadecimal numérico.
   * @default 0x1C2B3A
   */
  background?: number
  /**
   * className aplicado ao div container do canvas.
   * Use isso para posicionar/dimensionar o viewer.
   * @default 'w-full h-full'
   */
  containerClassName?: string
}

// ─── Component ───────────────────────────────────────────────────────────────

const CADViewer = forwardRef<CADViewerHandle, CADViewerProps>(function CADViewer(
  {
    onFileLoaded,
    onCanvasClick,
    onLoadError,
    background = 0x1c2b3a,
    containerClassName = 'w-full h-full',
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<CADViewerInstance | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  // ── Inicializa o core viewer após o mount ─────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let unsubscribeClick: (() => void) | null = null

    initCADViewer({ container: containerRef.current, background })
      .then(viewer => {
        if (disposed) {
          viewer.dispose()
          return
        }
        viewerRef.current = viewer

        // Conecta o handler de clique ao callback prop
        if (onCanvasClick) {
          unsubscribeClick = viewer.onClick(onCanvasClick)
        }
      })
      .catch(err => {
        if (!disposed) {
          console.error('[CADViewer] Falha na inicialização:', err)
          setInitError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      disposed = true
      unsubscribeClick?.()
      viewerRef.current?.dispose()
      viewerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // ^ background e onCanvasClick intencionalmente não são deps:
  //   o viewer é inicializado uma vez; mudanças de prop não recriam o canvas.
  //   Para onCanvasClick, usamos a versão mais recente via closure abaixo.

  // Mantém o handler de clique atualizado sem reinicializar o viewer
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    const unsub = viewer.onClick(e => onCanvasClick?.(e))
    return unsub
  }, [onCanvasClick])

  // ── loadFile: FileReader → ArrayBuffer → cadViewerCore.loadFile ──────────
  const loadFile = useCallback(async (file: File): Promise<boolean> => {
    const viewer = viewerRef.current
    if (!viewer) {
      const err = new Error('[CADViewer] Viewer ainda não inicializado.')
      onLoadError?.(err, file.name)
      return false
    }

    return new Promise<boolean>((resolve) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer
        if (!buffer) {
          const err = new Error('FileReader retornou resultado vazio.')
          onLoadError?.(err, file.name)
          resolve(false)
          return
        }

        try {
          const success = await viewer.loadFile(file.name, buffer)
          if (success) {
            onFileLoaded?.(file.name)
          } else {
            const err = new Error(`O viewer não conseguiu abrir "${file.name}". Verifique se é um arquivo DWG ou DXF válido.`)
            onLoadError?.(err, file.name)
          }
          resolve(success)
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))
          onLoadError?.(error, file.name)
          resolve(false)
        }
      }

      reader.onerror = () => {
        const err = new Error(`Falha ao ler o arquivo "${file.name}" com FileReader.`)
        onLoadError?.(err, file.name)
        resolve(false)
      }

      // Lê o arquivo como ArrayBuffer — formato que o cad-simple-viewer espera
      reader.readAsArrayBuffer(file)
    })
  }, [onFileLoaded, onLoadError])

  // ── Imperativo handle exposto via ref ao pai ──────────────────────────────
  useImperativeHandle(ref, () => ({
    loadFile,
    setPan:     () => viewerRef.current?.setPan(),
    setZoom:    () => viewerRef.current?.setZoom(),
    zoomToFit:  () => viewerRef.current?.zoomToFit(),
    zoomIn:     () => viewerRef.current?.zoomIn(),
    zoomOut:    () => viewerRef.current?.zoomOut(),
    getManager: () => viewerRef.current?.manager ?? null,
  }), [loadFile])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className={containerClassName} style={{ position: 'relative' }}>
      {initError && (
        // Slot de erro minimalista — o pai pode sobrescrever via CSS se quiser
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#EF4444',
            pointerEvents: 'none',
          }}
        >
          {initError}
        </div>
      )}
    </div>
  )
})

export default CADViewer
