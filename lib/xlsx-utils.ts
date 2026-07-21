function toCSVCell(c: string): string {
  const s = String(c ?? '').replace(/\r?\n/g, ' ').trim();
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSVRow(cells: string[]): string {
  return cells.map(toCSVCell).join(',');
}

export function xlsxToCSV(XLSX: typeof import('xlsx'), workbook: import('xlsx').WorkBook): string {
  type Row = string[];

  const getRows = (name: string): Row[] =>
    XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: '',
    }) as Row[];

  const countNonEmpty = (row: Row) => row.filter((c) => String(c).trim()).length;

  const headerScore = (row: Row): number => {
    const ne = countNonEmpty(row);
    if (ne === 0) return 0;
    const numericCount = row.filter((c) => String(c).trim() && !isNaN(Number(c))).length;
    const totalLen = row.reduce((s, c) => s + String(c).length, 0);
    const avgLen = totalLen / Math.max(ne, 1);
    const stringRatio = 1 - numericCount / ne;
    const lengthPenalty = avgLen > 80 ? 0.2 : avgLen > 40 ? 0.7 : 1;
    return ne * stringRatio * lengthPenalty;
  };

  const findHeaderIdx = (rows: Row[]): number => {
    let best = { idx: 0, score: -1 };
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const s = headerScore(rows[i]);
      if (s > best.score) best = { idx: i, score: s };
    }
    return best.idx;
  };

  const isDataRow = (row: Row): boolean =>
    row.some((c) => {
      const s = String(c).trim();
      if (!s) return false;
      if (!isNaN(Number(s))) return true;
      return s.length > 25;
    });

  const findDataStart = (rows: Row[], headerIdx: number): number => {
    const threshold = Math.max(2, countNonEmpty(rows[headerIdx]) * 0.25);
    let firstCandidate = -1;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (countNonEmpty(rows[i]) < threshold) continue;
      if (isDataRow(rows[i])) return i;
      if (firstCandidate === -1) firstCandidate = i;
    }
    return firstCandidate !== -1 ? firstCandidate : headerIdx + 1;
  };

  const buildHeader = (rows: Row[], headerIdx: number, dataStart: number): (string | null)[] => {
    const main = rows[headerIdx].map((c) => String(c).trim());
    const subRows = rows.slice(headerIdx + 1, dataStart).filter((r) => countNonEmpty(r) > 0);
    let lastFilled = '';
    return main.map((cell, i) => {
      if (cell) lastFilled = cell;
      const sub = subRows.map((r) => String(r[i] ?? '').trim()).filter(Boolean).join('/');
      if (!cell && !sub) return null;
      if (!cell && sub) return `${lastFilled}: ${sub}`;
      if (cell && sub) return `${cell}: ${sub}`;
      return cell;
    });
  };

  const headersSimilar = (a: Row, b: Row): boolean => {
    const len = Math.max(a.length, b.length);
    if (len === 0) return false;
    const matches = a.filter((v, i) => v && v === b[i]).length;
    return matches / len >= 0.3;
  };

  const sheets = workbook.SheetNames.map((name) => {
    const rows = getRows(name);
    const nonEmptyRows = rows.filter((r) => countNonEmpty(r) > 0);
    return { name, rows, dataRowCount: nonEmptyRows.length };
  }).filter((s) => s.dataRowCount > 2);

  if (sheets.length === 0) return '';

  const analyzed = sheets.map((s) => {
    const headerIdx = findHeaderIdx(s.rows);
    const dataStart = findDataStart(s.rows, headerIdx);
    const header = buildHeader(s.rows, headerIdx, dataStart);
    return { ...s, headerIdx, dataStart, header };
  });

  const [first, ...rest] = analyzed;
  const combinable = rest.filter((s) =>
    headersSimilar(first.rows[first.headerIdx], s.rows[s.headerIdx])
  );
  const sheetsToMerge = combinable.length > 0 ? [first, ...combinable] : [first];
  const addSheetCol = sheetsToMerge.length > 1;

  const richest = sheetsToMerge.reduce((a, b) =>
    a.header.filter(Boolean).length >= b.header.filter(Boolean).length ? a : b
  );

  const keepIdx = richest.header.reduce<number[]>(
    (acc, h, i) => (h !== null ? [...acc, i] : acc),
    []
  );
  const colHeaders = keepIdx.map((i) => richest.header[i] as string);
  const finalHeaders = addSheetCol ? ['Sheet', ...colHeaders] : colHeaders;

  const lines = [toCSVRow(finalHeaders)];
  sheetsToMerge.forEach(({ name, rows, dataStart }) => {
    rows.slice(dataStart).filter((r) => countNonEmpty(r) > 0).forEach((r) => {
      const cells = keepIdx.map((i) => r[i] ?? '');
      lines.push(toCSVRow(addSheetCol ? [name, ...cells] : cells));
    });
  });

  return lines.join('\n');
}
