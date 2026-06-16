"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import type { IARow } from "@/types/deep-analysis";
import { useT } from "@/lib/i18n";
import { generateIACsv, exportStyledIAXlsx, buildIAExportFilename } from "@/lib/deep-analyzer/export-service";

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function IAPreviewTable({
  rows,
  sourceUrl,
}: {
  rows: IARow[];
  sourceUrl: string;
}) {
  const t = useT();

  const handleDownloadCsv = () => {
    const csvContent = generateIACsv(rows);
    let domain = "site";
    try {
      domain = new URL(sourceUrl).hostname.replace(/\./g, "_");
    } catch {}
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `${domain}_ia_export_${today}.csv`;
    downloadText(csvContent, filename);
  };

  const handleDownloadExcel = async () => {
    const blob = await exportStyledIAXlsx(rows, sourceUrl);
    const filename = buildIAExportFilename(sourceUrl);
    downloadBlob(blob, filename);
  };

  // Build display rows: hide repeating Depth 0 values
  const displayRows = useMemo(() => {
    let prevDepth0 = "";
    return rows.map((row) => {
      const showDepth0 = row.depth0 !== prevDepth0;
      prevDepth0 = row.depth0;
      return { ...row, displayDepth0: showDepth0 ? row.depth0 : "" };
    });
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-400 font-medium sm:text-sm">
          {t("analysis.ia.description") || "Information Architecture (IA) layout generated automatically from analysis."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadExcel}
            disabled={rows.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500 active:bg-indigo-400 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {t("analysis.ia.downloadExcel") || "Download Styled IA XLSX"}
          </button>
          <button
            onClick={handleDownloadCsv}
            disabled={rows.length === 0}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-700 active:bg-slate-600 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {t("analysis.ia.downloadCsv") || "Download Raw CSV"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/40">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-3 py-3 w-32">{t("analysis.ia.cols.screenId") || "Screen ID"}</th>
              <th className="px-3 py-3 w-32">{t("analysis.ia.cols.depth0") || "Depth 0"}</th>
              <th className="px-3 py-3 w-32">{t("analysis.ia.cols.depth1") || "Depth 1"}</th>
              <th className="px-3 py-3 w-32">{t("analysis.ia.cols.depth2") || "Depth 2"}</th>
              <th className="px-3 py-3 w-32">{t("analysis.ia.cols.depth3") || "Depth 3"}</th>
              <th className="px-4 py-3">{t("analysis.ia.cols.contents") || "Contents"}</th>
              <th className="px-4 py-3 w-64">{t("analysis.ia.cols.comments") || "Comments"}</th>
              <th className="px-3 py-3 w-20">{t("analysis.ia.cols.link") || "Link"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {displayRows.map((row) => {
              const isGroupStart = !!row.displayDepth0;

              return (
                <tr
                  key={row.screenId}
                  className={`transition hover:bg-slate-800/30 ${isGroupStart ? "bg-slate-800/10" : ""}`}
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-400">
                    {row.screenId}
                  </td>
                  <td className={`px-3 py-2.5 font-semibold transition-all ${
                    isGroupStart ? "text-indigo-400" : "text-transparent select-none"
                  }`}>
                    {row.displayDepth0 || "\u00A0"}
                  </td>
                  <td className="px-3 py-2.5 text-white">
                    {row.depth1}
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">
                    {row.depth2 ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-400">
                    {row.depth3 ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 leading-relaxed max-w-sm break-words">
                    {row.contents || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 max-w-xs break-words">
                    {row.comments || "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <a
                      href={row.asIsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 hover:underline"
                    >
                      AS-IS ↗
                    </a>
                  </td>
                </tr>
              );
            })}
            
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <p className="font-semibold text-slate-400">
                    {t("analysis.ia.empty") || "No Information Architecture records generated"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {t("analysis.ia.emptySub") || "Ensure the analysis has valid content. If the analysis failed or has zero content, no IA data can be generated."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
