/**
 * Spreadsheet menu and optional scheduled sync trigger.
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Treasurer DB")
    .addItem("Sync All Tables", "syncAllTables")
    .addItem("Sync Active Sheet Tab", "syncActiveSheetTab")
    .addSeparator()
    .addItem("Configure Connection", "setupScriptProperties")
    .addItem("Paste Connection String", "pasteConnectionString")
    .addToUi();
}

/**
 * Run once from the Apps Script editor to create an hourly sync trigger.
 * Documented in apps/gappscript/README.md; not auto-installed.
 */
function createHourlyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "syncAllTables") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("syncAllTables").timeBased().everyHours(1).create();
}
