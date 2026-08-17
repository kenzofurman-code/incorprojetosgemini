/**
 * zipExtractor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilitário para descompactação de arquivos .ZIP no navegador usando JSZip.
 * Filtra e retorna exclusivamente arquivos PDF válidos ignorando pastas de sistema.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import JSZip from 'jszip'

export async function extractPdfsFromZip(zipFile: File): Promise<File[]> {
  const zip = new JSZip()
  const loadedZip = await zip.loadAsync(zipFile)
  const pdfFiles: File[] = []

  const validEntries: Array<{ relativePath: string; zipEntry: JSZip.JSZipObject }> = []

  loadedZip.forEach((relativePath, zipEntry) => {
    const lower = relativePath.toLowerCase()
    // Apenas arquivos (não pastas) que terminam em .pdf
    if (!zipEntry.dir && lower.endsWith('.pdf')) {
      // Ignorar metadados do macOS e arquivos temporários
      if (!relativePath.startsWith('__MACOSX') && !relativePath.includes('/._') && !relativePath.startsWith('.')) {
        validEntries.push({ relativePath, zipEntry })
      }
    }
  })

  for (const { relativePath, zipEntry } of validEntries) {
    const blob = await zipEntry.async('blob')
    const cleanFileName = relativePath.split('/').pop() || relativePath
    const pdfFile = new File([blob], cleanFileName, { type: 'application/pdf' })
    pdfFiles.push(pdfFile)
  }

  return pdfFiles
}

/**
 * Verifica se um arquivo é um arquivo compactado ZIP
 */
export function isZipFile(file: File): boolean {
  const ext = file.name.toLowerCase().split('.').pop()
  return ext === 'zip' || file.type === 'application/zip' || file.type === 'application/x-zip-compressed'
}
