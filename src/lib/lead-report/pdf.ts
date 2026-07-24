// Client-side PDF report generation (Phase 1 / Variant A — see docs/tz-speed-calc-email-gate.md §5).
// Renders a branded one-pager from a data snapshot + optional chart screenshots.
// Swappable later for a server-rendered (Cloud Run + Puppeteer) version without changing callers.

export type ReportMetric = { label: string; value: string; sub?: string };

export type ReportSnapshot = {
  toolLabel: string; // e.g. "Site Speed Revenue-Loss Calculator"
  headline: string; // e.g. "−€71.739/month lost to slow load times"
  metrics: ReportMetric[];
  bullets?: string[]; // e.g. selected optimizations
  ctaLabel: string;
  ctaHref: string;
};

const INK = "#0B0F14";
const SLATE = "#5B6472";
const ACCENT = "#F59E0B";

async function chartToImage(el: Element | null): Promise<string | null> {
  if (!el) return null;
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(el as HTMLElement, { backgroundColor: "#ffffff", scale: 2 });
  return canvas.toDataURL("image/png");
}

export async function generateReportPdf(
  snapshot: ReportSnapshot,
  chartEls: Element[] = []
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  doc.setFillColor(INK);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CommerceLead", margin, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(ACCENT);
  doc.text(snapshot.toolLabel, pageW - margin, 40, { align: "right" });

  y = 100;
  doc.setTextColor(INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  const headlineLines = doc.splitTextToSize(snapshot.headline, pageW - margin * 2);
  doc.text(headlineLines, margin, y);
  y += headlineLines.length * 24 + 12;

  const colW = (pageW - margin * 2 - 16) / 2;
  snapshot.metrics.forEach((m, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colW + 16);
    const rowY = y + row * 64;
    doc.setFillColor("#F7F5F0");
    doc.rect(x, rowY, colW, 52, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(SLATE);
    doc.text(m.label.toUpperCase(), x + 12, rowY + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(INK);
    doc.text(m.value, x + 12, rowY + 38);
    if (m.sub) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(SLATE);
      doc.text(m.sub, x + 12, rowY + 48);
    }
  });
  y += Math.ceil(snapshot.metrics.length / 2) * 64 + 20;

  for (const el of chartEls) {
    const img = await chartToImage(el);
    if (!img) continue;
    const props = doc.getImageProperties(img);
    const w = pageW - margin * 2;
    const h = (props.height / props.width) * w;
    if (y + h > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = margin;
    }
    doc.addImage(img, "PNG", margin, y, w, h);
    y += h + 16;
  }

  if (snapshot.bullets?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(INK);
    doc.text("Selected optimizations", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const b of snapshot.bullets) {
      doc.text(`• ${b}`, margin, y);
      y += 14;
    }
    y += 8;
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(ACCENT);
  doc.rect(margin, pageH - 70, pageW - margin * 2, 40, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(snapshot.ctaLabel, margin + 16, pageH - 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(snapshot.ctaHref, pageW - margin - 16, pageH - 45, { align: "right" });

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
