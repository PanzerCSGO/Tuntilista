import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";
import type { TimesheetWithRows, DayRow } from "@/lib/types";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}.${m}.${y}`;
}

function getWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export async function generateTimesheetPdf(
  ts: TimesheetWithRows,
  workerName: string
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Embed logo
  let logoImage: Awaited<ReturnType<typeof pdf.embedJpg>> | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "kmr-logo.jpg");
    const logoBytes = await readFile(logoPath);
    logoImage = await pdf.embedJpg(logoBytes);
  } catch {
    // Logo not found, continue without it
  }

  const pageW = 595.28; // A4
  const pageH = 841.89;
  const margin = 40;
  const W = pageW - margin * 2;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin;

  function ensureSpace(needed: number) {
    if (y - needed < margin) {
      page = pdf.addPage([pageW, pageH]);
      y = pageH - margin;
    }
  }

  function drawText(
    text: string,
    x: number,
    yPos: number,
    size: number,
    f = font,
    color = rgb(0, 0, 0)
  ) {
    page.drawText(text, { x, y: yPos, size, font: f, color });
  }

  function textWidth(text: string, size: number, f = font) {
    return f.widthOfTextAtSize(text, size);
  }

  // ── HEADER WITH LOGO ──
  const logoH = 50;
  const logoW = logoImage ? (logoImage.width / logoImage.height) * logoH : 0;

  if (logoImage) {
    page.drawImage(logoImage, {
      x: margin,
      y: y - logoH + 8,
      width: logoW,
      height: logoH,
    });
  }

  // Company name + worker name right of logo
  const textX = logoImage ? margin + logoW + 15 : margin;
  drawText("KMR INFRA OY", textX, y - 4, 14, fontBold);
  drawText(`Ty\u00F6ntekij\u00E4: ${workerName}`, textX, y - 20, 9, font, rgb(0.3, 0.3, 0.3));

  // Week number
  const days = [...ts.rows].sort((a, b) => a.date.localeCompare(b.date));
  let weekLabel = "";
  if (days.length > 0) {
    const firstWeek = getWeekNumber(days[0].date);
    const lastWeek = getWeekNumber(days[days.length - 1].date);
    weekLabel = firstWeek === lastWeek
      ? `Viikko ${firstWeek}`
      : `Viikot ${firstWeek}\u2013${lastWeek}`;
  }
  if (weekLabel) {
    const weekW = textWidth(weekLabel, 12, fontBold);
    drawText(weekLabel, margin + W - weekW, y - 4, 12, fontBold);
  }

  // Date sent
  if (ts.sent_at) {
    const sentText = `L\u00E4hetetty: ${formatDate(ts.sent_at.split("T")[0])}`;
    const sentW = textWidth(sentText, 8);
    drawText(sentText, margin + W - sentW, y - 18, 8, font, rgb(0.4, 0.4, 0.4));
  }

  y -= logoH + 15;

  // Separator line
  page.drawLine({
    start: { x: margin, y },
    end: { x: margin + W, y },
    thickness: 1.5,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 15;

  // ── TABLE HEADER ──
  const cols = [
    { label: "PVM", x: margin, w: 55 },
    { label: "KOHDE", x: margin + 55, w: 90 },
    { label: "PROJEKTI NRO", x: margin + 145, w: 65 },
    { label: "KAIVUU METRIT", x: margin + 210, w: 65 },
    { label: "TY\u00D6TUNNIT", x: margin + 275, w: 150 },
    { label: "TUNNIT YHT.", x: margin + 425, w: 50 },
  ];

  function drawTableHeader() {
    page.drawRectangle({
      x: margin,
      y: y - 12,
      width: W,
      height: 16,
      color: rgb(0.15, 0.15, 0.15),
    });
    for (const col of cols) {
      drawText(col.label, col.x + 2, y - 8, 8, fontBold, rgb(1, 1, 1));
    }
    y -= 18;
  }

  drawTableHeader();

  // ── DATA ROWS ──
  let totalHours = 0;
  let totalMeters = 0;

  days.forEach((day: DayRow, idx: number) => {
    const machineStr = Object.entries(day.machines)
      .filter(([, h]) => h && h > 0)
      .map(([name, h]) => `${name} ${h}h`)
      .join(", ");

    const dayHours = Object.values(day.machines).reduce<number>(
      (s, h) => s + (h ?? 0),
      0
    );
    totalHours += dayHours;
    totalMeters += day.meters ?? 0;

    ensureSpace(18);

    // Alternating row bg
    if (idx % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - 12,
        width: W,
        height: 16,
        color: rgb(0.97, 0.97, 0.97),
      });
    }

    // Line above
    page.drawLine({
      start: { x: margin, y: y + 4 },
      end: { x: margin + W, y: y + 4 },
      thickness: 0.3,
      color: rgb(0.85, 0.85, 0.85),
    });

    const rowData = [
      formatDate(day.date),
      day.address || "",
      day.project_no || "",
      day.meters != null ? String(day.meters) : "",
      machineStr,
      dayHours > 0 ? String(dayHours) : "",
    ];

    for (let i = 0; i < cols.length; i++) {
      let text = rowData[i];
      const maxW = cols[i].w - 4;
      while (textWidth(text, 8) > maxW && text.length > 1) {
        text = text.slice(0, -1);
      }
      drawText(text, cols[i].x + 2, y - 8, 8);
    }

    y -= 18;
  });

  // ── FOOTER ──
  ensureSpace(50);

  // Top line
  page.drawLine({
    start: { x: margin, y: y + 4 },
    end: { x: margin + W, y: y + 4 },
    thickness: 1.5,
    color: rgb(0.15, 0.15, 0.15),
  });
  y -= 6;

  // Summary background
  page.drawRectangle({
    x: margin,
    y: y - 20,
    width: W,
    height: 24,
    color: rgb(0.96, 0.96, 0.96),
  });

  // Total hours (right)
  const hoursText = `Tunnit yhteens\u00E4: ${totalHours} h`;
  const hoursW = textWidth(hoursText, 11, fontBold);
  drawText(hoursText, margin + W - hoursW - 4, y - 8, 11, fontBold);

  // Total meters (left)
  if (totalMeters > 0) {
    const metersText = `Metrit yhteens\u00E4: ${totalMeters}`;
    drawText(metersText, margin + 4, y - 8, 11, fontBold);
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
