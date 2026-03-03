import PDFDocument from "pdfkit";
import type { TimesheetWithRows, DayRow } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("fi-FI");
}

export async function generateTimesheetPdf(
  ts: TimesheetWithRows,
  email: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 80;

    // ── HEADER ──
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("KMR INFRA OY", 40, 40, { align: "center", width: W });

    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Työntekijä: ${email}`, { align: "center", width: W });

    if (ts.sent_at) {
      doc.text(`Lähetetty: ${formatDate(ts.sent_at.split("T")[0])}`, {
        align: "center",
        width: W,
      });
    }

    if (ts.address) {
      doc.text(`Kohde: ${ts.address}`, { align: "center", width: W });
    }

    doc.moveDown(1);

    // ── TABLE HEADER ──
    const cols = {
      date: { x: 40, w: 70 },
      project: { x: 110, w: 70 },
      meters: { x: 180, w: 45 },
      machines: { x: 225, w: 220 },
      sum: { x: 445, w: 70 },
    };

    const drawRow = (
      y: number,
      values: string[],
      bold = false,
      bg?: string
    ) => {
      const keys = Object.values(cols);
      if (bg) {
        doc.save().rect(40, y, W, 16).fill(bg).restore();
      }
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      values.forEach((v, i) => {
        doc.text(v, keys[i].x, y + 3, {
          width: keys[i].w - 4,
          ellipsis: true,
          lineBreak: false,
        });
      });
      doc
        .moveTo(40, y)
        .lineTo(40 + W, y)
        .strokeColor("#cccccc")
        .stroke();
    };

    let y = doc.y;
    drawRow(
      y,
      ["Päivämäärä", "Projekti", "m", "Koneet + h", "Yht. h"],
      true,
      "#eeeeee"
    );
    y += 18;

    const days = [...ts.rows].sort((a, b) => a.date.localeCompare(b.date));
    let totalHours = 0;

    days.forEach((day: DayRow, idx: number) => {
      const machineStr = Object.entries(day.machines)
        .filter(([, h]) => h && h > 0)
        .map(([name, h]) => `${name} ${h}h`)
        .join(", ");

      const dayHours: number = Object.values(day.machines).reduce<number>(
        (s, h) => s + (h ?? 0),
        0
      );
      totalHours += dayHours;

      const bg = idx % 2 === 0 ? "#ffffff" : "#f9f9f9";
      drawRow(
        y,
        [
          formatDate(day.date),
          day.project_no ?? "",
          day.meters != null ? String(day.meters) : "",
          machineStr,
          dayHours > 0 ? `${dayHours}` : "",
        ],
        false,
        bg
      );

      y += 18;

      if (day.note) {
        doc
          .fontSize(7)
          .font("Helvetica-Oblique")
          .fillColor("#555555")
          .text(`  Huomio: ${day.note}`, 44, y, { width: W - 10 });
        doc.fillColor("#000000");
        y += 14;
      }

      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 40;
      }
    });

    // ── FOOTER LINE ──
    doc
      .moveTo(40, y)
      .lineTo(40 + W, y)
      .strokeColor("#000000")
      .stroke();
    y += 6;

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`Tunteja yhteensä: ${totalHours} h`, 40, y, {
        align: "right",
        width: W,
      });

    doc.end();
  });
}
