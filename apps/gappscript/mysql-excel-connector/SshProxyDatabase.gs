/**
 * Query MySQL through an SSH tunnel via the optional ssh-jdbc-proxy HTTP service.
 * Apps Script cannot open SSH tunnels natively.
 */

/**
 * @param {string} sql
 * @returns {string[][]}
 */
function queryTableViaSshProxy(sql) {
  var config = getConnectionConfig();

  if (!config.proxyUrl) {
    throw new Error(
      "SSH mode requires SSH_PROXY_URL. Deploy apps/gappscript/ssh-jdbc-proxy on a public host."
    );
  }
  if (!config.ssh) {
    throw new Error("SSH configuration is missing.");
  }

  var payload = {
    ssh: {
      host: config.ssh.host,
      port: Number(config.ssh.port),
      username: config.ssh.user,
      password: config.ssh.password,
    },
    mysql: {
      host: config.jdbc.host,
      port: Number(config.jdbc.port),
      user: config.jdbc.user,
      password: config.jdbc.password,
      database: config.jdbc.database,
    },
    sql: sql,
  };

  var url = config.proxyUrl.replace(/\/$/, "");
  if (url.indexOf("/query") < 0) {
    url += "/query";
  }

  var headers = {
    "Content-Type": "application/json",
  };
  if (config.proxyToken) {
    headers["X-Proxy-Token"] = config.proxyToken;
  }

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  var status = response.getResponseCode();
  var text = response.getContentText();
  var body;

  try {
    body = JSON.parse(text);
  } catch (parseError) {
    throw new Error(
      "SSH proxy returned non-JSON (HTTP " + status + "): " + text.substring(0, 200)
    );
  }

  if (status !== 200) {
    throw new Error(body.error || "SSH proxy error HTTP " + status);
  }

  if (!body.rows || !body.rows.length) {
    return [];
  }

  return body.rows.map(function (row) {
    return row.map(function (cell) {
      return cell === null || cell === undefined ? "" : String(cell);
    });
  });
}
