/*
 * Styled Excel report builder.
 * Generates real .xlsx workbooks with formatted tables, frozen headers,
 * column widths, currency formats and Excel formulas for derived values.
 */
import ExcelJS from "exceljs/dist/exceljs.min.js";

export type CellFormat = "currency" | "number" | "percent" | "percentValue" | "text";

export type CellValue =
  | string
  | number
  | null
  | undefined
  | { value: string | number; format?: CellFormat };

export type ColumnSpec = {
  header: string;
  width?: number;
  format?: CellFormat;
  /** Excel formula for this column; receives the 1-based Excel row number. */
  formula?: (row: number) => string;
};

export type TableSpec = {
  name: string;
  title: string;
  subtitle?: string;
  columns: ColumnSpec[];
  rows: CellValue[][];
  /** Total row; receives the 1-based Excel row number of the total row. */
  total?: (row: number) => CellValue[];
  highlightBelow?: { column: number; value: number };
};

type WorkbookMeta = {
  title: string;
  subtitle?: string;
  generatedLabel: string;
};

const ARGB = {
  navy: "FF1F3557",
  navyDark: "FF162A47",
  white: "FFFFFFFF",
  ink: "FF243247",
  muted: "FF64748B",
  stripe: "FFF8FAFC",
  border: "FFD9E2F0",
  total: "FFE8EEF8",
  danger: "FFFDECEC",
  dangerText: "FFE11D48",
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
      return '"Rp " #,##0';
    case "number":
      return "#,##0";
    case "percent":
      return "0.0%";
    case "percentValue":
      return '0.0"%"';
    default:
      return undefined;
  }
}

function splitCell(cell: CellValue): { value: string | number; format?: CellFormat } {
  if (cell && typeof cell === "object" && "value" in cell) return cell;
  return { value: (cell ?? "") as string | number };
}

function addTableSheet(workbook: any, table: TableSpec): void {
  const columnCount = table.columns.length;
  const sheet = workbook.addWorksheet(table.name, {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      paperSize: 9,
    },
    headerFooter: { oddFooter: "&C ElektroMart — &P / &N" },
  });

  // Title
  sheet.mergeCells(1, 1, 1, columnCount);
  const title = sheet.getCell(1, 1);
  title.value = table.title;
  title.font = { bold: true, size: 16, color: { argb: ARGB.white } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navy } };
  title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 34;

  // Subtitle
  sheet.mergeCells(2, 1, 2, columnCount);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = table.subtitle || "";
  subtitle.font = { italic: true, size: 10, color: { argb: ARGB.muted } };
  subtitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(2).height = 20;
  sheet.getRow(3).height = 8;

  // Header row (row 4)
  const headerRow = sheet.getRow(4);
  headerRow.height = 30;
  table.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { bold: true, size: 10, color: { argb: ARGB.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.navyDark } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder;
    sheet.getColumn(index + 1).width = column.width ?? 18;
  });

  let excelRow = 5;
  table.rows.forEach((rowValues, rowIndex) => {
    const row = sheet.getRow(excelRow);
    row.height = 22;
    table.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const raw = column.formula
        ? { value: `=${column.formula(excelRow)}` as string }
        : splitCell(rowValues[colIndex]);
      const isFormula = typeof raw.value === "string" && raw.value.startsWith("=");
      cell.value = isFormula && typeof raw.value === "string"
        ? { formula: raw.value.slice(1) }
        : raw.value;
      cell.font = { size: 10, color: { argb: ARGB.ink } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowIndex % 2 ? ARGB.stripe : ARGB.white },
      };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: typeof raw.value === "number" ? "right" : "left",
        wrapText: false,
      };
      const format = excelFormat(raw.format ?? column.format);
      if (format) cell.numFmt = format;
    });
    excelRow++;
  });

  const lastDataRow = excelRow - 1;

  // Skip the total row when there is no data: SUM(D5:D5) would be circular.
  if (table.total && lastDataRow >= 5) {
    const row = sheet.getRow(excelRow);
    row.height = 26;
    const totals = table.total(excelRow);
    table.columns.forEach((column, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const raw = splitCell(totals[colIndex]);
      const isFormula = typeof raw.value === "string" && raw.value.startsWith("=");
      cell.value = isFormula && typeof raw.value === "string"
        ? { formula: raw.value.slice(1) }
        : raw.value;
      cell.font = { bold: true, size: 10, color: { argb: ARGB.navy } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ARGB.total } };
      cell.border = totalBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: typeof raw.value === "number" ? "right" : "left",
      };
      const format = excelFormat(raw.format ?? column.format);
      if (format) cell.numFmt = format;
    });
    excelRow++;
  }

  if (lastDataRow >= 5) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: lastDataRow, column: columnCount },
    };
  }

  if (table.highlightBelow && lastDataRow >= 5) {
    const letter = sheet.getColumn(table.highlightBelow.column).letter;
    sheet.addConditionalFormatting({
      ref: `${letter}5:${letter}${lastDataRow}`,
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
}

export function buildWorkbook(meta: WorkbookMeta, tables: TableSpec[]): any {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ElektroMart";
  workbook.created = new Date();
  workbook.calcProperties = { fullCalcOnLoad: true, calcMode: "auto" };
  workbook.subject = meta.title;
  workbook.description = meta.subtitle || meta.generatedLabel;
  tables.forEach((table) => addTableSheet(workbook, table));
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
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
