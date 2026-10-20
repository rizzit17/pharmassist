import type { Complaint } from '@/types/complaint'

// Neutralize spreadsheet formulas and escape delimiters, quotes, and newlines.
export function csvCell(value: unknown): string {
  let text = String(value ?? '')
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text
  return `"${text.replace(/"/g, '""')}"`
}

export function complaintsCsv(records: Complaint[]): string {
  const rows = records.map(record => [record.complaint_number, record.customer_name,
    record.product_name, record.batch_lot_number, record.status,
    record.ai_analyses?.at(-1)?.severity, record.created_at])
  return '\uFEFF' + [['Complaint ID', 'Customer', 'Product', 'Batch / lot', 'Status', 'Severity', 'Created'], ...rows]
    .map(row => row.map(csvCell).join(',')).join('\r\n')
}

export function downloadComplaints(records: Complaint[]) {
  const url = URL.createObjectURL(new Blob([complaintsCsv(records)], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `pharmassist-complaints-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
