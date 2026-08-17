/**
 * filenameParser.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Motor Inteligente de Reconhecimento Parcial de Nomes de Arquivo.
 * Analisa nomes de PDFs com suporte a tokens parciais, nomes por extenso,
 * variações de revisão, pavimentos, tipos de prancha, fases e resíduo semântico para título.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Discipline, Floor, ProjectPhase } from '../types'
import type { PhaseOption } from '../context/AppContext'

export interface ParsedFilenameResult {
  disciplineCode: string
  floorCode: string
  docType: string
  revision: string
  phase: ProjectPhase
  number: string
  title: string
  generatedCode: string
  confidence: {
    discipline: boolean
    floor: boolean
    docType: boolean
    revision: boolean
    phase: boolean
    number: boolean
    title: boolean
  }
  isComplete: boolean
}

export interface FilenameParserOptions {
  disciplines?: Discipline[]
  floors?: Floor[]
  phases?: PhaseOption[]
  docTypes?: string[]
  namingSequence?: string[]
  namingSeparator?: string
  projectCode?: string
}

// ─── Dicionários Estendidos de Sinônimos ───────────────────────────────────────

const DISCIPLINE_SYNONYMS: Record<string, string> = {
  // Arquitetura
  'ARQ': 'ARQ', 'ARQUITETURA': 'ARQ', 'ARQUITETONICO': 'ARQ', 'ARQUITETÔNICO': 'ARQ',
  // Estrutura
  'EST': 'EST', 'ESTRUTURA': 'EST', 'ESTRUTURAL': 'EST', 'CONCRETO': 'EST', 'FORMAS': 'EST', 'ARMACAO': 'EST', 'ARMAÇÃO': 'EST',
  // Elétrica
  'ELE': 'ELE', 'ELETRICA': 'ELE', 'ELÉTRICA': 'ELE', 'ELETRICO': 'ELE', 'ELÉTRICO': 'ELE', 'INSTALACOES ELETRICAS': 'ELE',
  // Hidráulica
  'HID': 'HID', 'HIDRAULICA': 'HID', 'HIDRÁULICA': 'HID', 'HIDROSSANITARIO': 'HID', 'HIDROSSANITÁRIO': 'HID', 'ESGOTO': 'HID', 'PLUVIAL': 'HID', 'AGUA FRIA': 'HID',
  // Ar Condicionado / Climatização
  'AR': 'AR', 'CLIMATIZACAO': 'AR', 'CLIMATIZAÇÃO': 'AR', 'HVAC': 'AR', 'AR CONDICIONADO': 'AR',
  // Incêndio
  'INC': 'INC', 'INCENDIO': 'INC', 'INCÊNDIO': 'INC', 'PPCI': 'INC', 'BOMBEIRO': 'INC', 'BOMBEIROS': 'INC',
  // Gás
  'GAS': 'GAS', 'GÁS': 'GAS', 'GLP': 'GAS', 'GN': 'GAS',
  // Fundações
  'FND': 'FND', 'FUNDACAO': 'FND', 'FUNDAÇÃO': 'FND', 'FUNDACOES': 'FND', 'FUNDAÇÕES': 'FND', 'ESTACAS': 'FND', 'BLOCO': 'FND',
  // Topografia
  'TOP': 'TOP', 'TOPOGRAFIA': 'TOP', 'TOPOGRAFICO': 'TOP', 'TOPOGRÁFICO': 'TOP',
  // Arrimo
  'ARR': 'ARR', 'ARRIMO': 'ARR', 'CONTENCAO': 'ARR', 'CONTENÇÃO': 'ARR',
  // Automação
  'AUT': 'AUT', 'AUTOMACAO': 'AUT', 'AUTOMAÇÃO': 'AUT', 'SISTEMAS': 'AUT',
  // Elevadores
  'ELEV': 'ELEV', 'ELEVADOR': 'ELEV', 'ELEVADORES': 'ELEV',
  // Interiores
  'INT': 'INT', 'INTERIORES': 'INT', 'DECORACAO': 'INT', 'DECORAÇÃO': 'INT', 'LAYOUT': 'INT',
  // Paisagismo
  'PAI': 'PAI', 'PAISAGISMO': 'PAI', 'JARDIM': 'PAI', 'VEGETACAO': 'PAI', 'VEGETAÇÃO': 'PAI',
}

const DOCTYPE_SYNONYMS: Record<string, string> = {
  'PLA': 'PLA', 'PLANTA': 'PLA', 'PLANTAS': 'PLA', 'LAYOUT': 'PLA', 'BAIXA': 'PLA',
  'DET': 'DET', 'DETALHE': 'DET', 'DETALHES': 'DET', 'DETALHAMENTO': 'DET',
  'COR': 'COR', 'CORTE': 'COR', 'CORTES': 'COR', 'SECAO': 'COR', 'SEÇÃO': 'COR', 'SECOES': 'COR', 'SEÇÕES': 'COR',
  'LAJ': 'LAJ', 'LAJE': 'LAJ', 'LAJES': 'LAJ',
  'FOR': 'FOR', 'FORRO': 'FOR', 'FORROS': 'FOR', 'GESSO': 'FOR',
  'FAC': 'FAC', 'FACHADA': 'FAC', 'FACHADAS': 'FAC', 'ELEVACAO': 'FAC', 'ELEVAÇÃO': 'FAC',
  'LOC': 'LOC', 'LOCACAO': 'LOC', 'LOCAÇÃO': 'LOC', 'IMPLANTACAO': 'LOC', 'IMPLANTAÇÃO': 'LOC',
  'ESQ': 'ESQ', 'ESQUADRIA': 'ESQ', 'ESQUADRIAS': 'ESQ',
  'VIG': 'VIG', 'VIGA': 'VIG', 'VIGAS': 'VIG',
  'PIL': 'PIL', 'PILAR': 'PIL', 'PILARES': 'PIL',
}

const PHASE_SYNONYMS: Record<string, ProjectPhase> = {
  'EP': 'estudo_preliminar', 'ESTUDO': 'estudo_preliminar', 'ESTUDO PRELIMINAR': 'estudo_preliminar',
  'AP': 'anteprojeto', 'ANTE': 'anteprojeto', 'ANTEPROJETO': 'anteprojeto',
  'PL': 'projeto_legal', 'LEGAL': 'projeto_legal', 'PROJETO LEGAL': 'projeto_legal', 'PREFEITURA': 'projeto_legal',
  'PB': 'projeto_basico', 'BAS': 'projeto_basico', 'BASICO': 'projeto_basico', 'BÁSICO': 'projeto_basico', 'PROJETO BASICO': 'projeto_basico',
  'PE': 'pre_executivo', 'PRE': 'pre_executivo', 'PRÉ': 'pre_executivo', 'PRE EXECUTIVO': 'pre_executivo', 'PRÉ EXECUTIVO': 'pre_executivo',
  'EX': 'executivo', 'EXE': 'executivo', 'EXEC': 'executivo', 'EXECUTIVO': 'executivo',
  'LO': 'liberado_para_obra', 'LIBERADO': 'liberado_para_obra', 'OBRA': 'liberado_para_obra',
  'ASB': 'as_built', 'ASBUILT': 'as_built', 'AS-BUILT': 'as_built', 'CONFORME CONSTRUIDO': 'as_built',
}

/**
 * Remove acentuação e converte para maiúsculo
 */
function normalizeStr(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

/**
 * Parser Inteligente de Nomes de Arquivo
 */
export function parseFilenameSmart(
  filename: string,
  options: FilenameParserOptions = {}
): ParsedFilenameResult {
  const {
    disciplines = [],
    floors = [],
    phases = [],
    docTypes = ['PLA', 'DET', 'COR', 'LAJ', 'FOR'],
    namingSequence = ['PROJETO', 'FASE', 'DISCIPLINA', 'PAVIMENTO', 'TIPO', 'NUMERO', 'REVISAO'],
    namingSeparator = '-',
    projectCode = '043',
  } = options

  // Remove extensão .pdf, .zip, etc.
  const rawBaseName = filename.replace(/\.[^/.]+$/, '').trim()
  const normalizedBase = normalizeStr(rawBaseName)

  // Tokens divididos por delimitadores comuns (_, -, espaços, pontos)
  const tokens = normalizedBase
    .split(/[-_\s.]+/g)
    .filter(Boolean)

  let detectedDiscipline = ''
  let detectedFloor = ''
  let detectedDocType = docTypes[0] || 'PLA'
  let detectedRevision = 'R00'
  let detectedPhase: ProjectPhase = 'executivo'
  let detectedNumber = '001'

  const confidence = {
    discipline: false,
    floor: false,
    docType: false,
    revision: false,
    phase: false,
    number: false,
    title: false,
  }

  const recognizedTokens = new Set<string>()

  // ─── 0. Reconhecimento de Prefixo e Código de Projeto ───────────────────────
  if (projectCode) {
    recognizedTokens.add(normalizeStr(projectCode))
  }
  for (const token of tokens) {
    if (token === 'PROJ' || token === 'PROJETO' || token.startsWith('PROJ-')) {
      recognizedTokens.add(token)
    }
  }

  // ─── 1. Reconhecimento de Revisão (R00, REV01, V02, R.03) ───────────────────
  for (const token of tokens) {
    const revMatch = token.match(/^(?:REV|R|V|VER)[\s._-]*(\d{1,3})$/i)
    if (revMatch) {
      const num = revMatch[1].padStart(2, '0')
      detectedRevision = `R${num}`
      confidence.revision = true
      recognizedTokens.add(token)
      break
    }
  }

  // ─── 2. Reconhecimento de Fase ───────────────────────────────────────────────
  for (const token of tokens) {
    if (PHASE_SYNONYMS[token]) {
      detectedPhase = PHASE_SYNONYMS[token]
      confidence.phase = true
      recognizedTokens.add(token)
      break
    }
  }
  // Checagem composta de fases no nome inteiro (ex: "PRE-EXECUTIVO")
  if (!confidence.phase) {
    for (const [key, phaseVal] of Object.entries(PHASE_SYNONYMS)) {
      if (key.length > 2 && normalizedBase.includes(key)) {
        detectedPhase = phaseVal
        confidence.phase = true
        break
      }
    }
  }

  // ─── 3. Reconhecimento de Disciplina ─────────────────────────────────────────
  // Primeiro verifica lista configurada no AppContext
  for (const token of tokens) {
    const customMatch = disciplines.find(
      d => normalizeStr(d.code) === token || normalizeStr(d.name) === token
    )
    if (customMatch) {
      detectedDiscipline = customMatch.code
      confidence.discipline = true
      recognizedTokens.add(token)
      break
    }
  }

  // Segundo: Dicionário estendido de sinônimos
  if (!detectedDiscipline) {
    for (const token of tokens) {
      if (DISCIPLINE_SYNONYMS[token]) {
        detectedDiscipline = DISCIPLINE_SYNONYMS[token]
        confidence.discipline = true
        recognizedTokens.add(token)
        break
      }
    }
  }

  // Terceiro: Busca por substrings no nome normalizado
  if (!detectedDiscipline) {
    for (const [key, discCode] of Object.entries(DISCIPLINE_SYNONYMS)) {
      if (key.length >= 4 && normalizedBase.includes(key)) {
        detectedDiscipline = discCode
        confidence.discipline = true
        break
      }
    }
  }

  // ─── 4. Reconhecimento de Pavimento ──────────────────────────────────────────
  // Primeiro: Lista configurada no projeto
  for (const token of tokens) {
    const customFloor = floors.find(
      f => normalizeStr(f.code) === token || normalizeStr(f.name) === token
    )
    if (customFloor) {
      detectedFloor = customFloor.code
      confidence.floor = true
      recognizedTokens.add(token)
      break
    }
  }

  // Segundo: Padrões específicos de engenharia e arquitetura
  if (!detectedFloor) {
    for (const token of tokens) {
      // P01..P99, P1..P9
      const pMatch = token.match(/^P(\d{1,2})$/)
      if (pMatch) {
        detectedFloor = `P${pMatch[1].padStart(2, '0')}`
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      // SS1..SS9, SUBSOLO 1, 1SS
      const ssMatch = token.match(/^(?:SS|SUB)(\d{1,2})$/)
      if (ssMatch) {
        detectedFloor = `SS${ssMatch[1]}`
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      // Térreo, Cobertura, Ático, Mezanino, etc.
      if (['TER', 'TERREO', 'TÉRREO', 'TERR'].includes(token)) {
        detectedFloor = 'TER'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      if (['COB', 'COBERTURA', 'ATICO', 'ÁTICO'].includes(token)) {
        detectedFloor = 'COB'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      if (['MEZ', 'MEZANINO', 'MEZZ'].includes(token)) {
        detectedFloor = 'MEZ'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      if (['TIP', 'TIPO'].includes(token)) {
        detectedFloor = 'TIP'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      if (['ULT', 'ULTIMO', 'ÚLTIMO'].includes(token)) {
        detectedFloor = 'ULT'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
      if (['DUP', 'DUPLEX'].includes(token)) {
        detectedFloor = 'DUP'
        confidence.floor = true
        recognizedTokens.add(token)
        break
      }
    }
  }

  // Terceiro: Expressões compostas (ex: "3º PAVIMENTO", "SUBSOLO 2")
  if (!detectedFloor) {
    const compFloorMatch = normalizedBase.match(/(\d+)[\sºª._-]*(?:PAVIMENTO|PAV|ANDAR)/i)
    if (compFloorMatch) {
      detectedFloor = `P${compFloorMatch[1].padStart(2, '0')}`
      confidence.floor = true
    } else if (normalizedBase.match(/SUBSOLO[\s._-]*(\d+)/i)) {
      const m = normalizedBase.match(/SUBSOLO[\s._-]*(\d+)/i)!
      detectedFloor = `SS${m[1]}`
      confidence.floor = true
    } else if (normalizedBase.includes('TERREO') || normalizedBase.includes('TÉRREO')) {
      detectedFloor = 'TER'
      confidence.floor = true
    } else if (normalizedBase.includes('COBERTURA')) {
      detectedFloor = 'COB'
      confidence.floor = true
    }
  }

  // Normalização do código de pavimento com a lista do projeto (ex: SS01 -> SS1)
  if (detectedFloor) {
    const directMatch = floors.find(f => normalizeStr(f.code) === normalizeStr(detectedFloor))
    if (directMatch) {
      detectedFloor = directMatch.code
    } else {
      const ssClean = detectedFloor.replace(/^SS0+(\d+)$/, 'SS$1')
      const ssMatch = floors.find(f => f.code === ssClean)
      if (ssMatch) detectedFloor = ssMatch.code
    }
  }

  // ─── 5. Reconhecimento de Tipo de Documento ──────────────────────────────────
  for (const token of tokens) {
    const customType = docTypes.find(t => normalizeStr(t) === token)
    if (customType) {
      detectedDocType = customType
      confidence.docType = true
      recognizedTokens.add(token)
      break
    }
    if (DOCTYPE_SYNONYMS[token]) {
      detectedDocType = DOCTYPE_SYNONYMS[token]
      confidence.docType = true
      recognizedTokens.add(token)
      break
    }
  }

  if (!confidence.docType) {
    for (const [key, typeVal] of Object.entries(DOCTYPE_SYNONYMS)) {
      if (key.length >= 4 && normalizedBase.includes(key)) {
        detectedDocType = typeVal
        confidence.docType = true
        break
      }
    }
  }

  // ─── 6. Reconhecimento de Número da Prancha (001, 002, N01, FL02) ───────────
  for (const token of tokens) {
    if (recognizedTokens.has(token)) continue
    if (projectCode && normalizeStr(projectCode) === token) continue
    // Standalone 3-digit number (ex: 001, 042)
    if (/^\d{3}$/.test(token)) {
      detectedNumber = token
      confidence.number = true
      recognizedTokens.add(token)
      break
    }
    // N01, PR01, FL01, P01 (caso não tenha sido pavimento)
    const numPrefixMatch = token.match(/^(?:N|PR|FL|PRANCHA|FOLHA)[\s._-]*(\d{1,3})$/i)
    if (numPrefixMatch) {
      detectedNumber = numPrefixMatch[1].padStart(3, '0')
      confidence.number = true
      recognizedTokens.add(token)
      break
    }
  }

  // ─── 7. Extração Inteligente do Título (Resíduo Semântico) ───────────────────
  // Remove códigos do projeto, disciplinas, pavimentos e stopwords
  const ignoredWords = new Set([
    normalizeStr(projectCode),
    normalizeStr(detectedDiscipline),
    normalizeStr(detectedFloor),
    normalizeStr(detectedDocType),
    normalizeStr(detectedRevision),
    normalizeStr(detectedNumber),
    'R00', 'R01', 'R02', 'R03', 'R04', 'R05', 'R06', 'R07', 'REV',
    'EP', 'AP', 'PL', 'PB', 'PE', 'EX', 'EXE', 'LO', 'ASB',
    'INCOR', 'PROJETO', 'PRANCHA', 'DESENHO', 'VERSAO', 'FINAL',
    'DE', 'DO', 'DA', 'DOS', 'DAS', 'EM', 'NO', 'NA', 'PARA', 'COM', 'E',
    ...Array.from(recognizedTokens).map(t => normalizeStr(t))
  ])

  // Divide o nome original preservando minúsculas/maiúsculas
  const rawWords = rawBaseName.split(/[-_.\s]+/g).filter(Boolean)
  const titleWords = rawWords.filter(w => {
    const norm = normalizeStr(w)
    if (ignoredWords.has(norm)) return false
    if (/^\d{1,4}$/.test(norm)) return false // ignora números soltos
    return true
  })

  let detectedTitle = ''
  if (titleWords.length > 0) {
    detectedTitle = titleWords
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Capitalização bonita (primeira letra maiúscula)
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, char => char.toUpperCase())
    confidence.title = true
  } else {
    // Fallback: se não sobrou nada, monta um título descritivo a partir dos metadados
    const discObj = disciplines.find(d => d.code === detectedDiscipline)
    const floorObj = floors.find(f => f.code === detectedFloor)
    const typeLabel = detectedDocType === 'PLA' ? 'Planta'
      : detectedDocType === 'DET' ? 'Detalhes'
      : detectedDocType === 'COR' ? 'Cortes'
      : detectedDocType === 'LAJ' ? 'Lajes'
      : detectedDocType === 'FOR' ? 'Forro'
      : detectedDocType

    detectedTitle = `${typeLabel} ${discObj ? discObj.name : detectedDiscipline} - ${floorObj ? floorObj.name : detectedFloor}`.trim()
    confidence.title = false
  }

  // ─── 8. Geração do Código Oficial ────────────────────────────────────────────
  const phaseCodeMap: Record<ProjectPhase, string> = {
    estudo_preliminar: 'EP',
    anteprojeto: 'AP',
    projeto_legal: 'PL',
    projeto_basico: 'PB',
    pre_executivo: 'PE',
    executivo: 'EX',
    liberado_para_obra: 'LO',
    as_built: 'ASB',
  }

  const values: Record<string, string> = {
    PROJETO: projectCode,
    FASE: phaseCodeMap[detectedPhase] || 'EX',
    DISCIPLINA: detectedDiscipline || 'ARQ',
    PAVIMENTO: detectedFloor || 'TER',
    TIPO: detectedDocType || 'PLA',
    NUMERO: detectedNumber || '001',
    REVISAO: detectedRevision || 'R00',
  }

  const generatedCode = namingSequence
    .map(key => values[key] || '')
    .filter(Boolean)
    .join(namingSeparator)

  const isComplete = Boolean(detectedDiscipline && detectedFloor && detectedTitle)

  return {
    disciplineCode: detectedDiscipline,
    floorCode: detectedFloor,
    docType: detectedDocType,
    revision: detectedRevision,
    phase: detectedPhase,
    number: detectedNumber,
    title: detectedTitle,
    generatedCode,
    confidence,
    isComplete,
  }
}
