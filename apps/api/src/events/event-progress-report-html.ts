import { formatUGX } from "../common/format-ugx";
import {
  buildFinancialSummaryRows,
  formatProgressDisplay,
  formatReportCalendarDate,
  formatReportDateTime,
  formatReportTimestamp,
} from "./event-progress-report-format";
import type {
  ProgressReportContributionRow,
  ProgressReportData,
  ProgressReportMilestoneRow,
  ProgressReportWithdrawalRow,
} from "./event-progress-report.types";

const PROGRESS_REPORT_STYLES = `
  :root {
    --forest: #2C3320;
    --forest-deep: #1F2517;
    --sage: #A8C282;
    --sage-deep: #8FAE66;
    --cream: #FAF7EC;
    --cream-edge: #F3EFE0;
    --ink: #23271B;
    --ink-soft: #5C6450;
    --line: #E4E0D0;
    --white: #FFFFFF;
    --gold-line: #F0E9C9;
    --paid: #5C8A4A;
    --paid-bg: #E9F2E2;
    --pledged: #B8893A;
    --pledged-bg: #FBF1DF;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--cream);
    color: var(--ink);
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .top-strip {
    height: 6px;
    background: var(--gold-line);
  }

  .page {
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 64px;
  }

  .doc-head {
    background: var(--forest);
    color: var(--cream);
    padding: 22px 28px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .doc-head .doc-title {
    font-family: 'Inter', sans-serif;
    font-size: 19px;
    font-weight: 700;
  }
  .doc-head .doc-title span { color: var(--sage); }
  .doc-head .doc-gen {
    font-size: 12px;
    color: #B7C2A2;
  }

  .summary-tables {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid var(--line);
  }
  .summary-tables .summary-col:first-child { border-right: 1px solid var(--line); }

  .summary-col table {
    width: 100%;
    border-collapse: collapse;
  }
  .summary-col caption {
    text-align: left;
    font-family: 'Inter', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-soft);
    background: var(--cream-edge);
    padding: 9px 22px;
  }
  .summary-col td {
    padding: 9px 22px;
    border-top: 1px solid var(--gold-line);
    font-size: 13.5px;
  }
  .summary-col td.label { color: var(--ink-soft); width: 42%; }
  .summary-col td.value { color: var(--ink); font-weight: 700; text-align: right; }
  .summary-col td.value.accent { color: var(--sage-deep); }
  .summary-col tr.stop-row td {
    font-weight: 400;
    color: var(--ink-soft);
    font-size: 13px;
    text-align: left;
  }
  .summary-col tr.stop-row td.label { width: auto; }

  main { padding: 30px 28px 0; }

  .section-label {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-soft);
    margin: 30px 8px 12px;
  }
  .section-label:first-child { margin-top: 0; }

  .card {
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 18px;
    overflow: hidden;
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border-bottom: 1px solid var(--line);
  }
  .card-head h2 {
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 700;
    margin: 0;
    color: var(--ink);
  }
  .card-head .count-pill {
    background: var(--cream-edge);
    color: var(--ink-soft);
    font-size: 12px;
    font-weight: 700;
    padding: 4px 11px;
    border-radius: 999px;
    font-family: 'Inter', sans-serif;
  }

  .milestone-row {
    padding: 18px 22px;
  }
  .milestone-row + .milestone-row {
    border-top: 1px solid var(--line);
  }
  .milestone-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 9px;
  }
  .milestone-name { font-weight: 700; font-size: 14.5px; color: var(--ink); }
  .milestone-figures { font-size: 13px; color: var(--ink-soft); }
  .milestone-figures b { color: var(--ink); }
  .bar-track {
    height: 9px;
    background: var(--cream-edge);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--sage-deep), var(--sage));
    border-radius: 999px;
  }
  .milestone-pct {
    text-align: right;
    font-size: 12px;
    color: var(--ink-soft);
    margin-top: 6px;
    font-weight: 700;
  }

  .sub-block + .sub-block { border-top: 1px solid var(--line); }
  .sub-head {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 14px 22px 10px;
  }
  .sub-head .dot { width: 7px; height: 7px; border-radius: 50%; }
  .dot.cash { background: var(--paid); }
  .dot.pledge { background: var(--pledged); }
  .sub-head h3 { font-size: 13.5px; font-weight: 700; margin: 0; color: var(--ink); }
  .sub-head .sub-count { font-size: 12px; color: var(--ink-soft); }

  table.contrib-table,
  table.withdraw-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13.5px;
  }
  table.contrib-table th,
  table.withdraw-table th {
    text-align: left;
    font-family: 'Inter', sans-serif;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-soft);
    padding: 6px 22px;
    font-weight: 600;
  }
  table.contrib-table td,
  table.withdraw-table td {
    padding: 11px 22px;
    border-top: 1px solid var(--gold-line);
    color: var(--ink);
  }
  table.contrib-table td.amount,
  table.withdraw-table td.amount {
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
  }
  .status-chip {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
  }
  .status-chip.paid { background: var(--paid-bg); color: var(--paid); }
  .status-chip.pledged { background: var(--pledged-bg); color: var(--pledged); }
  .muted-cell { color: var(--ink-soft); }

  .withdraw-empty {
    padding: 22px;
    text-align: center;
    color: var(--ink-soft);
    font-size: 13.5px;
    border-top: 1px solid var(--line);
    background: var(--cream-edge);
  }

  footer {
    margin: 36px 28px 0;
    text-align: center;
    padding-top: 22px;
    border-top: 1px solid var(--line);
    color: var(--ink-soft);
    font-size: 12.5px;
  }
  footer .brand {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    color: var(--forest);
  }
  footer .brand span { color: var(--sage-deep); }
`;

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding: "Wedding",
  introduction: "Give away, Introductions",
  funeral: "Condolences",
  charity: "Charity",
  other: "Specify event",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function pledgedStatusLabel(
  c: ProgressReportContributionRow,
  timeZone: string
): string {
  if (c.pledgeHopeBy) {
    return `Pledged · by ${formatReportCalendarDate(c.pledgeHopeBy, timeZone, "short")}`;
  }
  return "Pledged";
}

function renderMilestoneRow(m: ProgressReportMilestoneRow): string {
  const progressLabel = formatProgressDisplay(m.raisedAmount, m.targetAmount);
  const barWidth =
    m.targetAmount > 0
      ? Math.min(100, Math.round((m.raisedAmount / m.targetAmount) * 100))
      : 0;
  const progressText =
    progressLabel === "—" ? "—" : `${progressLabel} complete`;
  return `
    <div class="milestone-row">
      <div class="milestone-top">
        <span class="milestone-name">${escapeHtml(m.name)}</span>
        <span class="milestone-figures"><b>${escapeHtml(formatUGX(m.raisedAmount))}</b> of ${escapeHtml(formatUGX(m.targetAmount))}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width: ${barWidth}%;"></div></div>
      <div class="milestone-pct">${escapeHtml(progressText)}</div>
    </div>`;
}

function renderCashContributionRows(
  items: ProgressReportContributionRow[],
  timeZone: string
): string {
  return items
    .map(
      (c) => `
            <tr>
              <td class="muted-cell">${escapeHtml(c.name)}</td>
              <td class="amount">${escapeHtml(formatUGX(c.amount))}</td>
              <td><span class="status-chip paid">${escapeHtml(paidStatusLabel(c))}</span></td>
              <td class="muted-cell">${escapeHtml(formatReportTimestamp(c.recordedAt, timeZone, c.recordedAtHasTime))}</td>
            </tr>`
    )
    .join("");
}

function renderPledgedContributionRows(
  items: ProgressReportContributionRow[],
  timeZone: string
): string {
  return items
    .map(
      (c) => `
            <tr>
              <td class="muted-cell">${escapeHtml(c.name)}</td>
              <td class="amount">${escapeHtml(formatUGX(c.amount))}</td>
              <td><span class="status-chip pledged">${escapeHtml(pledgedStatusLabel(c, timeZone))}</span></td>
              <td class="muted-cell">${escapeHtml(c.milestoneName ?? "—")}</td>
            </tr>`
    )
    .join("");
}

function renderWithdrawalRows(
  items: ProgressReportWithdrawalRow[],
  timeZone: string
): string {
  return items
    .map(
      (w) => `
            <tr>
              <td class="muted-cell">${escapeHtml(formatReportDateTime(w.createdAt, timeZone))}</td>
              <td class="muted-cell">${escapeHtml(w.reference)}</td>
              <td class="muted-cell">${escapeHtml(w.methodLabel)}</td>
              <td class="muted-cell">${escapeHtml(w.status)}</td>
              <td class="amount">${escapeHtml(formatUGX(w.netAmount))}</td>
            </tr>`
    )
    .join("");
}

export function buildProgressReportHtml(data: ProgressReportData): string {
  const { event } = data;
  const timeZone = data.timeZone;
  const paid = data.contributions.filter((c) => c.status === "paid");
  const pledged = data.contributions.filter((c) => c.status === "pledged");
  const typeLabel = formatEventTypeLabel(event.type, event.typeLabel);
  const { withdrawSummary } = data;
  const financialSummaryRows = buildFinancialSummaryRows({
    targetAmount: event.targetAmount,
    raisedAmount: event.raisedAmount,
    paidCount: paid.length,
    pledgedCount: pledged.length,
    withdrawnSoFar: withdrawSummary.withdrawnSoFar,
    cashBreakdown: data.cashBreakdown,
  })
    .map(
      (row) =>
        `<tr><td class="label">${escapeHtml(row.label)}</td><td class="value${row.accent ? " accent" : ""}">${escapeHtml(row.value)}</td></tr>`
    )
    .join("");

  const stopMessageRow = event.statusMessage?.trim()
    ? `<tr class="stop-row"><td class="label" colspan="2">"${escapeHtml(event.statusMessage.trim())}"</td></tr>`
    : "";

  const stoppedOnRow = event.statusChangedAt
    ? `<tr><td class="label">Stopped on</td><td class="value">${escapeHtml(formatReportDateTime(event.statusChangedAt, timeZone))}</td></tr>`
    : "";

  const milestonesSection =
    data.milestones.length > 0
      ? `
    <p class="section-label">Milestones</p>
    <div class="card">
      ${data.milestones.map(renderMilestoneRow).join("")}
    </div>`
      : "";

  const cashBlock =
    paid.length > 0
      ? `
      <div class="sub-block">
        <div class="sub-head">
          <span class="dot cash"></span>
          <h3>Cash contributions</h3>
          <span class="sub-count">— ${paid.length}</span>
        </div>
        <table class="contrib-table">
          <thead>
            <tr><th>Contributor</th><th>Amount</th><th>Status</th><th>Date &amp; time</th></tr>
          </thead>
          <tbody>
            ${renderCashContributionRows(paid, timeZone)}
          </tbody>
        </table>
      </div>`
      : "";

  const pledgeBlock =
    pledged.length > 0
      ? `
      <div class="sub-block">
        <div class="sub-head">
          <span class="dot pledge"></span>
          <h3>Pledged contributions</h3>
          <span class="sub-count">— ${pledged.length}</span>
        </div>
        <table class="contrib-table">
          <thead>
            <tr><th>Contributor</th><th>Amount</th><th>Status</th><th>Milestone</th></tr>
          </thead>
          <tbody>
            ${renderPledgedContributionRows(pledged, timeZone)}
          </tbody>
        </table>
      </div>`
      : "";

  const contributionsSection =
    data.contributions.length > 0
      ? `
    <p class="section-label">Contributions · ${data.contributions.length} total</p>
    <div class="card">
      ${cashBlock}
      ${pledgeBlock}
    </div>`
      : "";

  const withdrawalsTable =
    data.withdrawals.length > 0
      ? `
      <div class="sub-block">
        <table class="withdraw-table">
          <thead>
            <tr><th>Date &amp; time</th><th>Reference</th><th>Method</th><th>Status</th><th>Net</th></tr>
          </thead>
          <tbody>
            ${renderWithdrawalRows(data.withdrawals, timeZone)}
          </tbody>
        </table>
      </div>`
      : `<div class="withdraw-empty">No withdrawals recorded for this event.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Event Progress Report — ${escapeHtml(event.title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${PROGRESS_REPORT_STYLES}</style>
</head>
<body>

<div class="top-strip"></div>
<div class="page">

  <div class="doc-head">
    <span class="doc-title">Ceremony<span>Wallet</span> · Event Progress Report</span>
    <span class="doc-gen">Generated on ${escapeHtml(formatReportDateTime(data.generatedAt, timeZone))}</span>
  </div>

  <div class="summary-tables">
    <div class="summary-col">
      <table>
        <caption>Event details</caption>
        <tbody>
          <tr><td class="label">Event</td><td class="value">${escapeHtml(event.title)}</td></tr>
          <tr><td class="label">Type</td><td class="value">${escapeHtml(typeLabel)}</td></tr>
          <tr><td class="label">Organizer</td><td class="value">${escapeHtml(event.organizer)}</td></tr>
          <tr><td class="label">Event date</td><td class="value">${escapeHtml(formatReportCalendarDate(event.date, timeZone))}</td></tr>
          <tr><td class="label">Location</td><td class="value">${escapeHtml(event.location)}</td></tr>
          <tr><td class="label">Treasurer phone</td><td class="value">${escapeHtml(event.treasurerPhone)}</td></tr>
          ${stoppedOnRow}
          ${stopMessageRow}
        </tbody>
      </table>
    </div>
    <div class="summary-col">
      <table>
        <caption>Financial summary</caption>
        <tbody>
          ${financialSummaryRows}
        </tbody>
      </table>
    </div>
  </div>

  <main>
    ${milestonesSection}
    ${contributionsSection}

    <p class="section-label">Withdrawals</p>
    <div class="card">
      ${withdrawalsTable}
    </div>
  </main>

  <footer>
    <p class="brand">Ceremony<span>Wallet</span></p>
    <p>Generated on ${escapeHtml(formatReportDateTime(data.generatedAt, timeZone))}</p>
    <p>Event slug: ${escapeHtml(data.eventSlug)}</p>
  </footer>

</div>
</body>
</html>`;
}
