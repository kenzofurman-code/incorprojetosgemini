/**
 * BIMPropertiesDrawer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Painel Lateral Retrátil de Propriedades, Metadados (Psets) e
 * Quantitativos da Seleção (BIM Quantity Takeoff / QTO).
 * Suporta inspeção individual e resumo acumulado de multi-seleção com exportação CSV.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from 'react'
import {
  X, Box, Eye, EyeOff, Focus, Copy, Download,
  Check, Hash, Ruler, Sparkles, Layers, FileSpreadsheet, Search
} from 'lucide-react'

export interface SelectedBIMElement {
  modelId: string
  expressId: number // localId
  category: string
  name: string
  guid?: string
  storey?: string
  dimensions?: {
    length?: number
    width?: number
    height?: number
    area?: number
    volume?: number
  }
  psets?: Array<{
    name: string
    properties: Array<{ name: string; value: string | number | boolean }>
  }>
}

interface BIMPropertiesDrawerProps {
  selectedElements: SelectedBIMElement[]
  onClose: () => void
  onIsolate: (elements: SelectedBIMElement[]) => void
  onHide: (elements: SelectedBIMElement[]) => void
  onFocus: (elements: SelectedBIMElement[]) => void
  onClearSelection: () => void
}

export default function BIMPropertiesDrawer({
  selectedElements,
  onClose,
  onIsolate,
  onHide,
  onFocus,
  onClearSelection,
}: BIMPropertiesDrawerProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'qto'>('properties')
  const [searchPset, setSearchPset] = useState('')
  const [copied, setCopied] = useState(false)

  const isMulti = selectedElements.length > 1
  const singleElement = selectedElements[0]

  // ─── Cálculos Acumulados de Quantitativos (QTO) ──────────────────────────────
  const qtoSummary = useMemo(() => {
    let totalVolume = 0
    let totalArea = 0
    let totalLength = 0
    const categoriesCount: Record<string, number> = {}

    selectedElements.forEach(el => {
      // Contagem por categoria
      categoriesCount[el.category] = (categoriesCount[el.category] || 0) + 1

      if (el.dimensions) {
        if (typeof el.dimensions.volume === 'number' && !isNaN(el.dimensions.volume)) {
          totalVolume += el.dimensions.volume
        }
        if (typeof el.dimensions.area === 'number' && !isNaN(el.dimensions.area)) {
          totalArea += el.dimensions.area
        }
        if (typeof el.dimensions.length === 'number' && !isNaN(el.dimensions.length)) {
          totalLength += el.dimensions.length
        }
      }
    })

    return {
      totalCount: selectedElements.length,
      totalVolume,
      totalArea,
      totalLength,
      categoriesCount,
    }
  }, [selectedElements])

  // ─── Exportar para CSV ───────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (selectedElements.length === 0) return

    const headers = ['ID', 'Categoria', 'Nome', 'Pavimento', 'Volume (m³)', 'Área (m²)', 'Comprimento (m)', 'GUID']
    const rows = selectedElements.map(el => [
      el.expressId,
      `"${el.category}"`,
      `"${el.name.replace(/"/g, '""')}"`,
      `"${el.storey || '-'}"`,
      el.dimensions?.volume ? el.dimensions.volume.toFixed(4) : '-',
      el.dimensions?.area ? el.dimensions.area.toFixed(3) : '-',
      el.dimensions?.length ? el.dimensions.length.toFixed(3) : '-',
      el.guid || '-',
    ])

    // Adiciona linha de totalização
    rows.push([
      'TOTAL',
      `"${selectedElements.length} itens"`,
      '-',
      '-',
      qtoSummary.totalVolume > 0 ? qtoSummary.totalVolume.toFixed(4) : '-',
      qtoSummary.totalArea > 0 ? qtoSummary.totalArea.toFixed(3) : '-',
      qtoSummary.totalLength > 0 ? qtoSummary.totalLength.toFixed(3) : '-',
      '-',
    ])

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `bim-quantitativos-selecao-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ─── Copiar Tabela de Quantitativos ──────────────────────────────────────────
  const copyToClipboard = () => {
    const textLines = selectedElements.map(
      el => `${el.expressId}\t${el.category}\t${el.name}\t${el.dimensions?.volume?.toFixed(3) || '-'} m³\t${el.dimensions?.area?.toFixed(2) || '-'} m²`
    )
    const content = `ID\tCategoria\tNome\tVolume\tÁrea\n${textLines.join('\n')}\nTOTAL:\t${selectedElements.length} itens\tVolume Total: ${qtoSummary.totalVolume.toFixed(3)} m³`
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (selectedElements.length === 0) {
    return (
      <div
        className="absolute top-3 right-3 bottom-3 w-80 lg:w-96 rounded-2xl z-30 flex flex-col shadow-2xl overflow-hidden border border-slate-700/60"
        style={{
          background: 'rgba(15, 25, 35, 0.95)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet size={16} className="text-orange-400 flex-shrink-0" />
            <span className="text-xs font-bold text-white">Extração & Quantitativos (QTO)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <FileSpreadsheet size={24} />
          </div>
          <div className="text-sm font-bold text-white">Nenhum elemento selecionado</div>
          <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Clique em qualquer peça 3D no modelo para inspecionar suas propriedades, dimensões e Psets.
            <br /><br />
            💡 <strong>Quantitativos (QTO):</strong> Segure <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-white">Shift</kbd> e clique em várias peças para somar automaticamente seus <strong>volumes (m³)</strong>, áreas e comprimentos.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute top-3 right-3 bottom-3 w-80 lg:w-96 rounded-2xl z-30 flex flex-col shadow-2xl overflow-hidden border border-slate-700/60"
      style={{
        background: 'rgba(15, 25, 35, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 min-w-0">
          <Box size={16} className="text-orange-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white truncate">
            {isMulti ? `${selectedElements.length} Elementos Selecionados` : singleElement?.name || 'Elemento BIM'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === 'properties'
              ? 'border-orange-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers size={13} />
          Propriedades
        </button>
        <button
          onClick={() => setActiveTab('qto')}
          className={`flex-1 py-2 px-3 flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === 'qto'
              ? 'border-orange-500 text-white bg-white/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet size={13} />
          Quantitativos (QTO)
          {isMulti && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500 text-white font-mono">
              {selectedElements.length}
            </span>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Quick Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onIsolate(selectedElements)}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Isolar elementos selecionados"
          >
            <Eye size={13} className="text-emerald-400" />
            <span>Isolar</span>
          </button>
          <button
            onClick={() => onHide(selectedElements)}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Ocultar elementos selecionados"
          >
            <EyeOff size={13} className="text-amber-400" />
            <span>Ocultar</span>
          </button>
          <button
            onClick={() => onFocus(selectedElements)}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Focar câmera na seleção"
          >
            <Focus size={13} className="text-blue-400" />
            <span>Focar</span>
          </button>
        </div>

        {/* ── TAB: PROPRIEDADES ── */}
        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Identity Info */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Categoria IFC:</span>
                <span className="font-mono text-orange-400 font-bold">{singleElement?.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ID / ExpressId:</span>
                <span className="font-mono text-white">#{singleElement?.expressId}</span>
              </div>
              {singleElement?.storey && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Pavimento:</span>
                  <span className="text-slate-200">{singleElement.storey}</span>
                </div>
              )}
              {singleElement?.guid && (
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">GUID:</span>
                  <span className="font-mono text-slate-400 truncate max-w-[170px]" title={singleElement.guid}>
                    {singleElement.guid}
                  </span>
                </div>
              )}
            </div>

            {/* Dimensions */}
            {singleElement?.dimensions && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Ruler size={13} className="text-orange-400" /> Dimensões do Elemento
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-300">
                  {typeof singleElement.dimensions.length === 'number' && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">Comprimento</span>
                      <span className="font-mono font-semibold">{singleElement.dimensions.length.toFixed(2)} m</span>
                    </div>
                  )}
                  {typeof singleElement.dimensions.height === 'number' && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">Altura</span>
                      <span className="font-mono font-semibold">{singleElement.dimensions.height.toFixed(2)} m</span>
                    </div>
                  )}
                  {typeof singleElement.dimensions.area === 'number' && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">Área</span>
                      <span className="font-mono font-semibold">{singleElement.dimensions.area.toFixed(2)} m²</span>
                    </div>
                  )}
                  {typeof singleElement.dimensions.volume === 'number' && (
                    <div>
                      <span className="text-slate-500 block text-[10px]">Volume</span>
                      <span className="font-mono font-semibold text-emerald-400">{singleElement.dimensions.volume.toFixed(3)} m³</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Psets (Property Sets) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Conjuntos de Propriedades (Psets)</span>
              </div>

              {/* Search Pset */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar propriedade..."
                  value={searchPset}
                  onChange={e => setSearchPset(e.target.value)}
                  className="w-full pl-7 pr-3 py-1 text-xs rounded-lg outline-none bg-slate-900 border border-slate-800 text-white"
                />
              </div>

              {singleElement?.psets && singleElement.psets.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {singleElement.psets.map((pset, pIdx) => {
                    const filteredProps = pset.properties.filter(
                      p => !searchPset || p.name.toLowerCase().includes(searchPset.toLowerCase()) || String(p.value).toLowerCase().includes(searchPset.toLowerCase())
                    )
                    if (filteredProps.length === 0) return null

                    return (
                      <div key={pIdx} className="rounded-lg bg-slate-900/80 border border-slate-800/80 overflow-hidden">
                        <div className="px-2.5 py-1.5 font-bold text-slate-400 bg-slate-950/50 text-[11px] border-b border-slate-800/50">
                          {pset.name}
                        </div>
                        <div className="p-2 space-y-1.5">
                          {filteredProps.map((prop, propIdx) => (
                            <div key={propIdx} className="flex justify-between items-start gap-2">
                              <span className="text-slate-400 text-[11px]">{prop.name}:</span>
                              <span className="font-mono text-white text-[11px] text-right break-all">
                                {String(prop.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500 text-[11px]">
                  Nenhum Pset adicional encontrado para esta peça.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: QUANTITATIVOS (QTO) ── */}
        {activeTab === 'qto' && (
          <div className="space-y-4">
            {/* Summary Highlights */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <span className="text-[10px] text-slate-400 block font-medium">Volume Acumulado</span>
                <span className="text-base font-bold font-mono">
                  {qtoSummary.totalVolume > 0 ? `${qtoSummary.totalVolume.toFixed(3)} m³` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <span className="text-[10px] text-slate-400 block font-medium">Área Acumulada</span>
                <span className="text-base font-bold font-mono">
                  {qtoSummary.totalArea > 0 ? `${qtoSummary.totalArea.toFixed(2)} m²` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <span className="text-[10px] text-slate-400 block font-medium">Comprimento Total</span>
                <span className="text-base font-bold font-mono">
                  {qtoSummary.totalLength > 0 ? `${qtoSummary.totalLength.toFixed(2)} m` : '—'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <span className="text-[10px] text-slate-400 block font-medium">Total de Peças</span>
                <span className="text-base font-bold font-mono">{qtoSummary.totalCount} un</span>
              </div>
            </div>

            {/* Categories Breakdown */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 block mb-1">Composição da Seleção</span>
              {Object.entries(qtoSummary.categoriesCount).map(([cat, count]) => (
                <div key={cat} className="flex justify-between items-center text-slate-400">
                  <span>{cat}</span>
                  <span className="font-mono text-white font-semibold">{count} un</span>
                </div>
              ))}
            </div>

            {/* Items Table */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-300 block">Detalhamento dos Itens</span>
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-1.5">ID</th>
                      <th className="p-1.5">Tipo</th>
                      <th className="p-1.5 text-right">Vol (m³)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {selectedElements.map((el, i) => (
                      <tr key={i} className="hover:bg-white/5 font-mono">
                        <td className="p-1.5 text-slate-400">#{el.expressId}</td>
                        <td className="p-1.5 text-white truncate max-w-[120px]" title={el.name}>
                          {el.category}
                        </td>
                        <td className="p-1.5 text-right text-emerald-400">
                          {el.dimensions?.volume ? el.dimensions.volume.toFixed(3) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-medium"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors font-medium shadow-md shadow-orange-600/20"
              >
                <Download size={13} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Clear Selection button */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex justify-between items-center text-xs">
        <span className="text-slate-400">
          {selectedElements.length} {selectedElements.length === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
        <button
          onClick={onClearSelection}
          className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
        >
          Limpar Seleção
        </button>
      </div>
    </div>
  )
}
