import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type {
  AtividadeObra4D,
  CronogramaObra4D,
  BIMElementItem,
  BIMElementGroup,
  BIM4DPlayerState,
  BIM4DTimeScale,
} from '../../../types/bim4d'
import { CRONOGRAMA_OBRA_4D_DEFAULT } from '../../../data/bim4dTemplate'

const STORAGE_KEY = 'incorprojetos_bim4d_schedule'
const COLOR_IN_CONSTRUCTION = { r: 0.96, g: 0.62, b: 0.04 } // Amarelo/Laranja Obra (#F59E0B)

export interface UseBIM4DProps {
  model: any | null
  rawElements: Array<{
    expressId: number
    guid: string
    category: string
    name: string
    storey?: string
    material?: string
  }>
}

export function useBIM4D({ model, rawElements }: UseBIM4DProps) {
  const [is4DActive, setIs4DActive] = useState<boolean>(false)
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false)

  // Cronograma de obra
  const [cronograma, setCronograma] = useState<CronogramaObra4D>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // fallback
    }
    return CRONOGRAMA_OBRA_4D_DEFAULT
  })

  // Atividade selecionada para vínculo
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    cronograma.atividades[0]?.id || null
  )

  // Elementos selecionados no painel esquerdo / 3D
  const [selectedElementIds, setSelectedElementIds] = useState<Set<number>>(new Set())

  // Intervalo de datas geral da obra
  const dateRange = useMemo(() => {
    if (!cronograma.atividades || cronograma.atividades.length === 0) {
      return { start: '2026-06-01', end: '2027-06-30' }
    }
    const starts = cronograma.atividades.map(a => a.dataInicio).filter(Boolean).sort()
    const ends = cronograma.atividades.map(a => a.dataFim).filter(Boolean).sort()
    return {
      start: starts[0] || '2026-06-01',
      end: ends[ends.length - 1] || '2027-06-30',
    }
  }, [cronograma.atividades])

  // Estado do Player 4D
  const [playerState, setPlayerState] = useState<BIM4DPlayerState>({
    currentDate: dateRange.start,
    isPlaying: false,
    speed: 1,
    timeScale: 'mensal',
    startDate: dateRange.start,
    endDate: dateRange.end,
    progressPercent: 0,
    activeActivitiesCount: 0,
    completedActivitiesCount: 0,
  })

  // Salvar no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cronograma))
    } catch (e) {
      console.warn('[useBIM4D] Erro ao salvar cronograma:', e)
    }
  }, [cronograma])

  // Mapa de elemento -> ID da atividade vinculada
  const elementToActivityMap = useMemo(() => {
    const map = new Map<number, string>()
    cronograma.atividades.forEach(act => {
      act.bimExpressIds.forEach(id => map.set(id, act.id))
    })
    return map
  }, [cronograma.atividades])

  // Elementos do modelo organizados e agrupados
  const elementGroups = useMemo<BIMElementGroup[]>(() => {
    const groupsMap = new Map<string, BIMElementGroup>()

    rawElements.forEach(el => {
      const storey = el.storey || 'Pavimento Não Definido'
      const category = el.category || 'Outros'
      const groupKey = `${storey}:::${category}`

      const linkedActId = elementToActivityMap.get(el.expressId)
      const linkedAct = linkedActId
        ? cronograma.atividades.find(a => a.id === linkedActId)
        : undefined

      const item: BIMElementItem = {
        expressId: el.expressId,
        guid: el.guid,
        category,
        name: el.name || `${category} #${el.expressId}`,
        storey,
        material: el.material,
        linkedActivityId: linkedActId,
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: groupKey,
          storey,
          category,
          categoryLabel: category.replace(/^Ifc/i, ''),
          items: [],
          count: 0,
          expressIds: [],
          guids: [],
          isLinked: false,
          linkedActivityName: linkedAct?.nome,
        })
      }

      const grp = groupsMap.get(groupKey)!
      grp.items.push(item)
      grp.expressIds.push(el.expressId)
      grp.guids.push(el.guid)
      grp.count++
      if (linkedActId) grp.isLinked = true
    })

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.storey !== b.storey) return a.storey.localeCompare(b.storey)
      return a.category.localeCompare(b.category)
    })
  }, [rawElements, elementToActivityMap, cronograma.atividades])

  // ─── Atualização Visual no Modelo 3D (@thatopen/fragments) ────────────────
  const apply4DVisuals = useCallback(
    async (targetDate: string) => {
      if (!model || !is4DActive) return

      const currTime = new Date(targetDate).getTime()
      const toHide: number[] = []
      const inConstruction: number[] = []
      const completed: number[] = []

      let activeCount = 0
      let completedCount = 0

      cronograma.atividades.forEach(act => {
        const startTime = new Date(act.dataInicio).getTime()
        const endTime = new Date(act.dataFim).getTime()

        if (currTime < startTime) {
          // Não iniciado -> Oculto
          toHide.push(...act.bimExpressIds)
        } else if (currTime >= startTime && currTime <= endTime) {
          // Em obra -> Destaque Amarelo
          inConstruction.push(...act.bimExpressIds)
          activeCount++
        } else {
          // Concluído -> Sólido original
          completed.push(...act.bimExpressIds)
          completedCount++
        }
      })

      try {
        // 1. Ocultar não iniciados
        if (typeof (model as any).hide === 'function') {
          await (model as any).hide(toHide)
          await (model as any).show([...inConstruction, ...completed])
        }

        // 2. Cores de status
        if (typeof (model as any).resetColor === 'function') {
          await (model as any).resetColor()
          if (inConstruction.length > 0 && typeof (model as any).setColor === 'function') {
            await (model as any).setColor(inConstruction, COLOR_IN_CONSTRUCTION)
          }
        }
      } catch (err) {
        console.warn('[useBIM4D] Falha ao atualizar visibilidade 3D:', err)
      }

      // Calcular porcentagem de progresso geral
      const totalDays =
        new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()
      const elapsedDays = currTime - new Date(dateRange.start).getTime()
      const percent = Math.min(
        100,
        Math.max(0, Math.round((elapsedDays / (totalDays || 1)) * 100))
      )

      setPlayerState(prev => ({
        ...prev,
        currentDate: targetDate,
        progressPercent: percent,
        activeActivitiesCount: activeCount,
        completedActivitiesCount: completedCount,
      }))
    },
    [model, is4DActive, cronograma.atividades, dateRange]
  )

  // ─── Loop de Animação do Player (Play/Pause) ──────────────────────────────
  const animationFrameRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!playerState.isPlaying || !is4DActive) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      return
    }

    const tick = () => {
      const now = Date.now()
      const interval = 1200 / playerState.speed // milissegundos por avanço

      if (now - lastTickRef.current >= interval) {
        lastTickRef.current = now

        const current = new Date(playerState.currentDate)
        const daysToAdd = playerState.timeScale === 'diario' ? 1 : playerState.timeScale === 'semanal' ? 7 : 15
        current.setDate(current.getDate() + daysToAdd)

        const end = new Date(dateRange.end)
        if (current > end) {
          // Fim da obra alcançado -> Pausar no final
          setPlayerState(p => ({ ...p, isPlaying: false, currentDate: dateRange.end }))
          apply4DVisuals(dateRange.end)
          return
        }

        const nextDateStr = current.toISOString().slice(0, 10)
        apply4DVisuals(nextDateStr)
      }

      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [playerState.isPlaying, playerState.speed, playerState.timeScale, playerState.currentDate, is4DActive, dateRange, apply4DVisuals])

  // Reset do modelo ao desativar o modo 4D
  useEffect(() => {
    if (!is4DActive && model) {
      try {
        if (typeof (model as any).resetColor === 'function') (model as any).resetColor()
        if (typeof (model as any).showAll === 'function') (model as any).showAll()
      } catch {}
    } else if (is4DActive) {
      apply4DVisuals(playerState.currentDate)
    }
  }, [is4DActive, model, apply4DVisuals, playerState.currentDate])

  // ─── Ações de Vínculo e Manipulação ──────────────────────────────────────

  function vincularSelecao() {
    if (!selectedActivityId || selectedElementIds.size === 0) return

    const idsToAdd = Array.from(selectedElementIds)
    const guidsToAdd = rawElements
      .filter(el => selectedElementIds.has(el.expressId))
      .map(el => el.guid)

    setCronograma(prev => ({
      ...prev,
      dataAtualizacao: new Date().toISOString().slice(0, 10),
      atividades: prev.atividades.map(act => {
        // Remover de outras atividades para evitar duplicidade
        const cleanExpress = act.bimExpressIds.filter(id => !selectedElementIds.has(id))
        const cleanGuids = act.bimGuids.filter(g => !guidsToAdd.includes(g))

        if (act.id === selectedActivityId) {
          const mergedExpress = Array.from(new Set([...cleanExpress, ...idsToAdd]))
          const mergedGuids = Array.from(new Set([...cleanGuids, ...guidsToAdd]))
          return {
            ...act,
            bimExpressIds: mergedExpress,
            bimGuids: mergedGuids,
          }
        }
        return {
          ...act,
          bimExpressIds: cleanExpress,
          bimGuids: cleanGuids,
        }
      }),
    }))

    setSelectedElementIds(new Set())
    apply4DVisuals(playerState.currentDate)
  }

  function desvincularAtividade(activityId: string) {
    setCronograma(prev => ({
      ...prev,
      dataAtualizacao: new Date().toISOString().slice(0, 10),
      atividades: prev.atividades.map(act =>
        act.id === activityId ? { ...act, bimExpressIds: [], bimGuids: [] } : act
      ),
    }))
    apply4DVisuals(playerState.currentDate)
  }

  function autoVincularPorNome() {
    // Tenta casar nome da atividade com Pavimento e Categoria do IFC
    setCronograma(prev => {
      const updated = prev.atividades.map(act => {
        const actName = act.nome.toLowerCase()
        const matchedExpress: number[] = []
        const matchedGuids: string[] = []

        rawElements.forEach(el => {
          const storey = (el.storey || '').toLowerCase()
          const cat = (el.category || '').toLowerCase()

          // Exemplo: se a atividade tem "1º pavimento" e "pilar", bate com IfcColumn no 1º Pavimento
          const storeyMatch = storey && actName.includes(storey)
          const catMatch =
            (cat.includes('column') && (actName.includes('pilar') || actName.includes('pilares'))) ||
            (cat.includes('beam') && (actName.includes('viga') || actName.includes('vigas'))) ||
            (cat.includes('slab') && (actName.includes('laje') || actName.includes('lajes'))) ||
            (cat.includes('wall') && (actName.includes('alvenaria') || actName.includes('parede'))) ||
            (cat.includes('footing') && (actName.includes('fundaç') || actName.includes('bloco')))

          if (storeyMatch && catMatch) {
            matchedExpress.push(el.expressId)
            matchedGuids.push(el.guid)
          }
        })

        if (matchedExpress.length > 0) {
          return {
            ...act,
            bimExpressIds: Array.from(new Set([...act.bimExpressIds, ...matchedExpress])),
            bimGuids: Array.from(new Set([...act.bimGuids, ...matchedGuids])),
          }
        }
        return act
      })

      return {
        ...prev,
        dataAtualizacao: new Date().toISOString().slice(0, 10),
        atividades: updated,
      }
    })

    apply4DVisuals(playerState.currentDate)
  }

  function toggleSelectGroup(group: BIMElementGroup) {
    setSelectedElementIds(prev => {
      const next = new Set(prev)
      const allSelected = group.expressIds.every(id => next.has(id))
      if (allSelected) {
        group.expressIds.forEach(id => next.delete(id))
      } else {
        group.expressIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  function selectAllElements() {
    const all = new Set(rawElements.map(e => e.expressId))
    setSelectedElementIds(all)
  }

  function clearSelection() {
    setSelectedElementIds(new Set())
  }

  function setTimelineDate(dateStr: string) {
    apply4DVisuals(dateStr)
  }

  function togglePlay() {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }))
  }

  function setSpeed(speed: number) {
    setPlayerState(prev => ({ ...prev, speed }))
  }

  function setTimeScale(timeScale: BIM4DTimeScale) {
    setPlayerState(prev => ({ ...prev, timeScale }))
  }

  function resetSimulation() {
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      currentDate: dateRange.start,
      progressPercent: 0,
    }))
    apply4DVisuals(dateRange.start)
  }

  function importarAtividades(novasAtividades: AtividadeObra4D[]) {
    setCronograma(prev => ({
      ...prev,
      atividades: novasAtividades,
      dataAtualizacao: new Date().toISOString().slice(0, 10),
    }))
    if (novasAtividades.length > 0) {
      setSelectedActivityId(novasAtividades[0].id)
      setPlayerState(prev => ({
        ...prev,
        currentDate: novasAtividades[0].dataInicio,
        startDate: novasAtividades[0].dataInicio,
        endDate: novasAtividades[novasAtividades.length - 1].dataFim,
      }))
    }
  }

  function adicionarAtividadeManual(nova: Omit<AtividadeObra4D, 'id' | 'bimGuids' | 'bimExpressIds'>) {
    const newAct: AtividadeObra4D = {
      ...nova,
      id: `act-manual-${Date.now()}`,
      bimGuids: [],
      bimExpressIds: [],
    }
    setCronograma(prev => ({
      ...prev,
      atividades: [...prev.atividades, newAct].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
    }))
  }

  function toggleSelectElement(expressId: number, isShift?: boolean) {
    setSelectedElementIds(prev => {
      const next = isShift ? new Set(prev) : new Set<number>()
      if (prev.has(expressId) && isShift) {
        next.delete(expressId)
      } else {
        next.add(expressId)
      }
      return next
    })
  }

  return {
    is4DActive,
    setIs4DActive,
    isPresentationMode,
    setIsPresentationMode,
    cronograma,
    selectedActivityId,
    setSelectedActivityId,
    selectedElementIds,
    setSelectedElementIds,
    elementGroups,
    playerState,
    dateRange,
    // Ações
    vincularSelecao,
    desvincularAtividade,
    autoVincularPorNome,
    toggleSelectGroup,
    toggleSelectElement,
    selectAllElements,
    clearSelection,
    setTimelineDate,
    togglePlay,
    setSpeed,
    setTimeScale,
    resetSimulation,
    importarAtividades,
    adicionarAtividadeManual,
  }
}
