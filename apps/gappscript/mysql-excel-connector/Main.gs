  /**
  * Spreadsheet menu and scheduled sync triggers.
  */

  var SCHEDULED_SYNC_HANDLER = "syncAllTables";

  function onOpen() {
    var menu = SpreadsheetApp.getUi().createMenu("Treasurer DB");
    menu
      .addItem("Sync All Tables", "syncAllTables")
      .addItem("Sync Active Sheet Tab", "syncActiveSheetTab")
      .addSeparator()
      .addItem("Configure Connection", "setupScriptProperties")
      .addItem("Paste Connection String", "pasteConnectionString")
      .addSeparator();

    if (isScheduledSyncEnabled()) {
      menu.addItem("Disable Scheduled Sync (hourly)", "disableScheduledSync");
    } else {
      menu.addItem("Enable Scheduled Sync (hourly)", "enableScheduledSync");
    }

    menu.addToUi();
  }

  /**
  * @returns {boolean}
  */
  function isScheduledSyncEnabled() {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === SCHEDULED_SYNC_HANDLER) {
        return true;
      }
    }
    return false;
  }

  function enableScheduledSync() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Open the bound spreadsheet before enabling scheduled sync.");
    }

    PropertiesService.getScriptProperties().setProperty(
      "SPREADSHEET_ID",
      ss.getId()
    );

    disableScheduledSyncTriggers_();
    ScriptApp.newTrigger(SCHEDULED_SYNC_HANDLER)
      .timeBased()
      .everyHours(1)
      .create();

    SpreadsheetApp.getUi().alert(
      "Scheduled sync enabled.\n\n" +
        "All tables will sync every hour.\n" +
        "Last run summary is written to the _meta sheet (columns E–F)."
    );
  }

  function disableScheduledSync() {
    var removed = disableScheduledSyncTriggers_();
    SpreadsheetApp.getUi().alert(
      removed > 0
        ? "Scheduled sync disabled (" + removed + " trigger removed)."
        : "Scheduled sync was not enabled."
    );
  }

  /**
  * @returns {number}
  */
  function disableScheduledSyncTriggers_() {
    var triggers = ScriptApp.getProjectTriggers();
    var removed = 0;

    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === SCHEDULED_SYNC_HANDLER) {
        ScriptApp.deleteTrigger(triggers[i]);
        removed++;
      }
    }

    return removed;
  }

  /**
  * @deprecated Use enableScheduledSync from the Treasurer DB menu.
  */
  function createHourlyTrigger() {
    enableScheduledSync();
  }
