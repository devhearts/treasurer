import PDFDocument from "pdfkit";
import {
  formatCalendarDate,
  formatDateTime,
  formatUGX,
  progressPercent,
} from "../common/format-ugx";
import type { EventWithdrawAvailability } from "../wallet/withdraw-event-availability";

export type ProgressReportContributionRow = {
  name: string;
  amount: number;
  status: "paid" | "pledged";
  date: string;
  milestoneName?: string;
  manual?: boolean;
  pledgeHopeBy?: string;
};

export type ProgressReportMilestoneRow = {
  name: string;
  targetAmount: number;
  raisedAmount: number;
};

export type ProgressReportWithdrawalRow = {
  createdAt: string;
  reference: string;
  status: string;
  methodLabel: string;
  grossAmount: number;
  fees: number;
  netAmount: number;
};

export type ProgressReportEventDetails = {
  title: string;
  type: string;
  organizer: string;
  treasurerPhone: string;
  date: string;
  location: string;
  description: string;
  targetAmount: number;
  raisedAmount: number;
  statusMessage?: string;
  statusChangedAt?: string;
};

export type ProgressReportData = {
  generatedAt: string;
  eventSlug: string;
  event: ProgressReportEventDetails;
  milestones: ProgressReportMilestoneRow[];
  contributions: ProgressReportContributionRow[];
  withdrawals: ProgressReportWithdrawalRow[];
  withdrawSummary: EventWithdrawAvailability;
};

const MARGIN = 50;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

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
  if (doc.y + needed > doc.page.height - MARGIN) {
    doc.addPage();
  }
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string): void {
  ensureSpace(doc, 40);
  doc.moveDown(0.5);
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a1a1a").text(title);
  doc.moveDown(0.25);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .strokeColor("#cccccc")
    .stroke();
  doc.moveDown(0.35);
}

function keyValue(doc: PDFKit.PDFDocument, key: string, value: string): void {
  ensureSpace(doc, 18);
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#444444").text(`${key}: `, {
    continued: true,
    width: CONTENT_WIDTH,
  });
  doc.font("Helvetica").fillColor("#1a1a1a").text(value);
}

type TableColumn = { header: string; width: number; align?: "left" | "right" };

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: TableColumn[],
  rows: string[][]
): void {
  const rowHeight = 18;
  const headerHeight = 20;

  function drawRow(cells: string[], bold: boolean, fill?: string): void {
    ensureSpace(doc, rowHeight + 4);
    const y = doc.y;
    if (fill) {
      doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(fill);
      doc.fillColor("#1a1a1a");
    }
    let x = MARGIN;
    doc.fontSize(9).font(bold ? "Helvetica-Bold" : "Helvetica");
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      const text = cells[i] ?? "";
      doc.text(text, x + 2, y + 4, {
        width: col.width - 4,
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
    "#f0f0f0"
  );
  for (const row of rows) {
    drawRow(row, false);
  }
  doc.moveDown(0.5);
}

function contributionRows(
  items: ProgressReportContributionRow[]
): string[][] {
  return items.map((c) => {
    const status =
      c.status === "paid"
        ? c.manual
          ? "Paid (manual)"
          : "Paid"
        : c.pledgeHopeBy
          ? `Pledged (by ${formatCalendarDate(c.pledgeHopeBy, "short")})`
          : "Pledged";
    return [
      c.name,
      formatUGX(c.amount),
      status,
      formatCalendarDate(c.date, "short"),
      c.milestoneName ?? "—",
    ];
  });
}

export async function buildProgressReportPdf(
  data: ProgressReportData
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const { event } = data;
  const eventProgress = progressPercent(event.raisedAmount, event.targetAmount);

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .fillColor("#1a1a1a")
    .text("Event Progress Report", { align: "center" });
  doc
    .fontSize(13)
    .font("Helvetica")
    .fillColor("#333333")
    .text(event.title, { align: "center" });
  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(`Generated ${formatDateTime(data.generatedAt)}`, { align: "center" });
  doc.moveDown(1);

  sectionHeading(doc, "Event details");
  keyValue(doc, "Type", event.type);
  keyValue(doc, "Organizer", event.organizer);
  keyValue(doc, "Event date", formatCalendarDate(event.date));
  keyValue(doc, "Location", event.location);
  keyValue(doc, "Treasurer phone", event.treasurerPhone);
  if (event.statusChangedAt) {
    keyValue(
      doc,
      "Stopped on",
      formatDateTime(event.statusChangedAt)
    );
  }
  if (event.statusMessage) {
    keyValue(doc, "Stop message", event.statusMessage);
  }
  if (event.description.trim()) {
    keyValue(doc, "Description", event.description.trim());
  }

  sectionHeading(doc, "Financial summary");
  keyValue(doc, "Target", formatUGX(event.targetAmount));
  keyValue(doc, "Total raised", formatUGX(event.raisedAmount));
  keyValue(doc, "Progress", `${eventProgress}%`);

  if (data.milestones.length > 0) {
    sectionHeading(doc, "Milestones");
    drawTable(
      doc,
      [
        { header: "Milestone", width: CONTENT_WIDTH * 0.4 },
        { header: "Target", width: CONTENT_WIDTH * 0.2, align: "right" },
        { header: "Raised", width: CONTENT_WIDTH * 0.2, align: "right" },
        { header: "Progress", width: CONTENT_WIDTH * 0.2, align: "right" },
      ],
      data.milestones.map((m) => [
        m.name,
        formatUGX(m.targetAmount),
        formatUGX(m.raisedAmount),
        `${progressPercent(m.raisedAmount, m.targetAmount)}%`,
      ])
    );
  }

  const paid = data.contributions.filter((c) => c.status === "paid");
  const pledged = data.contributions.filter((c) => c.status === "pledged");

  sectionHeading(doc, `Contributions (${data.contributions.length})`);
  if (paid.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").text(`Cash contributions (${paid.length})`);
    doc.moveDown(0.2);
    drawTable(
      doc,
      [
        { header: "Contributor", width: CONTENT_WIDTH * 0.28 },
        { header: "Amount", width: CONTENT_WIDTH * 0.18, align: "right" },
        { header: "Status", width: CONTENT_WIDTH * 0.22 },
        { header: "Date", width: CONTENT_WIDTH * 0.16 },
        { header: "Milestone", width: CONTENT_WIDTH * 0.16 },
      ],
      contributionRows(paid)
    );
  }
  if (pledged.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").text(`Pledged contributions (${pledged.length})`);
    doc.moveDown(0.2);
    drawTable(
      doc,
      [
        { header: "Contributor", width: CONTENT_WIDTH * 0.28 },
        { header: "Amount", width: CONTENT_WIDTH * 0.18, align: "right" },
        { header: "Status", width: CONTENT_WIDTH * 0.22 },
        { header: "Date", width: CONTENT_WIDTH * 0.16 },
        { header: "Milestone", width: CONTENT_WIDTH * 0.16 },
      ],
      contributionRows(pledged)
    );
  }
  if (data.contributions.length === 0) {
    doc.fontSize(10).font("Helvetica").text("No contributions recorded.");
    doc.moveDown(0.5);
  }

  sectionHeading(doc, "Withdrawals");
  keyValue(
    doc,
    "Platform raised",
    formatUGX(data.withdrawSummary.platformRaised)
  );
  keyValue(
    doc,
    "Withdrawn so far",
    formatUGX(data.withdrawSummary.withdrawnSoFar)
  );
  keyValue(
    doc,
    "Pending withdrawals",
    formatUGX(data.withdrawSummary.pendingWithdrawals)
  );
  keyValue(
    doc,
    "Available to withdraw",
    formatUGX(data.withdrawSummary.availableToWithdraw)
  );
  doc.moveDown(0.35);

  if (data.withdrawals.length > 0) {
    drawTable(
      doc,
      [
        { header: "Date", width: CONTENT_WIDTH * 0.18 },
        { header: "Reference", width: CONTENT_WIDTH * 0.22 },
        { header: "Method", width: CONTENT_WIDTH * 0.18 },
        { header: "Status", width: CONTENT_WIDTH * 0.12 },
        { header: "Gross", width: CONTENT_WIDTH * 0.1, align: "right" },
        { header: "Fees", width: CONTENT_WIDTH * 0.1, align: "right" },
        { header: "Net", width: CONTENT_WIDTH * 0.1, align: "right" },
      ],
      data.withdrawals.map((w) => [
        formatCalendarDate(w.createdAt, "short"),
        w.reference,
        w.methodLabel,
        w.status,
        formatUGX(w.grossAmount),
        formatUGX(w.fees),
        formatUGX(w.netAmount),
      ])
    );
  } else {
    doc.fontSize(10).font("Helvetica").text("No withdrawals recorded for this event.");
    doc.moveDown(0.5);
  }

  ensureSpace(doc, 40);
  doc
    .fontSize(8)
    .fillColor("#888888")
    .text(
      `CeremonyWallet · Event slug: ${data.eventSlug}`,
      MARGIN,
      doc.page.height - MARGIN - 20,
      { align: "center", width: CONTENT_WIDTH }
    );

  return collectPdfBuffer(doc);
}
