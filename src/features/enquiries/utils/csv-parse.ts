/**
 * Minimal RFC4180-ish CSV parser for the Enquiries import — handles quoted
 * fields, embedded commas, escaped quotes ("") and newlines inside quotes.
 * Runs client-side on the raw text of the uploaded file.
 */

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  // Normalise line endings so \r\n inside/outside quotes behaves consistently.
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') { inQuotes = true; continue }
    if (ch === ',') { row.push(field); field = ''; continue }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += ch
  }
  // Flush the last field/row if the file doesn't end with a newline.
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row) }

  return rows.filter((r) => !(r.length === 1 && r[0] === ''))
}

/** Parses a CSV file's text into row objects keyed by the header row's labels. */
export function parseCsvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text)
  if (rows.length === 0) return []

  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((h, i) => { record[h] = (row[i] ?? '').trim() })
    return record
  })
}
