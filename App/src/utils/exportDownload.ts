export const downloadBlob = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')

  a.href = url
  a.setAttribute('download', filename)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const escapeCsvCell = (value: unknown): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`

export const buildCsv = (headers: string[], rows: unknown[][]): string =>
  [headers.join(','), ...rows.map(r => r.map(escapeCsvCell).join(','))].join('\n')

export const downloadJson = (data: unknown, filename: string) => {
  downloadBlob(JSON.stringify(data, null, 2), filename, 'application/json')
}
