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
  const check = await pool.query("SELECT to_regclass('public.records') AS name");

  if (check.rows[0].name === null) {
    await runSqlFile("schema.sql");
    await runSqlFile("seed.sql");
    console.log("Database table created and seeded.");
  } else {
    console.log("Database table already exists.");
  }
}

module.exports = { pool, initDatabase };
