/**
 * Sync Treasurer DB tables into Google Sheets tabs.
 */

/**
 * @param {ExportTableConfig} exportConfig
 * @returns {number}
 */
function syncTable(exportConfig) {
  var rows = queryTable(exportConfig);
  writeTableToSheet(exportConfig.sheetName, exportConfig.columns, rows);
  return rows.length;
}

function syncAllTables() {
  var results = [];

  for (var i = 0; i < EXPORT_TABLES.length; i++) {
    var config = EXPORT_TABLES[i];
    try {
      var count = syncTable(config);
      results.push(config.sheetName + ": " + count + " rows");
    } catch (e) {
      results.push(config.sheetName + ": ERROR - " + e.message);
    }
  }

  SpreadsheetApp.getUi().alert("Sync complete:\n\n" + results.join("\n"));
}

function syncActiveSheetTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var sheetName = sheet.getName();

  if (sheetName === META_SHEET_NAME) {
    SpreadsheetApp.getUi().alert(
      "Select a data tab to sync (not " + META_SHEET_NAME + ")."
    );
    return;
  }

  var config = getExportTableBySheetName(sheetName);
  if (!config) {
    var available = EXPORT_TABLES.map(function (t) {
      return t.sheetName;
    }).join(", ");
    SpreadsheetApp.getUi().alert(
      'No export config for tab "' +
        sheetName +
        '". Available tabs: ' +
        available
    );
    return;
  }

  try {
    var count = syncTable(config);
    SpreadsheetApp.getUi().alert("Synced " + sheetName + ": " + count + " rows.");
  } catch (e) {
    SpreadsheetApp.getUi().alert("Sync failed: " + e.message);
  }
}

function setupScriptProperties() {
  var ui = SpreadsheetApp.getUi();

  var modeResponse = ui.alert(
    "Connection mode",
    "Use SSH tunnel to reach MySQL?\n\n" +
      "Yes = SSH bastion + local MySQL (e.g. 127.0.0.1:3346 on server)\n" +
      "No = Direct JDBC (MySQL reachable from Google IPs)",
    ui.ButtonSet.YES_NO
  );

  var useSsh = modeResponse === ui.Button.YES;
  var props = { CONNECTION_MODE: useSsh ? "ssh" : "direct" };

  if (useSsh) {
    var sshHost = ui.prompt(
      "SSH host",
      "Public IP or hostname of SSH bastion",
      ui.ButtonSet.OK_CANCEL
    );
    if (sshHost.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var sshPort = ui.prompt("SSH port", "22", ui.ButtonSet.OK_CANCEL);
    if (sshPort.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var sshUser = ui.prompt("SSH username", "", ui.ButtonSet.OK_CANCEL);
    if (sshUser.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    var sshPassword = ui.prompt("SSH password", "", ui.ButtonSet.OK_CANCEL);
    if (sshPassword.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    props.SSH_HOST = sshHost.getResponseText().trim();
    props.SSH_PORT = sshPort.getResponseText().trim() || "22";
    props.SSH_USER = sshUser.getResponseText().trim();
    props.SSH_PASSWORD = sshPassword.getResponseText();

    var mysqlHost = ui.prompt(
      "MySQL host (on SSH server)",
      "127.0.0.1",
      ui.ButtonSet.OK_CANCEL
    );
    if (mysqlHost.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    props.JDBC_HOST = mysqlHost.getResponseText().trim() || "127.0.0.1";

    var proxyUrl = ui.prompt(
      "SSH proxy URL",
      "https://your-proxy.example.com (deploy ssh-jdbc-proxy)",
      ui.ButtonSet.OK_CANCEL
    );
    if (proxyUrl.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    props.SSH_PROXY_URL = proxyUrl.getResponseText().trim();

    var proxyToken = ui.prompt(
      "SSH proxy token (optional)",
      "",
      ui.ButtonSet.OK_CANCEL
    );
    if (proxyToken.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    if (proxyToken.getResponseText()) {
      props.SSH_PROXY_TOKEN = proxyToken.getResponseText();
    }
  } else {
    var host = ui.prompt(
      "JDBC host",
      "Reachable hostname or IP (not 127.0.0.1)",
      ui.ButtonSet.OK_CANCEL
    );
    if (host.getSelectedButton() !== ui.Button.OK) {
      return;
    }
    props.JDBC_HOST = host.getResponseText().trim();
  }

  var port = ui.prompt("MySQL port", "3306", ui.ButtonSet.OK_CANCEL);
  if (port.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  props.JDBC_PORT = port.getResponseText().trim() || "3306";

  var database = ui.prompt("Database name", "treasurer", ui.ButtonSet.OK_CANCEL);
  if (database.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  props.JDBC_DATABASE = database.getResponseText().trim() || "treasurer";

  var user = ui.prompt("MySQL user", "treasurer", ui.ButtonSet.OK_CANCEL);
  if (user.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  props.JDBC_USER = user.getResponseText().trim();

  var password = ui.prompt("MySQL password", "", ui.ButtonSet.OK_CANCEL);
  if (password.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  props.JDBC_PASSWORD = password.getResponseText();

  PropertiesService.getScriptProperties().setProperties(props);

  ui.alert(
    "Connection settings saved.\n\nMode: " +
      (useSsh ? "SSH" : "direct") +
      "\n" +
      buildConnectionString()
  );
}

function pasteConnectionString() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "Paste connection string",
    "mysql://user:pass@host:3306/treasurer\n" +
      "ssh://sshuser:sshpass@host:22/mysql://dbuser:dbpass@127.0.0.1:3346/treasurer|proxy:https://proxy.example.com",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  try {
    var props = parseConnectionString(response.getResponseText());
    PropertiesService.getScriptProperties().setProperties(props);
    ui.alert("Connection string applied.\n\n" + buildConnectionString());
  } catch (e) {
    ui.alert("Invalid connection string: " + e.message);
  }
}
