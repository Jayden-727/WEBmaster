import type { CrawledPage, RefinedPage, MarkdownTemplateSections, IARow } from "@/types/deep-analysis";
import { generateMarkdown } from "./markdown-generator";
import { inferBrandFromHostname, inferLocaleFromUrl, getBrandCode } from "./ia-generator";
import ExcelJS from "exceljs";

export function generateCombinedMarkdown(
  pages: CrawledPage[],
  rootUrl: string,
  templateOverrides?: Partial<MarkdownTemplateSections>,
): string {
  const successPages = pages.filter((p) => p.status === "success");
  const lines: string[] = [];

  lines.push(`# Site Analysis Report`);
  lines.push("");
  lines.push(`**Root URL:** ${rootUrl}`);
  lines.push(`**Total Pages:** ${successPages.length}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## Table of Contents");
  lines.push("");
  for (let i = 0; i < successPages.length; i++) {
    const p = successPages[i];
    let pathname = "/";
    try { pathname = new URL(p.url).pathname || "/"; } catch {}
    lines.push(`${i + 1}. [${p.title || pathname}](#page-${i + 1})`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < successPages.length; i++) {
    const page = successPages[i];
    lines.push(`<a id="page-${i + 1}"></a>`);
    lines.push("");
    lines.push(generateMarkdown(page, templateOverrides));
    lines.push("");
    if (i < successPages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function generateSinglePageMarkdown(
  page: CrawledPage,
  templateOverrides?: Partial<MarkdownTemplateSections>,
): string {
  return generateMarkdown(page, templateOverrides);
}

export function combinedFromRefined(
  refinedPages: RefinedPage[],
  rootUrl: string,
): string {
  const lines: string[] = [];

  lines.push(`# Site Analysis Report`);
  lines.push("");
  lines.push(`**Root URL:** ${rootUrl}`);
  lines.push(`**Total Pages:** ${refinedPages.length}`);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (let i = 0; i < refinedPages.length; i++) {
    lines.push(refinedPages[i].markdown);
    lines.push("");
    if (i < refinedPages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

function escapeCsv(val: string | null | undefined): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateIACsv(rows: IARow[]): string {
  const headers = ["Screen ID", "Depth 0", "Depth 1", "Depth 2", "Depth 3", "Contents", "Comments", "AS-IS URL"];
  const csvLines: string[] = [headers.join(",")];

  for (const r of rows) {
    const line = [
      escapeCsv(r.screenId),
      escapeCsv(r.depth0),
      escapeCsv(r.depth1),
      escapeCsv(r.depth2),
      escapeCsv(r.depth3),
      escapeCsv(r.contents),
      escapeCsv(r.comments),
      escapeCsv(r.asIsUrl),
    ];
    csvLines.push(line.join(","));
  }

  // UTF-8 BOM
  return "\uFEFF" + csvLines.join("\n");
}

/* ─── Styled XLSX IA Export via ExcelJS ─── */

export function buildIAExportFilename(rootUrl: string): string {
  try {
    const url = new URL(rootUrl);
    const brand = inferBrandFromHostname(url.hostname);
    const locale = inferLocaleFromUrl(url);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const cleanBrand = brand.replace(/[^a-zA-Z0-9가-힣]/g, "");
    return `${cleanBrand}_${locale}_IA분석_${date}.xlsx`;
  } catch {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `Site_GLOBAL_IA분석_${date}.xlsx`;
  }
}

function buildSheetName(rootUrl: string): string {
  try {
    const url = new URL(rootUrl);
    const brand = inferBrandFromHostname(url.hostname).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const locale = inferLocaleFromUrl(url);
    const name = `${brand}_${locale}_IA`;
    // Excel sheet names max 31 chars; remove invalid chars
    return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31);
  } catch {
    return "IA_Layout";
  }
}

/**
 * Build display rows with Depth 0 shown only on the first row of each group.
 */
function buildDisplayRows(rows: IARow[]): IARow[] {
  let previousDepth0 = "";
  return rows.map((row) => {
    const shouldShowDepth0 = row.depth0 !== previousDepth0;
    previousDepth0 = row.depth0;
    return {
      ...row,
      depth0: shouldShowDepth0 ? row.depth0 : "",
    };
  });
}

export async function exportStyledIAXlsx(
  rows: IARow[],
  rootUrl: string,
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AttractiveWebAI / WEBmaster";
  workbook.created = new Date();

  const sheetName = buildSheetName(rootUrl);
  const worksheet = workbook.addWorksheet(sheetName);

  // Infer brand/locale for title
  let brand = "Site";
  let locale = "GLOBAL";
  try {
    const urlObj = new URL(rootUrl);
    brand = inferBrandFromHostname(urlObj.hostname);
    locale = inferLocaleFromUrl(urlObj);
  } catch {}

  /* ── Styles ── */
  const darkFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F1F1F" },
  };

  const groupHighlightFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD9D9D9" } },
    left: { style: "thin", color: { argb: "FFD9D9D9" } },
    bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
    right: { style: "thin", color: { argb: "FFD9D9D9" } },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    color: { argb: "FFFFFFFF" },
    bold: true,
    size: 10,
    name: "Arial",
  };

  const bodyFont: Partial<ExcelJS.Font> = {
    color: { argb: "FF111111" },
    size: 10,
    name: "Arial",
  };

  const linkFont: Partial<ExcelJS.Font> = {
    color: { argb: "FF0563C1" },
    underline: true,
    size: 10,
    name: "Arial",
  };

  const bodyAlignment: Partial<ExcelJS.Alignment> = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };

  /* ── Column widths (no auto-header) ── */
  worksheet.columns = [
    { key: "screenId", width: 16 },
    { key: "depth0", width: 18 },
    { key: "depth1", width: 24 },
    { key: "depth2", width: 22 },
    { key: "depth3", width: 22 },
    { key: "contents", width: 48 },
    { key: "comments", width: 46 },
    { key: "asIsUrl", width: 72 },
  ];

  /* ── Row 1: Title / URL ── */
  const titleRow = worksheet.getRow(1);
  titleRow.height = 28;
  titleRow.getCell(1).value = `${brand.toUpperCase()} ${locale} IA`;
  titleRow.getCell(1).font = { ...headerFont, size: 12 };
  titleRow.getCell(1).fill = darkFill;
  titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  titleRow.getCell(1).border = thinBorder;

  // Merge B1:H1 for root URL
  worksheet.mergeCells("B1:H1");
  const urlTitleCell = titleRow.getCell(2);
  urlTitleCell.value = { text: rootUrl, hyperlink: rootUrl };
  urlTitleCell.font = { ...headerFont, size: 10, underline: true };
  urlTitleCell.fill = darkFill;
  urlTitleCell.alignment = { vertical: "middle", horizontal: "left" };
  urlTitleCell.border = thinBorder;

  /* ── Row 2: Blank spacer ── */
  const spacerRow = worksheet.getRow(2);
  spacerRow.height = 12;

  /* ── Row 3: Header Row ── */
  const HEADERS = ["Screen ID", "Depth 0", "Depth 1", "Depth 2", "Depth 3", "Contents", "Comments", "AS-IS URL"];
  const headerRow = worksheet.getRow(3);
  headerRow.height = 22;
  HEADERS.forEach((h, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = darkFill;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });

  /* ── Freeze below row 3 ── */
  worksheet.views = [
    { state: "frozen", ySplit: 3, xSplit: 0, topLeftCell: "A4", activeCell: "A4" },
  ];

  /* ── Auto-filter on header ── */
  worksheet.autoFilter = { from: "A3", to: "H3" };

  /* ── Row 4+: Data Rows ── */
  const displayRows = buildDisplayRows(rows);

  displayRows.forEach((row, idx) => {
    const excelRow = worksheet.getRow(idx + 4);
    excelRow.height = 24;

    excelRow.getCell(1).value = row.screenId;
    excelRow.getCell(2).value = row.depth0;
    excelRow.getCell(3).value = row.depth1;
    excelRow.getCell(4).value = row.depth2 || "-";
    excelRow.getCell(5).value = row.depth3 || "-";
    excelRow.getCell(6).value = row.contents || "-";
    excelRow.getCell(7).value = row.comments || "-";

    // AS-IS URL with hyperlink
    const asIsUrl = row.asIsUrl || "";
    if (asIsUrl && asIsUrl.startsWith("http")) {
      excelRow.getCell(8).value = { text: asIsUrl, hyperlink: asIsUrl };
      excelRow.getCell(8).font = linkFont;
    } else {
      excelRow.getCell(8).value = asIsUrl || "-";
      excelRow.getCell(8).font = bodyFont;
    }

    // Apply borders, alignment, font to all cells
    for (let col = 1; col <= 8; col++) {
      const cell = excelRow.getCell(col);
      cell.border = thinBorder;
      cell.alignment = bodyAlignment;
      if (col !== 8) {
        cell.font = bodyFont;
      }
    }

    // Depth 0 group first row: highlight background + bold Depth 0 cell
    if (row.depth0) {
      for (let col = 1; col <= 8; col++) {
        excelRow.getCell(col).fill = groupHighlightFill;
      }
      excelRow.getCell(2).font = { ...bodyFont, bold: true };
    }
  });

  /* ── Generate Blob ── */
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
