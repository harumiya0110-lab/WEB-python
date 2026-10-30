import type { TablePreview } from './protocol'

export function tableToDelimitedText(
  preview: TablePreview,
  delimiter: ',' | '\t',
): string {
  const cellDetails = new Map(
    preview.cellDetails.map((detail) => [`${detail.row}:${detail.column}`, detail.value]),
  )
  const escape = (value: string): string => {
    if (![delimiter, '"', '\r', '\n'].some((character) => value.includes(character))) return value
    return `"${value.replaceAll('"', '""')}"`
  }
  const rows = [
    ['行', ...preview.columns],
    ...preview.rows.map((row, rowIndex) => [
      preview.index[rowIndex] ?? '',
      ...row.map((cell, columnIndex) => cellDetails.get(`${rowIndex}:${columnIndex}`) ?? cell),
    ]),
  ]
  return rows.map((row) => row.map(escape).join(delimiter)).join('\r\n')
}

export function tableToCsv(preview: TablePreview): string {
  return `\uFEFF${tableToDelimitedText(preview, ',')}`
}

export function tableToTsv(preview: TablePreview): string {
  return tableToDelimitedText(preview, '\t')
}

export function hasTableExportTruncation(preview: TablePreview): boolean {
  return preview.truncated || preview.cellDetails.some((detail) => detail.truncated)
}

export function tableExportScope(preview: TablePreview): string {
  const displayedRange =
    `表示中の${preview.rows.length}行・${preview.columns.length}列を保存します。`
  return hasTableExportTruncation(preview)
    ? `${displayedRange} プレビューが省略されているため、全データではありません。`
    : `${displayedRange} 表示範囲のデータです。`
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back to the legacy clipboard command where browser permissions allow it.
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('クリップボードへのコピーが許可されませんでした。')
  } finally {
    textarea.remove()
  }
}

export function downloadTableCsv(preview: TablePreview, date = new Date()): void {
  const dateStamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('')
  const url = URL.createObjectURL(new Blob([tableToCsv(preview)], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `pystudio-dataframe-${dateStamp}.csv`
  try {
    link.click()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  }
}
