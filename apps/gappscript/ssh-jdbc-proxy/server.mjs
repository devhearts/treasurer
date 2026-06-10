import { createServer } from "node:http";
import mysql from "mysql2/promise";
import { Client } from "ssh2";

const PORT = Number(process.env.PORT || 8080);
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN || "";

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function assertSelectOnly(sql) {
  const normalized = sql.trim().replace(/\s+/g, " ").toUpperCase();
  if (!normalized.startsWith("SELECT ")) {
    throw new Error("Only SELECT statements are allowed");
  }
  if (/[;]/.test(sql.trim().replace(/;+\s*$/, ""))) {
    throw new Error("Multiple SQL statements are not allowed");
  }
}

function openSshStream(ssh, mysqlTarget) {
  return new Promise((resolve, reject) => {
    const client = new Client();

    client
      .on("ready", () => {
        client.forwardOut(
          "127.0.0.1",
          0,
          mysqlTarget.host,
          mysqlTarget.port,
          (error, stream) => {
            if (error) {
              client.end();
              reject(error);
              return;
            }
            resolve({ client, stream });
          }
        );
      })
      .on("error", reject)
      .connect({
        host: ssh.host,
        port: ssh.port,
        username: ssh.username,
        password: ssh.password,
        readyTimeout: 20000,
      });
  });
}

async function runQuery(body) {
  const { ssh, mysql: mysqlCfg, sql } = body;

  if (!ssh?.host || !ssh?.username || !ssh?.password) {
    throw new Error("ssh.host, ssh.username, and ssh.password are required");
  }
  if (!mysqlCfg?.user || !mysqlCfg?.password || !mysqlCfg?.database) {
    throw new Error("mysql.user, mysql.password, and mysql.database are required");
  }
  if (!sql) {
    throw new Error("sql is required");
  }

  assertSelectOnly(sql);

  const mysqlTarget = {
    host: mysqlCfg.host || "127.0.0.1",
    port: Number(mysqlCfg.port || 3306),
  };

  const { client, stream } = await openSshStream(
    {
      host: ssh.host,
      port: Number(ssh.port || 22),
      username: ssh.username,
      password: ssh.password,
    },
    mysqlTarget
  );

  try {
    const connection = await mysql.createConnection({
      user: mysqlCfg.user,
      password: mysqlCfg.password,
      database: mysqlCfg.database,
      stream,
    });

    try {
      const [rows] = await connection.query(sql);
      return rows.map((row) =>
        Object.values(row).map((value) =>
          value === null || value === undefined ? "" : String(value)
        )
      );
    } finally {
      await connection.end();
    }
  } finally {
    client.end();
  }
}

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/query") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (PROXY_AUTH_TOKEN) {
    const token = req.headers["x-proxy-token"];
    if (token !== PROXY_AUTH_TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  try {
    const body = await readJson(req);
    const rows = await runQuery(body);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ rows }));
  } catch (error) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Query failed",
      })
    );
  }
}).listen(PORT, () => {
  console.log(`ssh-jdbc-proxy listening on :${PORT}`);
});
