/**
 * Treasurer MariaDB export configuration.
 * Column lists mirror apps/api/src/database/schema.ts (snake_case).
 * Add entries here to export additional tables.
 *
 * @typedef {{ table: string, sheetName: string, columns: string[] }} ExportTableConfig
 * @typedef {'direct'|'ssh'} ConnectionMode
 * @typedef {{
 *   mode: ConnectionMode,
 *   jdbc: { host: string, port: string, database: string, user: string, password: string },
 *   ssh: { host: string, port: string, user: string, password: string }|null,
 *   proxyUrl: string,
 *   proxyToken: string
 * }} ConnectionConfig
 */

/** @type {ExportTableConfig[]} */
var EXPORT_TABLES = [
  {
    table: "events",
    sheetName: "events",
    columns: [
      "id",
      "user_id",
      "slug",
      "title",
      "type",
      "organizer",
      "treasurer_phone",
      "target_amount",
      "raised_amount",
      "date",
      "location",
      "created_at",
      "subscription_paid",
    ],
  },
  {
    table: "contributions",
    sheetName: "contributions",
    columns: [
      "id",
      "event_id",
      "name",
      "anonymous",
      "amount",
      "phone",
      "message",
      "status",
      "date",
      "pledge_hope_by",
      "manual",
      "visible",
      "milestone_id",
      "payment_reference_id",
    ],
  },
  {
    table: "payment_intents",
    sheetName: "payment_intents",
    columns: [
      "reference_id",
      "kind",
      "user_id",
      "event_id",
      "amount",
      "name",
      "anonymous",
      "phone",
      "message",
      "external_id",
      "fulfilled",
      "milestone_id",
      "processor",
      "currency",
      "created_at",
      "updated_at",
    ],
  },
  {
    table: "payment_status_events",
    sheetName: "payment_status_events",
    columns: [
      "id",
      "reference_id",
      "source",
      "from_status",
      "to_status",
      "created_at",
    ],
  },
  {
    table: "withdrawals",
    sheetName: "withdrawals",
    columns: [
      "id",
      "reference",
      "user_id",
      "method_id",
      "gross_amount",
      "momo_fee",
      "platform_fee",
      "net_amount",
      "status",
      "failure_reason",
      "processor_ref",
      "idempotency_key",
      "created_at",
      "updated_at",
    ],
  },
  {
    table: "wallet_transactions",
    sheetName: "wallet_transactions",
    columns: [
      "id",
      "user_id",
      "direction",
      "kind",
      "amount",
      "title",
      "description",
      "badge",
      "event_id",
      "contribution_id",
      "withdrawal_id",
      "created_at",
    ],
  },
  {
    table: "user_wallets",
    sheetName: "user_wallets",
    columns: ["user_id", "balance", "total_in", "total_out", "currency", "updated_at"],
  },
  {
    table: "users",
    sheetName: "users",
    columns: ["id", "email", "created_at", "email_verified_at", "phone"],
  },
  {
    table: "invitations",
    sheetName: "invitations",
    columns: [
      "id",
      "event_id",
      "user_id",
      "title",
      "template_id",
      "status",
      "published_at",
      "recipient_count",
      "open_count",
      "rsvp_yes_count",
      "rsvp_no_count",
      "rsvp_maybe_count",
      "created_at",
      "updated_at",
    ],
  },
  {
    table: "invitation_recipients",
    sheetName: "invitation_recipients",
    columns: [
      "id",
      "invitation_id",
      "guest_name",
      "contact",
      "opened_at",
      "rsvp_status",
      "rsvp_at",
      "rsvp_party_size",
      "rsvp_message",
      "created_at",
    ],
  },
];

/**
 * @param {string} key
 * @param {string=} defaultValue
 * @returns {string}
 */
function getScriptProperty(key, defaultValue) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (value !== null && value !== "") {
    return value;
  }
  return defaultValue || "";
}

/**
 * @returns {ConnectionMode}
 */
function getConnectionMode() {
  var mode = getScriptProperty("CONNECTION_MODE", "direct").toLowerCase();
  if (mode === "ssh") {
    return "ssh";
  }
  if (getScriptProperty("SSH_HOST")) {
    return "ssh";
  }
  return "direct";
}

/**
 * @returns {ConnectionConfig}
 */
function getConnectionConfig() {
  var mode = getConnectionMode();
  var jdbcHost =
    mode === "ssh"
      ? getScriptProperty("JDBC_HOST", "127.0.0.1")
      : getScriptProperty("JDBC_HOST");
  var jdbc = {
    host: jdbcHost,
    port: getScriptProperty("JDBC_PORT", "3306"),
    database: getScriptProperty("JDBC_DATABASE", "treasurer"),
    user: getScriptProperty("JDBC_USER"),
    password: getScriptProperty("JDBC_PASSWORD"),
  };

  if (!jdbc.user || !jdbc.password) {
    throw new Error(
      "Missing MySQL configuration. Use Treasurer DB > Configure Connection."
    );
  }

  if (mode === "direct" && !jdbc.host) {
    throw new Error(
      "Missing JDBC_HOST. Use Treasurer DB > Configure Connection."
    );
  }

  var ssh = null;
  if (mode === "ssh") {
    ssh = {
      host: getScriptProperty("SSH_HOST"),
      port: getScriptProperty("SSH_PORT", "22"),
      user: getScriptProperty("SSH_USER"),
      password: getScriptProperty("SSH_PASSWORD"),
    };
    if (!ssh.host || !ssh.user || !ssh.password) {
      throw new Error(
        "SSH mode requires SSH_HOST, SSH_USER, and SSH_PASSWORD."
      );
    }
  }

  return {
    mode: mode,
    jdbc: jdbc,
    ssh: ssh,
    proxyUrl: getScriptProperty("SSH_PROXY_URL"),
    proxyToken: getScriptProperty("SSH_PROXY_TOKEN"),
  };
}

/**
 * Backward-compatible alias used by older Database.gs deployments.
 * @returns {{ host: string, port: string, database: string, user: string, password: string }}
 */
function getJdbcConfig() {
  var config = getConnectionConfig();
  return config.jdbc;
}

/**
 * Direct JDBC URL (direct mode only).
 * @returns {string}
 */
function getJdbcUrl() {
  var config = getConnectionConfig();
  return (
    "jdbc:mysql://" +
    config.jdbc.host +
    ":" +
    config.jdbc.port +
    "/" +
    config.jdbc.database +
    "?useSSL=false&useUnicode=true&characterEncoding=UTF-8"
  );
}

/**
 * Human-readable connection summary (passwords masked).
 * @returns {string}
 */
function buildConnectionString() {
  var config = getConnectionConfig();
  if (config.mode === "ssh" && config.ssh) {
    var sshPart =
      "ssh://" +
      encodeURIComponent(config.ssh.user) +
      ":***@" +
      config.ssh.host +
      ":" +
      config.ssh.port;
    var mysqlPart =
      "/mysql://" +
      encodeURIComponent(config.jdbc.user) +
      ":***@" +
      config.jdbc.host +
      ":" +
      config.jdbc.port +
      "/" +
      config.jdbc.database;
    var proxyPart = config.proxyUrl
      ? "|proxy:" + config.proxyUrl
      : "";
    return sshPart + mysqlPart + proxyPart;
  }

  return (
    "mysql://" +
    encodeURIComponent(config.jdbc.user) +
    ":***@" +
    config.jdbc.host +
    ":" +
    config.jdbc.port +
    "/" +
    config.jdbc.database
  );
}

/**
 * Parse a composite connection string into Script Properties.
 * Formats:
 *   mysql://user:pass@host:3306/treasurer
 *   ssh://user:pass@ssh-host:22/mysql://dbuser:dbpass@127.0.0.1:3346/treasurer
 *   ssh://.../mysql://.../treasurer|proxy:https://proxy.example.com/query
 *
 * @param {string} connectionString
 * @returns {Object.<string, string>}
 */
function parseConnectionString(connectionString) {
  var trimmed = connectionString.trim();
  if (!trimmed) {
    throw new Error("Connection string is empty.");
  }

  var proxyUrl = "";
  var proxySplit = trimmed.split("|proxy:");
  if (proxySplit.length > 1) {
    proxyUrl = proxySplit[1].trim();
    trimmed = proxySplit[0].trim();
  }

  if (trimmed.indexOf("ssh://") === 0) {
    var slashIndex = trimmed.indexOf("/mysql://");
    if (slashIndex < 0) {
      throw new Error(
        'SSH connection string must include "/mysql://..." after SSH segment.'
      );
    }

    var sshSegment = trimmed.substring("ssh://".length, slashIndex);
    var mysqlSegment = trimmed.substring(slashIndex + "/mysql://".length);
    var sshAuthHost = parseAuthHostSegment(sshSegment, "SSH");
    var mysqlAuthHostDb = parseMysqlSegment(mysqlSegment);

    var props = {
      CONNECTION_MODE: "ssh",
      SSH_HOST: sshAuthHost.host,
      SSH_PORT: String(sshAuthHost.port),
      SSH_USER: sshAuthHost.user,
      SSH_PASSWORD: sshAuthHost.password,
      JDBC_HOST: mysqlAuthHostDb.host,
      JDBC_PORT: String(mysqlAuthHostDb.port),
      JDBC_DATABASE: mysqlAuthHostDb.database,
      JDBC_USER: mysqlAuthHostDb.user,
      JDBC_PASSWORD: mysqlAuthHostDb.password,
    };
    if (proxyUrl) {
      props.SSH_PROXY_URL = proxyUrl;
    }
    return props;
  }

  if (trimmed.indexOf("mysql://") === 0) {
    var directSegment = trimmed.substring("mysql://".length);
    var direct = parseMysqlSegment(directSegment);
    return {
      CONNECTION_MODE: "direct",
      JDBC_HOST: direct.host,
      JDBC_PORT: String(direct.port),
      JDBC_DATABASE: direct.database,
      JDBC_USER: direct.user,
      JDBC_PASSWORD: direct.password,
    };
  }

  throw new Error(
    'Unsupported connection string. Use "mysql://..." or "ssh://.../mysql://...".'
  );
}

/**
 * @param {string} segment user:pass@host:port
 * @param {string} label
 * @returns {{ user: string, password: string, host: string, port: number }}
 */
function parseAuthHostSegment(segment, label) {
  var atIndex = segment.lastIndexOf("@");
  if (atIndex < 0) {
    throw new Error(label + " segment must include user:pass@host:port");
  }

  var auth = segment.substring(0, atIndex);
  var hostPort = segment.substring(atIndex + 1);
  var colonIndex = auth.indexOf(":");
  if (colonIndex < 0) {
    throw new Error(label + " segment must include username and password.");
  }

  var hostParts = parseHostPort(hostPort, label === "SSH" ? 22 : 3306);
  return {
    user: decodeURIComponent(auth.substring(0, colonIndex)),
    password: decodeURIComponent(auth.substring(colonIndex + 1)),
    host: hostParts.host,
    port: hostParts.port,
  };
}

/**
 * @param {string} segment user:pass@host:port/database
 * @returns {{ user: string, password: string, host: string, port: number, database: string }}
 */
function parseMysqlSegment(segment) {
  var slashIndex = segment.indexOf("/");
  if (slashIndex < 0) {
    throw new Error("MySQL segment must end with /database");
  }

  var authHost = segment.substring(0, slashIndex);
  var database = segment.substring(slashIndex + 1);
  var parsed = parseAuthHostSegment(authHost, "MySQL");
  return {
    user: parsed.user,
    password: parsed.password,
    host: parsed.host,
    port: parsed.port,
    database: database,
  };
}

/**
 * @param {string} hostPort
 * @param {number} defaultPort
 * @returns {{ host: string, port: number }}
 */
function parseHostPort(hostPort, defaultPort) {
  var colonIndex = hostPort.lastIndexOf(":");
  if (colonIndex < 0) {
    return { host: hostPort, port: defaultPort };
  }
  return {
    host: hostPort.substring(0, colonIndex),
    port: Number(hostPort.substring(colonIndex + 1)) || defaultPort,
  };
}

/**
 * @param {string} sheetName
 * @returns {ExportTableConfig|null}
 */
function getExportTableBySheetName(sheetName) {
  for (var i = 0; i < EXPORT_TABLES.length; i++) {
    if (EXPORT_TABLES[i].sheetName === sheetName) {
      return EXPORT_TABLES[i];
    }
  }
  return null;
}
