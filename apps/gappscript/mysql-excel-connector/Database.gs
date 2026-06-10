/**
 * JDBC and SSH-proxy query helpers for Treasurer MariaDB.
 */

/**
 * @param {function(Jdbc.JdbcConnection): *} callback
 * @returns {*}
 */
function withConnection(callback) {
  var config = getConnectionConfig();
  var url = getJdbcUrl();
  var conn = Jdbc.getConnection(url, config.jdbc.user, config.jdbc.password);
  try {
    return callback(conn);
  } finally {
    conn.close();
  }
}

/**
 * @param {string} name
 */
function validateIdentifier(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error("Invalid SQL identifier: " + name);
  }
}

/**
 * @param {ExportTableConfig} exportConfig
 * @returns {string}
 */
function buildSelectSql(exportConfig) {
  validateIdentifier(exportConfig.table);
  for (var i = 0; i < exportConfig.columns.length; i++) {
    validateIdentifier(exportConfig.columns[i]);
  }

  var columnList = exportConfig.columns
    .map(function (col) {
      return "`" + col + "`";
    })
    .join(", ");

  return "SELECT " + columnList + " FROM `" + exportConfig.table + "`";
}

/**
 * @param {ExportTableConfig} exportConfig
 * @returns {string[][]}
 */
function queryTable(exportConfig) {
  var sql = buildSelectSql(exportConfig);

  if (getConnectionMode() === "ssh") {
    return queryTableViaSshProxy(sql);
  }

  return withConnection(function (conn) {
    var stmt = conn.createStatement();
    try {
      var results = stmt.executeQuery(sql);
      return resultSetToRows(results);
    } finally {
      stmt.close();
    }
  });
}

/**
 * @param {Jdbc.JdbcResultSet} rs
 * @returns {string[][]}
 */
function resultSetToRows(rs) {
  var meta = rs.getMetaData();
  var numCols = meta.getColumnCount();
  var rows = [];

  while (rs.next()) {
    var row = [];
    for (var c = 1; c <= numCols; c++) {
      var value = rs.getString(c);
      row.push(value === null ? "" : String(value));
    }
    rows.push(row);
  }

  return rows;
}
