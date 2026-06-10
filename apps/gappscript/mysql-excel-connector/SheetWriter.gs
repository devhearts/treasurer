/**
 * Write query results into the bound Google Spreadsheet.
 */

var META_SHEET_NAME = "_meta";

/**
 * @param {string} sheetName
 * @param {string[]} headers
 * @param {string[][]} rows
 */
function writeTableToSheet(sheetName, headers, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  sheet.clear();

  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (rows.length > 0) {
      // getRange(row, col, numRows, numCols) — not end row/col
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    sheet.autoResizeColumns(1, headers.length);
  }

  stampMetaSync(sheetName, rows.length);
}

/**
 * @param {string} sheetName
 * @param {number} rowCount
 */
function stampMetaSync(sheetName, rowCount) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var meta = ss.getSheetByName(META_SHEET_NAME);
  if (!meta) {
    meta = ss.insertSheet(META_SHEET_NAME);
    meta
      .getRange(1, 1, 1, 3)
      .setValues([["sheet", "last_synced_at", "row_count"]]);
  }

  var now = new Date().toISOString();
  var lastRow = meta.getLastRow();
  var existing =
    lastRow > 1 ? meta.getRange(2, 1, lastRow - 1, 1).getValues() : [];

  for (var i = 0; i < existing.length; i++) {
    if (existing[i][0] === sheetName) {
      var rowIndex = i + 2;
      meta.getRange(rowIndex, 2).setValue(now);
      meta.getRange(rowIndex, 3).setValue(rowCount);
      return;
    }
  }

  meta.appendRow([sheetName, now, rowCount]);
}
