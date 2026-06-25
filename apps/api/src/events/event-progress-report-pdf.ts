import PDFDocument from "pdfkit";
import {
  formatCalendarDate,
  formatDateTime,
  formatUGX,
  progressPercent,
} from "../common/format-ugx";
import {
  INTER_BOLD,
  INTER_REGULAR,
  registerInterFonts,
} from "./event-progress-report-fonts";
import type {
  ProgressReportContributionRow,
  ProgressReportData,
} from "./event-progress-report.types";

export type {
  ProgressReportContributionRow,
  ProgressReportData,
  ProgressReportEventDetails,
  ProgressReportMilestoneRow,
  ProgressReportWithdrawalRow,
} from "./event-progress-report.types";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  forest: "#2C3320",
  sageDeep: "#8FAE66",
  cream: "#FAF7EC",
  creamEdge: "#F3EFE0",
  ink: "#23271B",
  inkSoft: "#5C6450",
  line: "#E4E0D0",
  goldLine: "#F0E9C9",
  white: "#FFFFFF",
  headerMuted: "#B7C2A2",
  paid: "#5C8A4A",
  pledged: "#B8893A",
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  introduction: "Give away, Introductions",
  funeral: "Condolences",
  charity: "Charity",
  other: "Others, specify",
};

function formatEventTypeLabel(type: string, typeLabel?: string | null): string {
  if (type === "other" && typeLabel?.trim()) {
    return typeLabel.trim();
  }
  return EVENT_TYPE_LABELS[type] ?? type;
}

function paidStatusLabel(c: ProgressReportContributionRow): string {
  if (c.manual) return "Paid · manual";
  return "Paid";
}

function pledgedStatusLabel(c: ProgressReportContributionRow): string {
  if (c.pledgeHopeBy) {
    return `Pledged · by ${formatCalendarDate(c.pledgeHopeBy, "short")}`;
  }
  return "Pledged";
}

function collectPdfBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  if (doc.y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage({ size: "A4", margin: 0 });
    doc.y = MARGIN;
  }
}

function drawSummaryTable(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  caption: string,
  rows: Array<{ label: string; value: string; accent?: boolean }>
): number {
  const captionHeight = 24;
  const rowHeight = 22;
  const totalHeight = captionHeight + rows.length * rowHeight;

  doc.save();
  doc.rect(x, doc.y, width, totalHeight).fill(COLORS.white);
  doc.rect(x, doc.y, width, captionHeight).fill(COLORS.creamEdge);
  doc
    .fillColor(COLORS.inkSoft)
    .font(INTER_BOLD)
    .fontSize(8)
    .text(caption.toUpperCase(), x + 12, doc.y + 8, { width: width - 24 });
  let rowY = doc.y + captionHeight;
  for (const row of rows) {
    doc
      .moveTo(x, rowY)
      .lineTo(x + width, rowY)
      .strokeColor(COLORS.goldLine)
      .stroke();
    doc
      .fillColor(COLORS.inkSoft)
      .font(INTER_REGULAR)
      .fontSize(9)
      .text(row.label, x + 12, rowY + 6, { width: width * 0.5 - 16 });
    doc
      .fillColor(row.accent ? COLORS.sageDeep : COLORS.ink)
      .font(INTER_BOLD)
      .fontSize(9)
      .text(row.value, x + width * 0.5, rowY + 6, {
        width: width * 0.5 - 12,
        align: "right",
      });
    rowY += rowHeight;
  }
  doc.restore();
  return totalHeight;
}

type TableColumn = { header: string; width: number; align?: "left" | "right" };

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: string[][]
): void {
  const rowHeight = 18;
  const headerHeight = 18;

  function drawRow(cells: string[], bold: boolean, fill?: string): void {
    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    if (fill) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(fill);
      doc.fillColor(COLORS.ink);
    }
    let x = MARGIN;
    doc.fontSize(8.5).font(bold ? INTER_BOLD : INTER_REGULAR);
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      const text = cells[i] ?? "";
      doc.fillColor(bold ? COLORS.inkSoft : COLORS.ink).text(text, x + 8, y + 5, {
        width: col.width - 12,
        align: col.align ?? "left",
        lineBreak: false,
        ellipsis: true,
      });
      x += col.width;
    }
    doc.y = y + rowHeight;
  }

  drawRow(
    columns.map((c) => c.header),
    true,
    COLORS.creamEdge
  );
  for (const row of rows) {
    ensureSpace(doc, rowHeight);
    const y = doc.y;
    doc
      .moveTo(MARGIN, y)
      .lineTo(MARGIN + CONTENT_WIDTH, y)
      .strokeColor(COLORS.goldLine)
      .stroke();
    drawRow(row, false);
  }
  doc.moveDown(0.35);
}

function sectionLabel(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 28);
  doc.moveDown(0.6);
  doc
    .fillColor(COLORS.inkSoft)
    .font(INTER_BOLD)
    .fontSize(9)
    .text(title.toUpperCase(), MARGIN + 4, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.35);
}

function cardBoxStart(doc: PDFKit.PDFDocument, height: number): number {
  ensureSpace(doc, height);
  const top = doc.y;
  doc
    .roundedRect(MARGIN, top, CONTENT_WIDTH, height, 12)
    .lineWidth(1)
    .strokeColor(COLORS.line)
    .fillAndStroke(COLORS.white, COLORS.line);
  return top;
}

export async function buildProgressReportPdf(
  data: ProgressReportData
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  registerInterFonts(doc);
  const { event } = data;
  const eventProgress = progressPercent(event.raisedAmount, event.targetAmount);
  const paid = data.contributions.filter((c) => c.status === "paid");
  const pledged = data.contributions.filter((c) => c.status === "pledged");
  const typeLabel = formatEventTypeLabel(event.type, event.typeLabel);
  const { withdrawSummary } = data;
  const generatedOn = `Generated on ${formatDateTime(data.generatedAt)}`;

  doc.rect(0, 0, PAGE_WIDTH, 6).fill(COLORS.goldLine);
  doc.y = 6;

  const headerHeight = 52;
  const headerTop = doc.y;
  doc.rect(0, headerTop, PAGE_WIDTH, headerHeight).fill(COLORS.forest);
  doc
    .fillColor(COLORS.cream)
    .font(INTER_BOLD)
    .fontSize(14)
    .text("CeremonyWallet · Event Progress Report", MARGIN, headerTop + 16, {
      width: CONTENT_WIDTH * 0.62,
      lineBreak: false,
    });
  doc
    .fillColor(COLORS.headerMuted)
    .font(INTER_REGULAR)
    .fontSize(9)
    .text(generatedOn, MARGIN, headerTop + 20, {
      width: CONTENT_WIDTH,
      align: "right",
      lineBreak: false,
    });
  doc.y = headerTop + headerHeight;

  const summaryTop = doc.y;
  const colWidth = CONTENT_WIDTH / 2;
  const leftRows: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Event", value: event.title },
    { label: "Type", value: typeLabel },
    { label: "Organizer", value: event.organizer },
    { label: "Event date", value: formatCalendarDate(event.date) },
    { label: "Location", value: event.location },
    { label: "Treasurer phone", value: event.treasurerPhone },
  ];
  if (event.statusChangedAt) {
    leftRows.push({
      label: "Stopped on",
      value: formatDateTime(event.statusChangedAt),
    });
  }
  const leftHeight = drawSummaryTable(
    doc,
    MARGIN,
    colWidth,
    "Event details",
    leftRows
  );
  const savedY = summaryTop;
  doc.y = summaryTop;
  const rightHeight = drawSummaryTable(
    doc,
    MARGIN + colWidth,
    colWidth,
    "Financial summary",
    [
      { label: "Target", value: formatUGX(event.targetAmount) },
      {
        label: "Total raised",
        value: formatUGX(event.raisedAmount),
        accent: true,
      },
      { label: "Progress", value: `${eventProgress}%`, accent: true },
      { label: "Cash contributions", value: String(paid.length) },
      { label: "Pledged contributions", value: String(pledged.length) },
      {
        label: "Withdrawn so far",
        value: formatUGX(withdrawSummary.withdrawnSoFar),
      },
    ]
  );
  doc.y = summaryTop + Math.max(leftHeight, rightHeight) + 8;


  doc.y += 8;

  if (data.milestones.length > 0) {
    sectionLabel(doc, "Milestones");
    for (const m of data.milestones) {
      const pct = progressPercent(m.raisedAmount, m.targetAmount);
      const blockHeight = 54;
      const top = cardBoxStart(doc, blockHeight);
      doc
        .fillColor(COLORS.ink)
        .font(INTER_BOLD)
        .fontSize(10)
        .text(m.name, MARGIN + 16, top + 12, { width: CONTENT_WIDTH * 0.45 });
      doc
        .fillColor(COLORS.inkSoft)
        .font(INTER_REGULAR)
        .fontSize(9)
        .text(
          `${formatUGX(m.raisedAmount)} of ${formatUGX(m.targetAmount)}`,
          MARGIN + CONTENT_WIDTH * 0.45,
          top + 12,
          { width: CONTENT_WIDTH * 0.45, align: "right" }
        );
      const barY = top + 30;
      doc
        .roundedRect(MARGIN + 16, barY, CONTENT_WIDTH - 32, 8, 4)
        .fill(COLORS.creamEdge);
      if (pct > 0) {
        doc
          .roundedRect(
            MARGIN + 16,
            barY,
            ((CONTENT_WIDTH - 32) * pct) / 100,
            8,
            4
          )
          .fill(COLORS.sageDeep);
      }
      doc
        .fillColor(COLORS.inkSoft)
        .font(INTER_BOLD)
        .fontSize(8)
        .text(`${pct}% complete`, MARGIN + 16, barY + 12, {
          width: CONTENT_WIDTH - 32,
          align: "right",
        });
      doc.y = top + blockHeight + 8;
    }
  }

  if (data.contributions.length > 0) {
    sectionLabel(doc, `Contributions · ${data.contributions.length} total`);
    ensureSpace(doc, 24);
    doc.moveDown(0.8);

    if (paid.length > 0) {
      doc
        .fillColor(COLORS.ink)
        .font(INTER_BOLD)
        .fontSize(9.5)
        .text(`Cash contributions • ${paid.length}`, MARGIN + 12);
      doc.moveDown(0.25);
      drawTable(
        doc,
        [
          { header: "Contributor", width: CONTENT_WIDTH * 0.28 },
          { header: "Amount", width: CONTENT_WIDTH * 0.18, align: "right" },
          { header: "Status", width: CONTENT_WIDTH * 0.24 },
          { header: "Date", width: CONTENT_WIDTH * 0.3 },
        ],
        paid.map((c) => [
          c.name,
          formatUGX(c.amount),
          paidStatusLabel(c),
          formatCalendarDate(c.date, "short"),
        ])
      );
    }

    if (pledged.length > 0) {
      doc
        .fillColor(COLORS.ink)
        .font(INTER_BOLD)
        .fontSize(9.5)
        .text(`Pledged contributions • ${pledged.length}`, MARGIN + 12);
      doc.moveDown(0.25);
      drawTable(
        doc,
        [
          { header: "Contributor", width: CONTENT_WIDTH * 0.28 },
          { header: "Amount", width: CONTENT_WIDTH * 0.18, align: "right" },
          { header: "Status", width: CONTENT_WIDTH * 0.3 },
          { header: "Milestone", width: CONTENT_WIDTH * 0.24 },
        ],
        pledged.map((c) => [
          c.name,
          formatUGX(c.amount),
          pledgedStatusLabel(c),
          c.milestoneName ?? "•",
        ])
      );
    }
  }

  sectionLabel(doc, "Withdrawals");

  if (data.withdrawals.length > 0) {
    drawTable(
      doc,
      [
        { header: "Date", width: CONTENT_WIDTH * 0.16 },
        { header: "Reference", width: CONTENT_WIDTH * 0.24 },
        { header: "Method", width: CONTENT_WIDTH * 0.18 },
        { header: "Status", width: CONTENT_WIDTH * 0.14 },
        { header: "Net", width: CONTENT_WIDTH * 0.14, align: "right" },
      ],
      data.withdrawals.map((w) => [
        formatCalendarDate(w.createdAt, "short"),
        w.reference,
        w.methodLabel,
        w.status,
        formatUGX(w.netAmount),
      ])
    );
  } else {
    ensureSpace(doc, 28);
    doc
      .rect(MARGIN, doc.y, CONTENT_WIDTH, 28)
      .fill(COLORS.creamEdge)
      .stroke(COLORS.line);
    doc
      .fillColor(COLORS.inkSoft)
      .font(INTER_REGULAR)
      .fontSize(9.5)
      .text(
        "No withdrawals recorded for this event.",
        MARGIN,
        doc.y + 9,
        { width: CONTENT_WIDTH, align: "center" }
      );
    doc.y += 36;
  }

  ensureSpace(doc, 40);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .strokeColor(COLORS.line)
    .stroke();
  doc.moveDown(0.8);
  doc
    .fillColor(COLORS.forest)
    .font(INTER_BOLD)
    .fontSize(10)
    .text("CeremonyWallet", MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
  doc
    .fillColor(COLORS.inkSoft)
    .font(INTER_REGULAR)
    .fontSize(9)
    .text(generatedOn, MARGIN, doc.y + 2, {
      width: CONTENT_WIDTH,
      align: "center",
    });

  return collectPdfBuffer(doc);
}
