/*
 * Styled Excel report builder untuk seluruh laporan ElektroMart.
 * Semua sheet memakai blok kepala yang sama, tipe tanggal/angka Excel yang
 * benar, lebar kolom eksplisit, freeze pane, autofilter dan pengaturan cetak.
 */
import ExcelJS from "exceljs/dist/exceljs.min.js";

export type CellFormat =
  | "currency"
  | "number"
  | "percent"
  | "percentValue"
  | "date"
  | "datetime"
  | "text";

export type CellValue =
  | string
  | number
  | Date
  | null
  | undefined
  | { value: string | number | Date; format?: CellFormat; align?: Align };

export type Align = "left" | "center" | "right";

export type ColumnSpec = {
  header: string;
  width?: number;
  format?: CellFormat;
  align?: Align;
  /** Excel formula untuk kolom ini; menerima nomor baris Excel (1-based). */
  formula?: (row: number) => string;
};

export type TableSpec = {
  kind: "table";
  name: string;
  title: string;
  subtitle?: string;
  columns: ColumnSpec[];
  rows: CellValue[][];
  /** Baris TOTAL. Menerima nomor baris Excel dari baris total tersebut. */
  total?: (row: number) => CellValue[];
  highlightBelow?: { column: number; value: number };
  /** Baris keterangan di bawah judul sebelum tabel. */
  notes?: string[];
};

export type SummaryLine =
  | { kind: "section"; label: string; value?: CellValue }
  | { kind: "subtotal"; label: string; value?: CellValue }
  | { kind: "detail"; label: string; value?: CellValue; note?: string }
  | { kind: "check"; label: string; value: string }
  | { kind: "spacer" };

export type SummarySpec = {
  kind: "summary";
  name: string;
  title: string;
  lines: SummaryLine[];
  /** Label tiga kolom ringkasan. */
  columns?: [string, string, string];
  widths?: [number, number, number];
};

export type ReportMeta = {
  title: string;
  platform?: string;
  /** Nama seller/toko untuk laporan seller atau "Seluruh Platform" untuk admin. */
  subject?: string;
  period?: { from: string; to: string };
  /** Waktu cetak dalam WIB, format `yyyy-mm-dd HH:mm`. */
  generatedAt?: string;
  notes?: string[];
  currency?: string;
};

const ARGB = {
  navy: "FF1F3557",
  navyDark: "FF162A47",
  white: "FFFFFFFF",
  ink: "FF243247",
  muted: "FF64748B",
  stripe: "FFF8FAFC",
  border: "FFD9E2F0",
  grey: "FFEEF2F7",
  total: "FFE8EEF8",
  danger: "FFFDECEC",
  dangerText: "FFE11D48",
  ok: "FFE8F7EF",
  okText: "FF15803D",
};

const thinBorder = {
  top: { style: "thin" as const, color: { argb: ARGB.border } },
  left: { style: "thin" as const, color: { argb: ARGB.border } },
  bottom: { style: "thin" as const, color: { argb: ARGB.border } },
  right: { style: "thin" as const, color: { argb: ARGB.border } },
};

const totalBorder = {
  ...thinBorder,
  top: { style: "medium" as const, color: { argb: ARGB.navy } },
};

function excelFormat(format?: CellFormat): string | undefined {
  switch (format) {
    case "currency":
      return '"Rp " #,##0;-"Rp " #,##0;"Rp " 0';
    case "number":
      return "#,##0;-#,##0;0";
    case "percent":
      return "0.0%;-0.0%;0.0%";
    case "percentValue":
      return '0.0"%";-0.0"%";0.0"%"';
    case "date":
      return "dd mmm yyyy";
    case "datetime":
      return "dd mmm yyyy hh:mm";
    default:
      return undefined;
  }
}

function splitCell(cell: CellValue): { value: string | number | Date; format?: CellFormat; align?: Align } {
  if (cell && typeof cell === "object" && !(cell instanceof Date) && "value" in cell) return cell;
  return { value: (cell ?? "") as string | number | Date };
}

function setCell(
  cell: any,
  raw: { value: string | number | Date; format?: CellFormat; align?: Align },
  fallbackFormat?: CellFormat,
  fallbackAlign?: Align
) {
  const isFormula = typeof raw.value === "string" && raw.value.startsWith("=");
  cell.value = isFormula && typeof raw.value === "string" ? { formula: raw.value.slice(1) } : raw.value;
  const format = excelFormat(raw.format ?? fallbackFormat);
  if (format) cell.numFmt = format;
  const alignment = raw.align ?? fallbackAlign;
  return alignment;
}

function addPageSetup(sheet: any) {
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
  sheet.headerFooter = { oddFooter: "&C ElektroMart — &P / &N" };
}

/** Blok kepala standar pada baris 1–6 dari setiap sheet. */
function addHeaderBlock(sheet: any, meta: ReportMeta, columnCount: number): number {
  const pad = (value: number) => String(value).padStart(2, "0");
  const period = meta.period
    ? `Periode: ${meta.period.from} sampai ${meta.period.to}`
    : "Periode: Seluruh data yang tersedia";
  const printed = meta.generatedAt
    ? `Tanggal cetak: ${meta.generatedAt} WIB`
    : `Tanggal cetak: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`;
  const headerLines = [
    meta.title,
    `Platform: ${meta.platform || "ElektroMart"}  |  ${meta.subject ? `Pengguna/Toko: ${meta.subject}` : ""}`,
    period,
    `${printed}  |  Mata uang: ${meta.currency || "Rupiah (Rp)"}`,
    ...(meta.notes || []).slice(0, 2),
  ];
  const lastHeaderRow = Math.max(6, 1 + headerLines.length);
  for (let row = 1; row <= lastHeaderRow; row += 1) {
    sheet.mergeCells(row, 1, row, columnCount);
    const cell = sheet.getCell(row, 1);
    cell.value = headerLines[row - 1] || "";
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1, wrapText: true };
    if (row === 1) {
      cell.font = { bold: true, size: 16, color: { argb: ARGB.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navy } };
      sheet.getRow(row).height = 34;
    } else if (row >= 5) {
      cell.font = { italic: true, size: 9, color: { argb: ARGB.muted } };
      sheet.getRow(row).height = 18;
    } else {
      cell.font = { size: 10, color: { argb: ARGB.ink } };
      sheet.getRow(row).height = 20;
    }
  }
  return lastHeaderRow + 1;
}

function addTableSheet(workbook: any, table: TableSpec, meta: ReportMeta): void {
  const columnCount = table.columns.length;
  const sheet = workbook.addWorksheet(table.name);
  addPageSetup(sheet);
  const firstRow = addHeaderBlock(sheet, meta, columnCount);
  const headerRow = firstRow;
  const noteLines = table.notes || [];
  noteLines.forEach((note, index) => {
    const rowNumber = firstRow + index;
    sheet.mergeCells(rowNumber, 1, rowNumber, columnCount);
    const cell = sheet.getCell(rowNumber, 1);
    cell.value = note;
    cell.font = { italic: true, size: 9, color: { argb: ARGB.muted } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(rowNumber).height = 18;
  });

  const headerExcelRow = headerRow + noteLines.length;
  sheet.getRow(headerExcelRow).height = 30;
  table.columns.forEach((column, index) => {
    const cell = sheet.getRow(headerExcelRow).getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 10, color: { argb: ARGB.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navyDark } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
    sheet.getColumn(index + 1).width = column.width ?? 18;
  });

  let excelRow = headerExcelRow + 1;
  table.rows.forEach((rowValues, rowIndex) => {
    const row = sheet.getRow(excelRow);
    row.height = 22;
    table.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const raw = column.formula ? { value: `=${column.formula(excelRow)}` } : splitCell(rowValues[colIndex]);
      const alignment = setCell(cell, raw, column.format, column.align ?? (typeof raw.value === "number" || raw.value instanceof Date ? "right" : "left"));
      cell.font = { size: 10, color: { argb: ARGB.ink } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 ? ARGB.stripe : ARGB.white },
      };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle", horizontal: alignment, wrapText: false };
    });
    excelRow += 1;
  });

  const lastDataRow = excelRow - 1;
  if (table.total && lastDataRow >= headerExcelRow + 1) {
    const row = sheet.getRow(excelRow);
    row.height = 26;
    const totals = table.total(excelRow);
    table.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const raw = splitCell(totals[colIndex]);
      const alignment = setCell(cell, raw, column.format, column.align ?? (typeof raw.value === "number" ? "right" : "left"));
      cell.font = { bold: true, size: 10, color: { argb: ARGB.navy } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.total } };
      cell.border = totalBorder;
      cell.alignment = { vertical: "middle", horizontal: alignment };
    });
    excelRow += 1;
  }

  if (lastDataRow >= headerExcelRow + 1) {
    sheet.autoFilter = {
      from: { row: headerExcelRow, column: 1 },
      to: { row: lastDataRow, column: columnCount },
    };
  }

  if (table.highlightBelow && lastDataRow >= headerExcelRow + 1) {
    const letter = sheet.getColumn(table.highlightBelow.column).letter;
    sheet.addConditionalFormatting({
      ref: `${letter}${headerExcelRow + 1}:${letter}${lastDataRow}`,
      rules: [
        {
          type: "cellIs",
          operator: "lessThan",
          formulae: [String(table.highlightBelow.value)],
          style: {
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.danger } },
            font: { bold: true, color: { argb: ARGB.dangerText } },
          },
        },
      ],
    });
  }

  sheet.views = [{ state: "frozen", ySplit: headerExcelRow }];
  sheet.pageSetup.printTitlesRow = `${headerExcelRow}:${headerExcelRow}`;
}

function addSummarySheet(workbook: any, summary: SummarySpec, meta: ReportMeta): void {
  const sheet = workbook.addWorksheet(summary.name);
  addPageSetup(sheet);
  const [labelHeader, valueHeader, noteHeader] = summary.columns || ["Komponen", "Nilai", "Catatan"];
  const [labelWidth, valueWidth, noteWidth] = summary.widths || [52, 22, 48];
  sheet.getColumn(1).width = labelWidth;
  sheet.getColumn(2).width = valueWidth;
  sheet.getColumn(3).width = noteWidth;
  const firstRow = addHeaderBlock(sheet, meta, 3);

  const headerRow = sheet.getRow(firstRow);
  sheet.pageSetup.printTitlesRow = `${firstRow}:${firstRow}`;
  headerRow.height = 28;
  [labelHeader, valueHeader, noteHeader].forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, size: 10, color: { argb: ARGB.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navyDark } };
    cell.alignment = { vertical: "middle", horizontal: index === 1 ? "right" : "left", indent: index === 1 ? 0 : 1 };
    cell.border = thinBorder;
  });

  let excelRow = firstRow + 1;
  summary.lines.forEach((line) => {
    if (line.kind === "spacer") {
      sheet.getRow(excelRow).height = 8;
      excelRow += 1;
      return;
    }
    const row = sheet.getRow(excelRow);
    row.height = line.kind === "section" ? 28 : 22;
    if (line.kind === "section") {
      sheet.mergeCells(excelRow, 1, excelRow, 2);
      const label = row.getCell(1);
      label.value = line.label;
      label.font = { bold: true, size: 11, color: { argb: ARGB.white } };
      label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navy } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      const value = row.getCell(3);
      if (line.value !== undefined) setCell(value, splitCell(line.value), "currency", "right");
      value.font = { bold: true, size: 11, color: { argb: ARGB.white } };
      value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navy } };
      value.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    } else if (line.kind === "subtotal") {
      sheet.mergeCells(excelRow, 1, excelRow, 2);
      const label = row.getCell(1);
      label.value = line.label;
      label.font = { bold: true, size: 10, color: { argb: ARGB.navy } };
      label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.grey } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      label.border = thinBorder;
      const value = row.getCell(3);
      if (line.value !== undefined) setCell(value, splitCell(line.value), "currency", "right");
      value.font = { bold: true, size: 10, color: { argb: ARGB.navy } };
      value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.grey } };
      value.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
      value.border = thinBorder;
    } else if (line.kind === "detail") {
      const label = row.getCell(1);
      label.value = line.label;
      label.font = { size: 10, color: { argb: ARGB.ink } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 3 };
      label.border = thinBorder;
      const value = row.getCell(2);
      if (line.value !== undefined) setCell(value, splitCell(line.value), "currency", "right");
      value.font = { size: 10, color: { argb: ARGB.ink } };
      value.alignment = { vertical: "middle", horizontal: "right" };
      value.border = thinBorder;
      const note = row.getCell(3);
      note.value = line.note || "";
      note.font = { size: 9, italic: true, color: { argb: ARGB.muted } };
      note.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      note.border = thinBorder;
    } else if (line.kind === "check") {
      sheet.mergeCells(excelRow, 1, excelRow, 2);
      const label = row.getCell(1);
      label.value = line.label;
      label.font = { size: 9, italic: true, color: { argb: ARGB.muted } };
      label.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      const value = row.getCell(3);
      value.value = line.value;
      const ok = /^ok$/i.test(String(line.value || ""));
      value.font = { bold: true, size: 9, color: { argb: ok ? ARGB.okText : ARGB.dangerText } };
      value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ok ? ARGB.ok : ARGB.danger } };
      value.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    }
    excelRow += 1;
  });

  sheet.views = [{ state: "frozen", ySplit: firstRow }];
}

export function buildWorkbook(meta: ReportMeta, sheets: Array<TableSpec | SummarySpec>): any {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ElektroMart";
  workbook.created = new Date();
  workbook.calcProperties = { fullCalcOnLoad: true, calcMode: "auto" };
  workbook.subject = meta.title;
  workbook.description = meta.notes?.join(" | ") || meta.platform || "ElektroMart";
  sheets.forEach((sheet) => {
    if (sheet.kind === "summary") addSummarySheet(workbook, sheet, meta);
    else addTableSheet(workbook, sheet, meta);
  });
  return workbook;
}

export async function downloadWorkbook(filename: string, workbook: any): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function reportDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Waktu cetak WIB untuk blok kepala laporan. */
export function reportDateTime(): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
}

/** Ubah `yyyy-mm-dd[ hh:mm]` menjadi Date untuk disimpan sebagai tipe tanggal Excel. */
export function excelDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = "00", minute = "00"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}
