import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { xlsxToCSV } from '@/lib/xlsx-utils'

function makeWb(sheets: Record<string, unknown[][]>) {
  const wb = XLSX.utils.book_new()
  for (const [name, data] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data as XLSX.AOA), name)
  }
  return wb
}

describe('xlsxToCSV — CSV quoting (toCSVCell / toCSVRow)', () => {
  it('does not quote a plain cell', () => {
    const wb = makeWb({ Sheet1: [['Name', 'Age'], ['Alice', '30'], ['Bob', '25']] })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('Alice,30')
  })

  it('wraps cells containing commas in double quotes', () => {
    const wb = makeWb({ Sheet1: [['Name', 'Value'], ['Smith, John', '100'], ['Mary', '200']] })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('"Smith, John"')
  })

  it('escapes embedded double quotes by doubling them', () => {
    const wb = makeWb({ Sheet1: [['Name', 'Note'], ['Alice', 'say "hello"'], ['Bob', 'ok']] })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('"say ""hello"""')
  })
})

describe('xlsxToCSV — multi-sheet output', () => {
  it('produces one # Sheet: section per non-empty sheet', () => {
    const wb = makeWb({
      Programs: [['Name', 'Duration'], ['MBA', '2 years'], ['BSc', '4 years']],
      Fees:     [['Program', 'Cost'],  ['MBA', '50000'],   ['BSc', '30000']],
    })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('# Sheet: Programs')
    expect(result).toContain('# Sheet: Fees')
  })

  it('skips sheets with 2 or fewer non-empty rows', () => {
    const wb = makeWb({
      Tiny:  [['Only Header']], // 1 row → skip
      Large: [['Name', 'Age'], ['Alice', '30'], ['Bob', '25']],
    })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).not.toContain('# Sheet: Tiny')
    expect(result).toContain('# Sheet: Large')
  })

  it('includes data rows under the section header', () => {
    const wb = makeWb({ Info: [['Name', 'Country'], ['Alice', 'USA'], ['Bob', 'UK']] })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('Alice,USA')
    expect(result).toContain('Bob,UK')
  })
})

describe('xlsxToCSV — header detection (headerScore / findHeaderIdx)', () => {
  it('prefers the row with the most non-empty string labels as header', () => {
    // Row 0: 3 numbers (bad header) → low score
    // Row 1: 3 strings (good header) → high score
    const wb = makeWb({
      Sheet1: [
        ['1', '2', '3'],
        ['Name', 'Email', 'Country'],
        ['Alice', 'a@b.com', 'USA'],
      ],
    })
    const result = xlsxToCSV(XLSX, wb)
    expect(result).toContain('Name,Email,Country')
    // Data row should follow, not "1,2,3"
    expect(result).not.toContain('\n1,2,3\n')
  })
})

describe('xlsxToCSV — null column elimination', () => {
  it('drops columns where every row (including header) is empty', () => {
    // Column 1 is always empty
    const wb = makeWb({
      Sheet1: [
        ['Name', '',  'Country'],
        ['Alice', '', 'USA'],
        ['Bob',   '', 'UK'],
      ],
    })
    const result = xlsxToCSV(XLSX, wb)
    // The empty column should be eliminated
    expect(result).toContain('Name,Country')
    expect(result).not.toMatch(/Name,,Country/)
  })
})
