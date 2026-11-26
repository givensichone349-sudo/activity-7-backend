const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false
});

function runSqlFile(fileName) {
  const sql = fs.readFileSync(path.join(__dirname, fileName), "utf8");
  return pool.query(sql);
}

async function initDatabase() {
  await runSqlFile("schema.sql");

  const count = await pool.query("SELECT COUNT(*)::int AS total FROM records");
  if (count.rows[0].total === 0) {
    await runSqlFile("seed.sql");
    console.log("Database was empty, so starting records were added.");
  } else {
    console.log("Database already has records.");
  }
}

module.exports = { pool, initDatabase };
