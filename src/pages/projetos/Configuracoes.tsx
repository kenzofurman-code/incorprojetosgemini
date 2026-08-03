import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { Card, PageHeader, Button } from '../../components/ui'
import {
  Settings, Plus, Trash2, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Save, Layers, ListFilter
} from 'lucide-react'
import type { Discipline, Floor } from '../../types'

type SettingsTab = 'disciplines' | 'floors' | 'phases_types' | 'nomenclature'

export default function Configuracoes() {
  const {
    currentProject,
    disciplines,
    saveDisciplines,
    floors,
    saveFloors,
    phases,
    savePhases,
    docTypes,
    saveDocTypes,
    namingSequence,
    saveNamingSequence,
    namingSeparator,
    saveNamingSeparator,
  } = useApp()

  const [activeTab, setActiveTab] = useState<SettingsTab>('disciplines')

  // ─── Local State for Disciplines ───────────────────────────────────────────
  const [localDisciplines, setLocalDisciplines] = useState<Discipline[]>([...disciplines])
  const [newDisc, setNewDisc] = useState({ code: '', name: '', color: '#3B82F6' })

  const handleAddDiscipline = () => {
    if (!newDisc.code.trim() || !newDisc.name.trim()) return
    const codeUpper = newDisc.code.trim().toUpperCase()
    if (localDisciplines.some(d => d.code === codeUpper)) {
      alert('Esta sigla já existe.')
      return
    }
    const updated = [...localDisciplines, { code: codeUpper, name: newDisc.name.trim(), color: newDisc.color }]
    setLocalDisciplines(updated)
    saveDisciplines(updated)
    setNewDisc({ code: '', name: '', color: '#3B82F6' })
  }

  const handleRemoveDiscipline = (code: string) => {
    const updated = localDisciplines.filter(d => d.code !== code)
    setLocalDisciplines(updated)
    saveDisciplines(updated)
  }

  // ─── Local State for Floors ────────────────────────────────────────────────
  const [localFloors, setLocalFloors] = useState<Floor[]>([...floors])
  const [newFloor, setNewFloor] = useState({ code: '', name: '' })

  const handleAddFloor = () => {
    if (!newFloor.code.trim() || !newFloor.name.trim()) return
    const codeUpper = newFloor.code.trim().toUpperCase()
    if (localFloors.some(f => f.code === codeUpper)) {
      alert('Esta sigla de pavimento já existe.')
      return
    }
    const nextOrder = localFloors.length > 0 ? Math.max(...localFloors.map(f => f.order)) + 1 : 0
    const updated = [...localFloors, {
      id: `fl-${Date.now()}`,
      code: codeUpper,
      name: newFloor.name.trim(),
      order: nextOrder
    }]
    setLocalFloors(updated)
    saveFloors(updated)
    setNewFloor({ code: '', name: '' })
  }

  const handleRemoveFloor = (id: string) => {
    const updated = localFloors.filter(f => f.id !== id)
    setLocalFloors(updated)
    saveFloors(updated)
  }

  const handleMoveFloor = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= localFloors.length) return
    const updated = [...localFloors]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp

    // Recalculate orders based on new positions
    const ordered = updated.map((f, i) => ({ ...f, order: i }))
    setLocalFloors(ordered)
    saveFloors(ordered)
  }

  // ─── Local State for Phases & Types ─────────────────────────────────────────
  const [localPhases, setLocalPhases] = useState([...phases])
  const [newPhase, setNewPhase] = useState({ value: '', label: '' })

  const [localTypes, setLocalTypes] = useState([...docTypes])
  const [newType, setNewType] = useState('')

  const handleAddPhase = () => {
    if (!newPhase.value.trim() || !newPhase.label.trim()) return
    const valClean = newPhase.value.trim().toLowerCase().replace(/\s+/g, '_')
    if (localPhases.some(p => p.value === valClean)) {
      alert('Esta fase já existe.')
      return
    }
    const updated = [...localPhases, { value: valClean, label: newPhase.label.trim() }]
    setLocalPhases(updated)
    savePhases(updated)
    setNewPhase({ value: '', label: '' })
  }

  const handleRemovePhase = (value: string) => {
    const updated = localPhases.filter(p => p.value !== value)
    setLocalPhases(updated)
    savePhases(updated)
  }

  const handleAddType = () => {
    if (!newType.trim()) return
    const typeUpper = newType.trim().toUpperCase()
    if (localTypes.includes(typeUpper)) {
      alert('Este tipo de documento já existe.')
      return
    }
    const updated = [...localTypes, typeUpper]
    setLocalTypes(updated)
    saveDocTypes(updated)
    setNewType('')
  }

  const handleRemoveType = (t: string) => {
    const updated = localTypes.filter(type => type !== t)
    setLocalTypes(updated)
    saveDocTypes(updated)
  }

  // ─── Local State for Naming Structure ──────────────────────────────────────
  const [localSequence, setLocalSequence] = useState<string[]>([...namingSequence])

  const handleMoveSequence = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= localSequence.length) return
    const updated = [...localSequence]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setLocalSequence(updated)
    saveNamingSequence(updated)
  }

  // Mock code preview helper
  const getPreviewCode = () => {
    const sampleValues: Record<string, string> = {
      PROJETO: currentProject.code,
      FASE: 'EP',
      DISCIPLINA: 'ARQ',
      PAVIMENTO: 'P03',
      TIPO: 'PLA',
      NUMERO: '002',
      REVISAO: 'R05'
    }
    return localSequence
      .map(key => sampleValues[key] || key)
      .join(namingSeparator)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações do Escritório"
        subtitle="Configure padrões globais de disciplinas, pavimentos e nomenclatura de arquivos"
      />

      <div className="flex gap-4">
        {/* Navigation Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-1">
          {[
            { id: 'disciplines', label: 'Disciplinas & Siglas', icon: <Layers size={16} /> },
            { id: 'floors', label: `Pavimentos (${currentProject.code})`, icon: <Settings size={16} /> },
            { id: 'phases_types', label: 'Fases & Tipos', icon: <ListFilter size={16} /> },
            { id: 'nomenclature', label: 'Nomenclatura Pranchas', icon: <Settings size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left"
              style={{
                background: activeTab === tab.id ? 'var(--navy-mid)' : 'transparent',
                color: activeTab === tab.id ? 'var(--white)' : 'var(--slate)'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Box */}
        <div className="flex-1">
          {activeTab === 'disciplines' && (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Disciplinas e Letras de Identificação</h3>
                <p className="text-xs text-slate-400 mt-1">Defina as siglas de disciplina usadas na composição do nome das pranchas.</p>
              </div>

              {/* Add form */}
              <div className="grid grid-cols-4 gap-3 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Sigla (Letra)</label>
                  <input
                    type="text"
                    placeholder="Ex: ARQ"
                    maxLength={5}
                    value={newDisc.code}
                    onChange={e => setNewDisc(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full text-xs rounded px-2.5 py-1.5 outline-none font-mono"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block">Nome Completo</label>
                  <input
                    type="text"
                    placeholder="Ex: Arquitetura"
                    value={newDisc.name}
                    onChange={e => setNewDisc(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Cor Visual</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={newDisc.color}
                      onChange={e => setNewDisc(prev => ({ ...prev, color: e.target.value }))}
                      className="w-8 h-8 rounded border-none cursor-pointer p-0 bg-transparent"
                    />
                    <Button size="sm" onClick={handleAddDiscipline} className="flex-1">
                      <Plus size={12} />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Sigla</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Disciplina</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Visualização</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {localDisciplines.map(d => (
                      <tr key={d.code} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-white">{d.code}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{d.name}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            <span style={{ color: d.color }} className="font-mono text-[10px]">{d.color}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveDiscipline(d.code)}
                            className="p-1 hover:text-red-500 text-slate-500 transition-colors"
                            title="Remover disciplina"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'floors' && (
            <Card className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Pavimentos vinculados ao {currentProject.name}</h3>
                <p className="text-xs text-slate-400 mt-1">Ordene e crie pavimentos para este projeto específico. Isso afetará as listas e buscas de armario e revisões.</p>
              </div>

              {/* Add form */}
              <div className="grid grid-cols-3 gap-3 items-end bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Código do Pavimento</label>
                  <input
                    type="text"
                    placeholder="Ex: P03, SS1, TER"
                    maxLength={6}
                    value={newFloor.code}
                    onChange={e => setNewFloor(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full text-xs rounded px-2.5 py-1.5 outline-none font-mono"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Nome Descritivo</label>
                  <input
                    type="text"
                    placeholder="Ex: 3º Pavimento"
                    value={newFloor.name}
                    onChange={e => setNewFloor(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                </div>
                <div>
                  <Button size="sm" onClick={handleAddFloor} className="w-full">
                    <Plus size={12} />
                    Adicionar Pavimento
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Ordem</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Sigla</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400">Descrição</th>
                      <th className="px-4 py-2 text-xs font-bold text-slate-400 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {localFloors.map((f, i) => (
                      <tr key={f.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={i === 0}
                              onClick={() => handleMoveFloor(i, -1)}
                              className="p-0.5 hover:text-white disabled:opacity-30 text-slate-500"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              disabled={i === localFloors.length - 1}
                              onClick={() => handleMoveFloor(i, 1)}
                              className="p-0.5 hover:text-white disabled:opacity-30 text-slate-500"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <span>#{i + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-white">{f.code}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{f.name}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={() => handleRemoveFloor(f.id)}
                            className="p-1 hover:text-red-500 text-slate-500 transition-colors"
                            title="Remover pavimento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {activeTab === 'phases_types' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Phases */}
              <Card className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Fases de Projeto</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Configure as fases de desenvolvimento aceitas.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova fase..."
                    value={newPhase.label}
                    onChange={e => setNewPhase({ value: e.target.value.toLowerCase().replace(/\s+/g, '_'), label: e.target.value })}
                    className="flex-1 text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                  <Button size="sm" onClick={handleAddPhase}>
                    <Plus size={12} />
                  </Button>
                </div>
                <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto border border-slate-800 rounded-xl">
                  {localPhases.map(p => (
                    <div key={p.value} className="flex justify-between items-center p-3 text-xs text-slate-300">
                      <span>{p.label} <span className="font-mono text-[10px] text-slate-500">({p.value})</span></span>
                      <button onClick={() => handleRemovePhase(p.value)} className="p-0.5 text-slate-500 hover:text-red-400">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Doc Types */}
              <Card className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Tipos de Prancha</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Siglas dos formatos de desenho, ex: Planta, Corte.</p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: LAJ"
                    value={newType}
                    onChange={e => setNewType(e.target.value)}
                    className="flex-1 text-xs rounded px-2.5 py-1.5 outline-none"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                  <Button size="sm" onClick={handleAddType}>
                    <Plus size={12} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900/20 border border-slate-800 rounded-xl min-h-[150px] align-content-start">
                  {localTypes.map(t => (
                    <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-slate-800 text-white font-mono border border-slate-700">
                      {t}
                      <button onClick={() => handleRemoveType(t)} className="text-slate-500 hover:text-white transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'nomenclature' && (
            <Card className="p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Configuração Dinâmica de Nomenclatura</h3>
                <p className="text-xs text-slate-400 mt-1">Defina a estrutura oficial de codificação dos arquivos do projeto. O parser inteligente de arquivos também utilizará essa sequência para ler os PDFs.</p>
              </div>

              {/* Cards Reordering */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-semibold">Ordem dos Componentes</label>
                <div className="flex flex-wrap items-center gap-2 p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                  {localSequence.map((key, i) => (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-sm">
                      <span className="text-xs font-bold text-white font-mono">{key}</span>
                      <div className="flex gap-0.5 border-l border-slate-700 pl-1.5 ml-1">
                        <button
                          disabled={i === 0}
                          onClick={() => handleMoveSequence(i, -1)}
                          className="text-slate-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          disabled={i === localSequence.length - 1}
                          onClick={() => handleMoveSequence(i, 1)}
                          className="text-slate-500 hover:text-white disabled:opacity-30"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Separator and Preview */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Separador</label>
                  <select
                    value={namingSeparator}
                    onChange={e => saveNamingSeparator(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2 outline-none"
                    style={{ background: 'var(--surface-mid)', border: '1px solid var(--surface-border)', color: 'white' }}
                  >
                    <option value="-">Traço (-)</option>
                    <option value="_">Underline (_)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1.5 block font-semibold">Preview Oficial Gerado</label>
                  <div className="text-sm font-mono p-2.5 rounded-lg border border-orange-500/20 bg-orange-500/5 text-orange-400 font-bold flex items-center justify-between">
                    <span>{getPreviewCode()}</span>
                    <span className="text-[10px] text-slate-500 font-normal">Exemplo de Estrutura</span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
